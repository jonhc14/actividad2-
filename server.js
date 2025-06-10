const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
const server = http.createServer(app);

// Configuración de Socket.io con CORS
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Configuración de Multer para subida de archivos
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // Límite de 10MB
  }
});

// Middleware
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

// Almacenamiento en memoria
const rooms = new Map(); // roomId -> { users: Map(), messages: [] }
const users = new Map(); // socketId -> userData

// Endpoint para subir archivos
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ningún archivo' });
  }
  res.json({ 
    url: `/uploads/${req.file.filename}`,
    originalName: req.file.originalname
  });
});

// Manejo de conexiones Socket.io
io.on('connection', (socket) => {
  console.log(`Usuario conectado: ${socket.id}`);

  // Unirse a una sala
  socket.on('join_room', (roomId) => {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        users: new Map(),
        messages: [],
        createdAt: new Date()
      });
    }

    const room = rooms.get(roomId);
    socket.join(roomId);

    // Enviar historial al nuevo usuario
    socket.emit('room_history', room.messages);
    
    // Notificar a los demás usuarios
    socket.to(roomId).emit('user_connected', {
      userId: socket.id,
      username: users.get(socket.id)?.name || 'Nuevo usuario'
    });
  });

  // Establecer nombre de usuario
  socket.on('set_username', ({ username, roomId }) => {
    users.set(socket.id, { 
      id: socket.id, 
      name: username,
      roomId,
      status: 'online',
      lastActive: new Date()
    });

    if (roomId && rooms.has(roomId)) {
      const room = rooms.get(roomId);
      room.users.set(socket.id, users.get(socket.id));
      io.to(roomId).emit('users_updated', Array.from(room.users.values()));
    }
  });

  // Manejo de mensajes
  socket.on('send_message', (data) => {
    const user = users.get(socket.id);
    if (!user) return;

    const roomId = user.roomId;
    if (!roomId || !rooms.has(roomId)) return;

    const room = rooms.get(roomId);
    const message = {
      ...data,
      from: socket.id,
      fromName: user.name,
      timestamp: Date.now(),
      id: Date.now().toString(),
      read: false
    };

    // Guardar mensaje en el historial de la sala
    room.messages.push(message);
    if (room.messages.length > 100) {
      room.messages.shift(); // Mantener solo los 100 mensajes más recientes
    }

    // Enviar mensaje
    if (data.to === 'all') {
      io.to(roomId).emit('new_message', message);
    } else {
      socket.to(data.to).emit('new_message', message);
      socket.emit('new_message', message); // Confirmación al remitente
    }
  });

  // Notificación de escritura
  socket.on('typing', (userId) => {
    const user = users.get(socket.id);
    if (user && user.roomId) {
      socket.to(user.roomId).emit('user_typing', {
        userId: socket.id,
        username: user.name
      });
    }
  });

  // Editar mensaje
  socket.on('edit_message', ({ id, newContent, to }) => {
    const user = users.get(socket.id);
    if (!user || !user.roomId) return;

    const room = rooms.get(user.roomId);
    if (!room) return;

    const messageIndex = room.messages.findIndex(msg => msg.id === id);
    if (messageIndex !== -1 && room.messages[messageIndex].from === socket.id) {
      room.messages[messageIndex].message = newContent;
      room.messages[messageIndex].edited = true;

      if (to === 'all') {
        io.to(user.roomId).emit('message_edited', { 
          id, 
          newContent,
          edited: true
        });
      } else {
        socket.to(to).emit('message_edited', { 
          id, 
          newContent,
          edited: true
        });
        socket.emit('message_edited', { 
          id, 
          newContent,
          edited: true
        });
      }
    }
  });

  // Marcar mensaje como leído
  socket.on('mark_as_read', (messageId) => {
    const user = users.get(socket.id);
    if (!user || !user.roomId) return;

    const room = rooms.get(user.roomId);
    if (!room) return;

    const message = room.messages.find(msg => msg.id === messageId);
    if (message && message.to === socket.id) {
      message.read = true;
      socket.to(message.from).emit('message_read', { messageId });
    }
  });

  // Manejo de desconexión
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user && user.roomId && rooms.has(user.roomId)) {
      const room = rooms.get(user.roomId);
      room.users.delete(socket.id);
      
      io.to(user.roomId).emit('user_disconnected', {
        userId: socket.id,
        username: user.name
      });
      
      // Actualizar lista de usuarios
      io.to(user.roomId).emit('users_updated', Array.from(room.users.values()));
    }
    
    users.delete(socket.id);
  });
});

// Ruta para servir el frontend (en producción)
app.use(express.static(path.join(__dirname, '../build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

// Iniciar servidor
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
  console.log(`Ruta de uploads: ${uploadDir}`);
});

// Manejo de errores
process.on('unhandledRejection', (err) => {
  console.error('Error no manejado:', err);
});