
import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import EmojiPicker from 'emoji-picker-react';
import { v4 as uuidv4 } from 'uuid';
import { FaPaperclip, FaSmile, FaMapMarkerAlt, FaMoon, FaSun, FaSearch, FaTrash, FaVideo, FaPhone, FaEllipsisV, FaCheck, FaCheckDouble, FaUserPlus, FaSignOutAlt, FaMicrophone, FaStop, FaRegImage } from 'react-icons/fa';
import { MdSend, MdNotifications, MdGroup, MdPerson, MdLocationOn, MdFileCopy } from 'react-icons/md';
import { BsThreeDotsVertical, BsArrowLeft } from 'react-icons/bs';
import { RiChatDeleteLine } from 'react-icons/ri';
import { BiBlock } from 'react-icons/bi';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';

import './App.css';

// Configuración de conexión con reintentos
const socket = io('http://192.168.1.6:3000', {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  transports: ['websocket']
});

// Componente principal
function appchat() {
  // Estados principales
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [grupos, setGrupos] = useState([]);
  const [contactos, setContactos] = useState({});
  const [nombreGrupo, setNombreGrupo] = useState('');
  const [grupoSeleccionado, setGrupoSeleccionado] = useState('');
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [numeroUsuario, setNumeroUsuario] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [nuevoNumero, setNuevoNumero] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [userStatus, setUserStatus] = useState('');
  const [inputText, setInputText] = useState(''); 
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('all'); 
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [files, setFiles] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [location, setLocation] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [messageSearch, setMessageSearch] = useState('');
  const [onlineStatus, setOnlineStatus] = useState('online');
  const [showUserProfile, setShowUserProfile] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedUsersForGroup, setSelectedUsersForGroup] = useState([]);
  const [groups, setGroups] = useState([]);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [showSidebar, setShowSidebar] = useState(true);
  const [messageReplies, setMessageReplies] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    sound: true,
    preview: true,
    vibrate: false
  });
  const [messageHistory, setMessageHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [showConnectionStatus, setShowConnectionStatus] = useState(false);
  const [userPresence, setUserPresence] = useState({});
  const [messageEditId, setMessageEditId] = useState(null);
  const [editedMessage, setEditedMessage] = useState('');
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardMessage, setForwardMessage] = useState(null);
  const [forwardTo, setForwardTo] = useState([]);
  const [showMobileUserList, setShowMobileUserList] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [audioChunks, setAudioChunks] = useState([]);
  const [privateChats, setPrivateChats] = useState({});
  const [activePrivateChat, setActivePrivateChat] = useState(null);
  const [newContactName, setNewContactName] = useState('');
  const [newContactNumber, setNewContactNumber] = useState('');
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [showContactsList, setShowContactsList] = useState(false);

  // Referencias
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const audioElementRef = useRef(null);
  const messageInputRef = useRef(null);
  const recorderRef = useRef(null);
  const notificationSoundRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  // Configuración de audio
  useEffect(() => {
    let stream;
    
    const setupAudio = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("Acceso al micrófono concedido");
      } catch (error) {
        console.error('Error al acceder al micrófono:', error);
      }
    };

    if (typeof window !== 'undefined' && navigator.mediaDevices) {
      setupAudio();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Efectos de conexión
  useEffect(() => {
    const handleConnect = () => {
      setConnectionStatus('connected');
      setShowConnectionStatus(true);
      setTimeout(() => setShowConnectionStatus(false), 3000);
      if (isLoggedIn) {
        socket.emit('reconnect_user', username);
      }
    };

    const handleDisconnect = () => {
      setConnectionStatus('disconnected');
      setShowConnectionStatus(true);
    };

    const handleReconnecting = (attempt) => {
      setConnectionStatus(`reconnecting (${attempt})`);
      setShowConnectionStatus(true);
    };

    const handleReconnectFailed = () => {
      setConnectionStatus('failed');
      setShowConnectionStatus(true);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('reconnecting', handleReconnecting);
    socket.on('reconnect_failed', handleReconnectFailed);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('reconnecting', handleReconnecting);
      socket.off('reconnect_failed', handleReconnectFailed);
    };
  }, [isLoggedIn, username]);

  // Efectos de mensajes y usuarios
  useEffect(() => {
    const handleNewMessage = (data) => {
      // Manejar mensajes privados
      if (data.isPrivate) {
        setPrivateChats(prev => {
          const chatId = data.from === socket.id ? data.to : data.from;
          const existingChat = prev[chatId] || [];
          return {
            ...prev,
            [chatId]: [...existingChat, data]
          };
        });
      } else {
        setMessages((prev) => [...prev, data]);
      }
      
      if (notificationSettings.sound && data.from !== socket.id) {
        notificationSoundRef.current.play().catch(e => console.error('Error playing sound:', e));
      }
      
      // Actualizar contador de mensajes no leídos
      if (data.from !== socket.id && (selectedUser !== data.from || selectedUser !== 'all')) {
        setUnreadCounts(prev => ({
          ...prev,
          [data.from]: (prev[data.from] || 0) + 1
        }));
      }
    };

    const handleUsersUpdate = (usersList) => {
      const safeUsers = (usersList || []).map(user => ({
        id: user?.id || uuidv4(),
        name: user?.name || `Usuario ${Math.random().toString(36).substr(2, 5)}`,
        status: user?.status || 'offline',
        lastSeen: user?.lastSeen || null,
        avatar: user?.avatar || null
      }));
      setUsers(safeUsers);
    };

    const handleNotification = (notification) => {
      setNotifications((prev) => [...prev, { ...notification, id: uuidv4() }]);
      setTimeout(() => {
        setNotifications((prev) => prev.filter(n => n.id !== notification.id));
      }, 5000);
    };

    const handleTyping = ({ userId, isTyping }) => {
      const user = users.find(u => u.id === userId);
      if (user) {
        if (isTyping) {
          setTypingUsers((prev) => [...new Set([...prev, user.name])]);
          setTimeout(() => {
            setTypingUsers((prev) => prev.filter(name => name !== user.name));
          }, 3000);
        } else {
          setTypingUsers((prev) => prev.filter(name => name !== user.name));
        }
      }
    };

    const handleStatusChange = ({ userId, status, lastSeen }) => {
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, status, lastSeen } : user
      ));
      setUserPresence(prev => ({
        ...prev,
        [userId]: { status, lastSeen }
      }));
    };

    const handleMessageRead = ({ messageId, readerId }) => {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, readBy: [...(msg.readBy || []), readerId] } : msg
      ));
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    };

    const handleMessageEdited = ({ messageId, newContent }) => {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, message: newContent, edited: true } : msg
      ));
    };

    const handleGroupCreated = (group) => {
      setGroups(prev => [...prev, group]);
      setNotifications(prev => [...prev, {
        id: uuidv4(),
        from: 'Sistema',
        message: `Se ha creado el grupo "${group.name}"`
      }]);
    };

    const handlePinnedMessage = ({ messageId, pinned }) => {
      if (pinned) {
        const message = messages.find(m => m.id === messageId);
        if (message) {
          setPinnedMessages(prev => [...prev, message]);
        }
      } else {
        setPinnedMessages(prev => prev.filter(m => m.id !== messageId));
      }
    };

    const handlePrivateMessage = (data) => {
      setPrivateChats(prev => {
        const chatId = data.from === socket.id ? data.to : data.from;
        const existingChat = prev[chatId] || [];
        return {
          ...prev,
          [chatId]: [...existingChat, data]
        };
      });
      
      if (data.from !== socket.id) {
        setUnreadCounts(prev => ({
          ...prev,
          [data.from]: (prev[data.from] || 0) + 1
        }));
      }
    };

    const handleContactsUpdate = (contactsList) => {
      setContacts(contactsList);
    };

    socket.on('new_message', handleNewMessage);
    socket.on('users_updated', handleUsersUpdate);
    socket.on('notification', handleNotification);
    socket.on('user_typing', handleTyping);
    socket.on('user_status_change', handleStatusChange);
    socket.on('message_read', handleMessageRead);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('message_edited', handleMessageEdited);
    socket.on('group_created', handleGroupCreated);
    socket.on('message_pinned', handlePinnedMessage);
    socket.on('private_message', handlePrivateMessage);
    socket.on('contacts_update', handleContactsUpdate);

    // Cargar mensajes anteriores al conectar
    if (isLoggedIn) {
      socket.emit('get_previous_messages', { limit: 50 }, (previousMessages) => {
        setMessages(previousMessages);
      });
      
      socket.emit('get_groups', (userGroups) => {
        setGroups(userGroups);
      });
      
      socket.emit('get_pinned_messages', (pinnedMsgs) => {
        setPinnedMessages(pinnedMsgs);
      });
      
      socket.emit('get_private_chats', (privateChatsData) => {
        setPrivateChats(privateChatsData);
      });
      
      socket.emit('get_contacts', (contactsList) => {
        setContacts(contactsList);
      });
    }

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('users_updated', handleUsersUpdate);
      socket.off('notification', handleNotification);
      socket.off('user_typing', handleTyping);
      socket.off('user_status_change', handleStatusChange);
      socket.off('message_read', handleMessageRead);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('message_edited', handleMessageEdited);
      socket.off('group_created', handleGroupCreated);
      socket.off('message_pinned', handlePinnedMessage);
      socket.off('private_message', handlePrivateMessage);
      socket.off('contacts_update', handleContactsUpdate);
    };
  }, [isLoggedIn, users, notificationSettings.sound, messages]);

  // Auto-scroll y manejo de mensajes no leídos
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    // Marcar mensajes como leídos cuando se selecciona un chat
    if (selectedUser && isLoggedIn) {
      const unreadMessages = messages.filter(
        msg => msg.from !== socket.id && 
               (msg.to === socket.id || msg.to === 'all') &&
               (!msg.readBy || !msg.readBy.includes(socket.id))
      );
      
      if (unreadMessages.length > 0) {
        socket.emit('mark_as_read', {
          messageIds: unreadMessages.map(m => m.id),
          readerId: socket.id
        });
        
        // Actualizar contadores
        setUnreadCounts(prev => {
          const newCounts = { ...prev };
          unreadMessages.forEach(msg => {
            if (newCounts[msg.from]) {
              newCounts[msg.from]--;
              if (newCounts[msg.from] <= 0) {
                delete newCounts[msg.from];
              }
            }
          });
          return newCounts;
        });
      }
    }
  }, [messages, selectedUser, isLoggedIn]);

  // Manejo de estado en línea
  useEffect(() => {
    if (isLoggedIn) {
      socket.emit('set_status', onlineStatus);
    }
  }, [onlineStatus, isLoggedIn]);

  // Manejo del historial de mensajes
  useEffect(() => {
    if (messageHistory.length > 0 && historyIndex >= 0) {
      setMessage(messageHistory[historyIndex]);
    }
  }, [historyIndex, messageHistory]);

  // Funciones de ayuda
  const getSafeUserName = useCallback((user) => {
    if (!user) return 'Usuario desconocido';
    if (user.name) return user.name;
    if (user.id) return `Usuario ${user.id.slice(0, 5)}`;
    return 'Usuario';
  }, []);

  const getSafeUserAvatar = useCallback((user) => {
    if (user?.avatar) return <img src={user.avatar} alt="Avatar" className="user-avatar-img" />;
    const name = getSafeUserName(user);
    return <div className="user-avatar-initial">{name.charAt(0).toUpperCase()}</div>;
  }, [getSafeUserName]);

  const formatMessageTime = (timestamp) => {
    return format(new Date(timestamp), 'HH:mm');
  };

  const formatMessageDate = (timestamp) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return 'Hoy';
    } else if (isYesterday(date)) {
      return 'Ayer';
    } else {
      return format(date, 'dd/MM/yyyy');
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'online': return 'En línea';
      case 'away': return 'Ausente';
      case 'busy': return 'Ocupado';
      case 'offline': return 'Desconectado';
      default: return '';
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  const changeStatus = (newStatus) => {
    setUserStatus(newStatus);
  };

  const onEmojiClick = (emojiObject) => {
    setInputText(prev => prev + emojiObject.emoji);
  };

  // Funciones principales
  const handleLogin = () => {
    if (username.trim()) {
      setIsLoggedIn(true);
      socket.emit('set_username', username);
      socket.emit('set_status', 'online');
      // Guardar en localStorage para reconexión automática
      localStorage.setItem('agConnectUser', JSON.stringify({
        username,
        status: 'online'
      }));
    }
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      const messageData = {
        sender: username,
        content: message,
        timestamp: new Date().toISOString(),
        recipient: 'all'
      };
      socket.emit('send_message', messageData);
      setMessage('');
    }
  };

  const handleLogout = () => {
    socket.emit('logout');
    setIsLoggedIn(false);
    setUsername('');
    setMessages([]);
    localStorage.removeItem('agConnectUser');
  };

  const sendMessage = () => {
    if (message.trim() || files.length > 0 || location) {
      const messageId = uuidv4();
      const timestamp = new Date().toISOString();
      
      if (files.length > 0) {
        uploadFiles(messageId, timestamp);
      } else if (location) {
        sendLocation(messageId, timestamp);
      } else if (replyingTo) {
        sendReply(messageId, timestamp);
      } else {
        const isPrivate = selectedUser !== 'all' && !selectedUser.startsWith('group-');
        
        const newMsg = {
          id: messageId,
          message,
          to: selectedUser,
          from: socket.id,
          fromName: username,
          type: 'text',
          timestamp,
          status: 'sent',
          isPrivate
        };
        
        if (isPrivate) {
          socket.emit('send_private_message', newMsg);
          setPrivateChats(prev => {
            const existingChat = prev[selectedUser] || [];
            return {
              ...prev,
              [selectedUser]: [...existingChat, newMsg]
            };
          });
        } else {
          socket.emit('send_message', newMsg);
          setMessages(prev => [...prev, newMsg]);
        }
        
        setMessage('');
        setMessageHistory(prev => [message, ...prev]);
        setHistoryIndex(-1);
      }
    }
  };

  const sendPrivateMessage = (userId, messageText) => {
    if (!messageText.trim()) return;
    
    const messageId = uuidv4();
    const timestamp = new Date().toISOString();
    
    const newMsg = {
      id: messageId,
      message: messageText,
      to: userId,
      from: socket.id,
      fromName: username,
      type: 'text',
      timestamp,
      status: 'sent',
      isPrivate: true
    };
    
    socket.emit('send_private_message', newMsg);
    
    setPrivateChats(prev => {
      const existingChat = prev[userId] || [];
      return {
        ...prev,
        [userId]: [...existingChat, newMsg]
      };
    });
    
    setActivePrivateChat(userId);
  };

  const startPrivateChat = (userId) => {
    setActivePrivateChat(userId);
    setSelectedUser(userId);
  };

  const addContact = () => {
    if (newContactName.trim() && newContactNumber.trim()) {
      socket.emit('add_contact', {
        name: newContactName,
        number: newContactNumber
      }, (response) => {
        if (response.success) {
          setContacts(prev => [...prev, response.contact]);
          setNewContactName('');
          setNewContactNumber('');
          setShowAddContactModal(false);
          setNotifications([...notifications, {
            id: uuidv4(),
            from: 'Sistema',
            message: `Contacto ${response.contact.name} agregado`
          }]);
        }
      });
    }
  };

  const uploadFiles = async (messageId, timestamp) => {
    const uploadPromises = files.map(file => {
      const formData = new FormData();
      formData.append('file', file);
      
      return fetch('http://192.168.137.1:3001/upload', {
        method: 'POST',
        body: formData,
      })
      .then(response => response.json())
      .then(data => ({
        url: data.url,
        type: file.type.startsWith('image/') ? 'image' : 'file',
        name: file.name,
        size: file.size
      }))
      .catch(error => {
        console.error('Error uploading file:', error);
        return null;
      });
    });
    
    try {
      const uploadResults = await Promise.all(uploadPromises);
      const successfulUploads = uploadResults.filter(result => result !== null);
      
      if (successfulUploads.length > 0) {
        const isPrivate = selectedUser !== 'all' && !selectedUser.startsWith('group-');
        
        successfulUploads.forEach((fileData, index) => {
          const fileMsg = {
            id: `${messageId}-${index}`,
            message: fileData.url,
            to: selectedUser,
            from: socket.id,
            fromName: username,
            type: fileData.type,
            fileName: fileData.name,
            fileSize: fileData.size,
            timestamp,
            status: 'sent',
            isPrivate
          };
          
          if (isPrivate) {
            socket.emit('send_private_message', fileMsg);
            setPrivateChats(prev => {
              const existingChat = prev[selectedUser] || [];
              return {
                ...prev,
                [selectedUser]: [...existingChat, fileMsg]
              };
            });
          } else {
            socket.emit('send_message', fileMsg);
            setMessages(prev => [...prev, fileMsg]);
          }
        });
        
        if (message.trim()) {
          const textMsg = {
            id: `${messageId}-text`,
            message,
            to: selectedUser,
            from: socket.id,
            fromName: username,
            type: 'text',
            timestamp,
            status: 'sent',
            isPrivate
          };
          
          if (isPrivate) {
            socket.emit('send_private_message', textMsg);
            setPrivateChats(prev => {
              const existingChat = prev[selectedUser] || [];
              return {
                ...prev,
                [selectedUser]: [...existingChat, textMsg]
              };
            });
          } else {
            socket.emit('send_message', textMsg);
            setMessages(prev => [...prev, textMsg]);
          }
        }
        
        setFiles([]);
        setMessage('');
        setMessageHistory(prev => [message, ...prev]);
        setHistoryIndex(-1);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      setNotifications([...notifications, {
        id: uuidv4(),
        from: 'Sistema',
        message: 'Error al subir los archivos'
      }]);
    }
  };

  const sendLocation = (messageId, timestamp) => {
    const isPrivate = selectedUser !== 'all' && !selectedUser.startsWith('group-');
    
    const locationMsg = {
      id: messageId,
      message: JSON.stringify(location),
      to: selectedUser,
      from: socket.id,
      fromName: username,
      type: 'location',
      timestamp,
      status: 'sent',
      isPrivate
    };
    
    if (isPrivate) {
      socket.emit('send_private_message', locationMsg);
      setPrivateChats(prev => {
        const existingChat = prev[selectedUser] || [];
        return {
          ...prev,
          [selectedUser]: [...existingChat, locationMsg]
        };
      });
    } else {
      socket.emit('send_message', locationMsg);
      setMessages(prev => [...prev, locationMsg]);
    }
    
    setLocation(null);
    setShowLocationModal(false);
    setMessage('');
  };

  const sendReply = (messageId, timestamp) => {
    const isPrivate = selectedUser !== 'all' && !selectedUser.startsWith('group-');
    
    const replyMsg = {
      id: messageId,
      message,
      to: selectedUser,
      from: socket.id,
      fromName: username,
      type: 'text',
      timestamp,
      status: 'sent',
      replyTo: replyingTo.id,
      isPrivate
    };
    
    if (isPrivate) {
      socket.emit('send_private_message', replyMsg);
      setPrivateChats(prev => {
        const existingChat = prev[selectedUser] || [];
        return {
          ...prev,
          [selectedUser]: [...existingChat, replyMsg]
        };
      });
    } else {
      socket.emit('send_message', replyMsg);
      setMessages(prev => [...prev, replyMsg]);
    }
    
    setMessage('');
    setReplyingTo(null);
    setMessageHistory(prev => [message, ...prev]);
    setHistoryIndex(-1);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      
      recorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };
      
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(blob);
        
        // Convertir a archivo para subir
        const audioFile = new File([blob], 'audio-message.webm', { type: 'audio/webm' });
        
        // Subir el audio
        const formData = new FormData();
        formData.append('file', audioFile);
        
        try {
          const response = await fetch('http://192.168.137.1:3001/upload', {
            method: 'POST',
            body: formData,
          });
          
          const data = await response.json();
          
          const isPrivate = selectedUser !== 'all' && !selectedUser.startsWith('group-');
          
          const audioMsg = {
            id: uuidv4(),
            message: data.url,
            to: selectedUser,
            from: socket.id,
            fromName: username,
            type: 'audio',
            timestamp: new Date().toISOString(),
            status: 'sent',
            isPrivate
          };
          
          if (isPrivate) {
            socket.emit('send_private_message', audioMsg);
            setPrivateChats(prev => {
              const existingChat = prev[selectedUser] || [];
              return {
                ...prev,
                [selectedUser]: [...existingChat, audioMsg]
              };
            });
          } else {
            socket.emit('send_message', audioMsg);
            setMessages(prev => [...prev, audioMsg]);
          }
        } catch (error) {
          console.error('Error uploading audio:', error);
          setNotifications([...notifications, {
            id: uuidv4(),
            from: 'Sistema',
            message: 'Error al subir el audio'
          }]);
        }
      };
      
      recorder.start();
      setRecording(true);
      setMediaRecorder(recorder);
      setAudioChunks(chunks);
    } catch (error) {
      console.error('Error al acceder al micrófono:', error);
      setNotifications([...notifications, {
        id: uuidv4(),
        from: 'Sistema',
        message: 'No se pudo acceder al micrófono'
      }]);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    const validFiles = newFiles.filter(file => {
      if (file.size > 10 * 1024 * 1024) { // 10MB límite
        setNotifications([...notifications, {
          id: uuidv4(),
          from: 'Sistema',
          message: `El archivo ${file.name} es demasiado grande (máximo 10MB)`
        }]);
        return false;
      }
      return true;
    });
    
    setFiles(prev => [...prev, ...validFiles]);
    setMessage(prev => prev + (prev ? '\n' : '') + validFiles.map(f => `Archivo: ${f.name}`).join('\n'));
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else if (e.key === 'ArrowUp' && message === '' && messageHistory.length > 0) {
      e.preventDefault();
      const newIndex = historyIndex < messageHistory.length - 1 ? historyIndex + 1 : messageHistory.length - 1;
      setHistoryIndex(newIndex);
    } else if (e.key === 'ArrowDown' && message === '' && historyIndex > -1) {
      e.preventDefault();
      const newIndex = historyIndex > 0 ? historyIndex - 1 : -1;
      setHistoryIndex(newIndex);
    } else if (selectedUser !== 'all') {
      socket.emit('typing', { userId: selectedUser, isTyping: true });
    }
  };

  const shareLocation = () => {
    if (navigator.geolocation) {
      setShowLocationModal(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          setNotifications([...notifications, {
            id: uuidv4(),
            from: 'Sistema',
            message: 'No se pudo obtener la ubicación'
          }]);
          setShowLocationModal(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setNotifications([...notifications, {
        id: uuidv4(),
        from: 'Sistema',
        message: 'Geolocalización no soportada por tu navegador'
      }]);
    }
  };

  const createGroup = () => {
    if (newGroupName.trim() && selectedUsersForGroup.length > 0) {
      const groupId = uuidv4();
      socket.emit('create_group', {
        id: groupId,
        nombre: nombreGrupo,
        miembros: [usuario],
        members: [...selectedUsersForGroup, socket.id],
        createdBy: socket.id,
        createdAt: new Date().toISOString()
      });
      
      setNewGroupName('');
      setSelectedUsersForGroup([]);
      setShowGroupModal(false);
    }
  };

  const toggleUserSelectionForGroup = (userId) => {
    setSelectedUsersForGroup(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const deleteMessage = (messageId) => {
    socket.emit('delete_message', { messageId });
  };

  const editMessage = (message) => {
    setMessageEditId(message.id);
    setEditedMessage(message.message);
    messageInputRef.current.focus();
  };

  const saveEditedMessage = () => {
    if (editedMessage.trim() && messageEditId) {
      socket.emit('edit_message', {
        messageId: messageEditId,
        newContent: editedMessage
      });
      setMessageEditId(null);
      setEditedMessage('');
    }
  };

  const pinMessage = (messageId) => {
    socket.emit('pin_message', { messageId, pin: true });
  };

  const unpinMessage = (messageId) => {
    socket.emit('pin_message', { messageId, pin: false });
  };

  const forwardMessageToUsers = () => {
    if (forwardMessage && forwardTo.length > 0) {
      forwardTo.forEach(userId => {
        socket.emit('forward_message', {
          originalMessage: forwardMessage,
          to: userId
        });
      });
      setForwardMessage(null);
      setForwardTo([]);
      setShowForwardModal(false);
    }
  };

  const toggleForwardUser = (userId) => {
    setForwardTo(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const agregarContactoAGrupo = (numeroTelefono, nombreGrupo) => {
    if (!nuevoNumero || !nuevoNombre) return alert('Faltan datos');
    if (contactos[nuevoNumero]) return alert('Este número ya existe');
    
    setContactos(prev => ({
      ...prev,
      [nuevoNumero]: { nombre: nuevoNombre, numero: nuevoNumero }
    }));
    setNuevoNombre('');
    setNuevoNumero('');
  };

  const enviarMensaje = () => {
    if (!grupoSeleccionado || !nombreUsuario || !numeroUsuario || !mensaje) {
      return alert('Faltan datos para enviar');
    }
    
    const nuevoMensaje = {
      autor: nombreUsuario,
      texto: mensaje,
      fecha: new Date().toLocaleTimeString()
    };
    
    setGrupos(prev => ({
      ...prev,
      [grupoSeleccionado]: {
        ...prev[grupoSeleccionado],
        mensajes: [...(prev[grupoSeleccionado]?.mensajes || []), nuevoMensaje]
      }
    }));
    setMensaje('');
  };

  const crearGrupo = (nombreGrupo) => {
    const nuevoGrupo = {
      id: Date.now(),
      nombre: nombreGrupo,
      miembros: [usuarioActual],
    };
    setGrupos(prev => [...prev, nuevoGrupo]);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Filtros y datos derivados
  const filteredMessages = messages.filter(
    (msg) =>
      msg.to === 'all' ||
      msg.from === socket.id ||
      msg.to === socket.id ||
      (msg.to === selectedUser && (msg.from === socket.id || msg.to === socket.id)) ||
      (groups.some(g => g.id === msg.to) && groups.find(g => g.id === msg.to)?.members.includes(socket.id))
  ).filter(msg => 
    messageSearch === '' || 
    msg.message.toLowerCase().includes(messageSearch.toLowerCase()) ||
    (msg.fileName && msg.fileName.toLowerCase().includes(messageSearch.toLowerCase()))
  );

  const currentChatUsers = selectedUser === 'all' 
    ? users 
    : selectedUser.startsWith('group-')
      ? groups.find(g => g.id === selectedUser)?.members || []
      : [users.find(u => u.id === selectedUser)];

  const isGroupChat = selectedUser.startsWith('group-');
  const currentGroup = isGroupChat ? groups.find(g => g.id === selectedUser) : null;
  const currentPrivateChat = activePrivateChat ? privateChats[activePrivateChat] || [] : [];

  // Componentes renderizados
  const renderMessageContent = (msg) => {
    switch (msg.type) {
      case 'image':
        return (
          <div className="media-container">
            <img src={msg.message} alt="Imagen enviada" className="message-image" />
            <div className="media-actions">
              <a href={msg.message} target="_blank" rel="noopener noreferrer" className="media-download">
                <FaRegImage /> Ver imagen
              </a>
              <button onClick={() => {
                navigator.clipboard.writeText(msg.message);
                setNotifications([...notifications, {
                  id: uuidv4(),
                  from: 'Sistema',
                  message: 'Enlace copiado al portapapeles'
                }]);
              }}>
                <MdFileCopy /> Copiar enlace
              </button>
            </div>
          </div>
        );
      case 'file':
        return (
          <div className="media-container">
            <div className="file-icon">📄</div>
            <div className="file-info">
              <div className="file-name">{msg.fileName}</div>
              <div className="file-size">{formatFileSize(msg.fileSize)}</div>
            </div>
            <div className="media-actions">
              <a href={msg.message} download className="file-message">
                <MdFileCopy /> Descargar
              </a>
            </div>
          </div>
        );
      case 'audio':
        return (
          <div className="media-container">
            <audio 
              controls 
              src={msg.message} 
              ref={audioElementRef}
              className="audio-message"
            />
            <div className="media-actions">
              <a href={msg.message} download className="file-message">
                <MdFileCopy /> Descargar
              </a>
            </div>
          </div>
        );
      case 'location':
        try {
          const loc = JSON.parse(msg.message);
          return (
            <div className="media-container">
              <div className="location-preview">
                <iframe
                  title="Ubicación"
                  width="100%"
                  height="200"
                  frameBorder="0"
                  scrolling="no"
                  marginHeight="0"
                  marginWidth="0"
                  src={`https://maps.google.com/maps?q=${loc.lat},${loc.lng}&z=15&output=embed`}
                ></iframe>
                <div className="location-info">
                  <div>Latitud: {loc.lat.toFixed(6)}</div>
                  <div>Longitud: {loc.lng.toFixed(6)}</div>
                  <div>Precisión: ~{Math.round(loc.accuracy)} metros</div>
                  <div>Hora: {format(new Date(loc.timestamp), 'HH:mm dd/MM/yyyy')}</div>
                </div>
              </div>
            </div>
          );
        } catch (e) {
          return "Ubicación compartida";
        }
      default:
        return <div className="text-message">{msg.message}</div>;
    }
  };

  const renderMessageItem = (msg, index, isPrivate = false) => {
    const isCurrentUser = msg.from === socket.id;
    const isGroup = msg.to.startsWith('group-');
    const showDateHeader = index === 0 || 
      formatMessageDate(msg.timestamp) !== formatMessageDate(
        isPrivate 
          ? currentPrivateChat[index - 1]?.timestamp 
          : messages[index - 1]?.timestamp
      );
    
    const showReply = msg.replyTo && messageReplies[msg.replyTo];
    const repliedMessage = showReply ? messageReplies[msg.replyTo] : null;
    
    return (
      <React.Fragment key={msg.id}>
        {showDateHeader && (
          <div className="message-date-header">
            {formatMessageDate(msg.timestamp)}
          </div>
        )}
        
        <div
          className={`message ${isCurrentUser ? 'sent' : 'received'} ${msg.status}`}
          onDoubleClick={() => {
            if (!isCurrentUser) {
              socket.emit('react_to_message', {
                messageId: msg.id,
                reaction: 'like'
              });
            }
          }}
        >
          {!isCurrentUser && !isGroup && (
            <div className="message-avatar">
              {getSafeUserAvatar(users.find(u => u.id === msg.from))}
            </div>
          )}
          
          <div className="message-content-wrapper">
            {(!isCurrentUser || isGroup) && (
              <div className="message-from">
                {isGroup ? getSafeUserName(users.find(u => u.id === msg.from)) : ''}
              </div>
            )}
            
            {showReply && repliedMessage && (
              <div className="message-reply-preview">
                <div className="reply-from">
                  {repliedMessage.from === socket.id ? 'Tú' : getSafeUserName(users.find(u => u.id === repliedMessage.from))}
                </div>
                <div className="reply-content">
                  {repliedMessage.type === 'text' 
                    ? repliedMessage.message.length > 30 
                      ? repliedMessage.message.substring(0, 30) + '...' 
                      : repliedMessage.message
                    : `[${repliedMessage.type === 'image' ? 'Imagen' : repliedMessage.type === 'file' ? 'Archivo' : 'Ubicación'}]`}
                </div>
              </div>
            )}
            
            <div className="message-content">
              {renderMessageContent(msg)}
            </div>
            
            <div className="message-info">
              <span className="message-time">
                {formatMessageTime(msg.timestamp)}
                {msg.edited && <span className="edited-label"> (editado)</span>}
              </span>
              
              {isCurrentUser && (
                <span className="message-status">
                  {msg.readBy?.length > 0 ? <FaCheckDouble /> : <FaCheck />}
                </span>
              )}
            </div>
            
            <div className="message-actions">
              <button 
                className="action-button"
                onClick={() => setReplyingTo(msg)}
                title="Responder"
              >
                <RiChatDeleteLine />
              </button>
              
              <button 
                className="action-button"
                onClick={() => {
                  setForwardMessage(msg);
                  setShowForwardModal(true);
                }}
                title="Reenviar"
              >
                <MdSend />
              </button>
              
              {isCurrentUser && (
                <>
                  <button 
                    className="action-button"
                    onClick={() => editMessage(msg)}
                    title="Editar"
                  >
                    <BsThreeDotsVertical />
                  </button>
                  
                  <button 
                    className="action-button"
                    onClick={() => deleteMessage(msg.id)}
                    title="Eliminar"
                  >
                    <FaTrash />
                  </button>
                </>
              )}
              
              {pinnedMessages.some(m => m.id === msg.id) ? (
                <button 
                  className="action-button"
                  onClick={() => unpinMessage(msg.id)}
                  title="Desfijar"
                >
                  <MdLocationOn />
                </button>
              ) : (
                <button 
                  className="action-button"
                  onClick={() => pinMessage(msg.id)}
                  title="Fijar mensaje"
                >
                  <MdLocationOn />
                </button>
              )}
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  };

  if (!isLoggedIn) {
    return (
      <div className={`login-container ${darkMode ? 'dark' : ''}`}>
        <div className="login-box">
          <img src="/app.jpg" alt="Logo AG Connect" className="login-logo" />
          <h1>AG Connect</h1>
          <p className="login-subtitle">Conecta, colabora y comunica</p>
          
          <div className="login-form">
            <input
              type="text"
              placeholder="Ingresa tu nombre"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              className="login-input"
            />
            
            <div className="status-selector">
              <label>Estado inicial:</label>
              <select 
                value={onlineStatus} 
                onChange={(e) => setOnlineStatus(e.target.value)}
                className={`status-select ${onlineStatus}`}
              >
                <option value="online">En línea</option>
                <option value="away">Ausente</option>
                <option value="busy">Ocupado</option>
                <option value="offline">Desconectado</option>
              </select>
            </div>
            
            <button 
              onClick={handleLogin} 
              className="login-button"
              disabled={!username.trim()}
            >
              Conectarse
            </button>
            
            <div className="login-footer">
              <div className="theme-toggle">
                <button onClick={toggleDarkMode}>
                  {darkMode ? <FaSun /> : <FaMoon />}
                  <span>{darkMode ? ' Modo claro' : ' Modo oscuro'}</span>
                </button>
              </div>
              
              <div className="login-links">
                <a href="#privacy">Política de privacidad</a>
                <a href="#terms">Términos de servicio</a>
              </div>
            </div>
          </div>
        </div>
        
        <div className="login-features">
          <div className="feature">
            <MdGroup className="feature-icon" />
            <h3>Chat Grupal</h3>
            <p>Crea grupos con múltiples usuarios para conversaciones colaborativas.</p>
          </div>
          
          <div className="feature">
            <MdPerson className="feature-icon" />
            <h3>Chat Privado</h3>
            <p>Conversaciones uno a uno con total privacidad.</p>
          </div>
          
          <div className="feature">
            <FaMapMarkerAlt className="feature-icon" />
            <h3>Comparte Ubicación</h3>
            <p>Muestra tu ubicación en tiempo real cuando sea necesario.</p>
          </div>
          
          <div className="feature">
            <MdNotifications className="feature-icon" />
            <h3>Notificaciones</h3>
            <p>Recibe alertas importantes incluso cuando no estés activo.</p>
          </div>
        </div>
        
        <audio ref={notificationSoundRef} src="/notification.mp3" preload="auto" />
      </div>
    );
  }

  // Resto del código de renderizado cuando el usuario está logueado...
  return (
    <div className={`chat-app ${darkMode ? 'dark' : ''}`}>
      {/* Barra de conexión */}
      {showConnectionStatus && (
        <div className={`connection-status ${connectionStatus}`}>
          {connectionStatus === 'connected' ? 'Conectado' : 
           connectionStatus === 'disconnected' ? 'Desconectado' :
           connectionStatus.startsWith('reconnecting') ? 'Reconectando...' : 'Error de conexión'}
        </div>
      )}
      
      {/* Barra superior */}
      <div className="chat-header">
        <div className="header-left">
          <button 
            className="mobile-menu-button" 
            onClick={() => setShowMobileUserList(!showMobileUserList)}
          >
            <BsArrowLeft />
          </button>
          <div className="chat-title">AG Connect</div>
        </div>
        
        <div className="header-controls">
          <div className="user-status">
            <select 
              value={onlineStatus} 
              onChange={(e) => changeStatus(e.target.value)}
              className={`status-select ${onlineStatus}`}
            >
              <option value="online">En línea</option>
              <option value="away">Ausente</option>
              <option value="busy">Ocupado</option>
              <option value="offline">Desconectado</option>
            </select>
          </div>
          
          <button 
            onClick={toggleDarkMode} 
            className="theme-toggle"
            title={darkMode ? 'Modo claro' : 'Modo oscuro'}
          >
            {darkMode ? <FaSun /> : <FaMoon />}
          </button>
          
          <button 
            onClick={() => setShowSettings(!showSettings)} 
            className="settings-button"
            title="Configuración"
          >
            <BsThreeDotsVertical />
          </button>
        </div>
      </div>

      {/* Configuración flotante */}
      {showSettings && (
        <div className="settings-panel">
          <div className="settings-header">
            <h3>Configuración</h3>
            <button onClick={() => setShowSettings(false)}>×</button>
          </div>
          
          <div className="settings-section">
            <h4>Notificaciones</h4>
            <label>
              <input
                type="checkbox"
                checked={notificationSettings.sound}
                onChange={() => setNotificationSettings({
                  ...notificationSettings,
                  sound: !notificationSettings.sound
                })}
              />
              Sonido
            </label>
            
            <label>
              <input
                type="checkbox"
                checked={notificationSettings.preview}
                onChange={() => setNotificationSettings({
                  ...notificationSettings,
                  preview: !notificationSettings.preview
                })}
              />
              Mostrar vista previa
            </label>
            
            <label>
              <input
                type="checkbox"
                checked={notificationSettings.vibrate}
                onChange={() => setNotificationSettings({
                  ...notificationSettings,
                  vibrate: !notificationSettings.vibrate
                })}
              />
              Vibrar
            </label>
          </div>
          
          <div className="settings-section">
            <h4>Apariencia</h4>
            <button onClick={toggleDarkMode}>
              {darkMode ? <FaSun /> : <FaMoon />}
              {darkMode ? ' Cambiar a modo claro' : ' Cambiar a modo oscuro'}
            </button>
          </div>
          
          <div className="settings-section">
            <h4>Contactos</h4>
            <button 
              onClick={() => {
                setShowAddContactModal(true);
                setShowSettings(false);
              }}
              className="add-contact-button"
            >
              <FaUserPlus /> Añadir contacto
            </button>
          </div>
          
          <div className="settings-section">
            <h4>Cuenta</h4>
            <button 
              onClick={handleLogout} 
              className="logout-button"
            >
              <FaSignOutAlt /> Cerrar sesión
            </button>
          </div>
        </div>
      )}

      {/* Modal para añadir contacto */}
      {showAddContactModal && (
        <div className="add-contact-modal">
          <div className="modal-content">
            <h3>Añadir Nuevo Contacto</h3>
            <button 
              className="close-button" 
              onClick={() => setShowAddContactModal(false)}
            >
              ×
            </button>
            
            <div className="contact-form">
              <input
                type="text"
                placeholder="Nombre del contacto"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                className="contact-input"
              />
              
              <input
                type="text"
                placeholder="Número o identificador"
                value={newContactNumber}
                onChange={(e) => setNewContactNumber(e.target.value)}
                className="contact-input"
              />
              
              <div className="modal-buttons">
                <button 
                  onClick={addContact} 
                  disabled={!newContactName.trim() || !newContactNumber.trim()}
                  className="confirm-button"
                >
                  Añadir Contacto
                </button>
                <button 
                  onClick={() => setShowAddContactModal(false)} 
                  className="cancel-button"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="main-content">
        {/* Sidebar - Lista de usuarios/grupos */}
        <div className={`sidebar ${showSidebar ? 'visible' : ''} ${showMobileUserList ? 'mobile-visible' : ''}`}>
          <div className="current-user" onClick={() => setShowUserProfile(socket.id)}>
            <div className="user-avatar">
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="user-info">
              <div className="user-name">{username}</div>
              <div className={`user-status ${onlineStatus}`}>
                {getStatusText(onlineStatus)}
              </div>
            </div>
          </div>

          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Buscar mensajes o contactos..."
              value={messageSearch}
              onChange={(e) => setMessageSearch(e.target.value)}
            />
          </div>

          <div className="chat-tabs">
            <button 
              className={!showContactsList ? 'active' : ''}
              onClick={() => setShowContactsList(false)}
            >
              Conversaciones
            </button>
            <button 
              className={showContactsList ? 'active' : ''}
              onClick={() => setShowContactsList(true)}
            >
              Contactos
            </button>
          </div>

          {showContactsList ? (
            <div className="contacts-list">
              <h4>Mis Contactos</h4>
              {contacts.length === 0 ? (
                <div className="no-contacts">
                  <p>No tienes contactos guardados</p>
                  <button 
                    onClick={() => {
                      setShowAddContactModal(true);
                      setShowContactsList(false);
                    }}
                    className="add-contact-button"
                  >
                    <FaUserPlus /> Añadir contacto
                  </button>
                </div>
              ) : (
                <div className="contacts-container">
                  {contacts.map(contact => (
                    <div 
                      key={contact.id} 
                      className="contact-item"
                      onClick={() => {
                        const user = users.find(u => u.id === contact.userId);
                        if (user) {
                          startPrivateChat(user.id);
                          setShowMobileUserList(false);
                        }
                      }}
                    >
                      <div className="contact-avatar">
                        {contact.avatar ? (
                          <img src={contact.avatar} alt={contact.name} />
                        ) : (
                          contact.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="contact-info">
                        <div className="contact-name">{contact.name}</div>
                        <div className="contact-number">{contact.number}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="users-list">
              <div
                className={`user-item ${selectedUser === 'all' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedUser('all');
                  setActivePrivateChat(null);
                  setShowMobileUserList(false);
                }}
              >
                <div className="user-avatar">👥</div>
                <div className="user-info">
                  <span className="user-name">Chat General</span>
                  <span className="user-status online">Todos los usuarios</span>
                </div>
                <span className="user-count">{users.length + 1}</span>
              </div>
              
              {/* Grupos */}
              {groups.filter(g => g.members.includes(socket.id)).map((group) => (
                <div
                  key={group.id}
                  className={`user-item ${selectedUser === group.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedUser(group.id);
                    setActivePrivateChat(null);
                    setShowMobileUserList(false);
                  }}
                  onDoubleClick={() => setShowUserProfile(group.id)}
                >
                  <div className="user-avatar">
                    <MdGroup />
                  </div>
                  <div className="user-info">
                    <span className="user-name">{group.name}</span>
                    <span className="user-status online">
                      {group.members.length} miembros
                    </span>
                  </div>
                  {unreadCounts[group.id] > 0 && (
                    <span className="unread-count">{unreadCounts[group.id]}</span>
                  )}
                </div>
              ))}
              
              {/* Botón para crear nuevo grupo */}
              <div 
                className="new-group-button"
                onClick={() => setShowGroupModal(true)}
              >
                <div className="user-avatar">
                  <FaUserPlus />
                </div>
                <span className="user-name">Crear nuevo grupo</span>
              </div>
              
              {/* Chats privados */}
              {Object.keys(privateChats).map(chatId => {
                const user = users.find(u => u.id === chatId);
                if (!user) return null;
                
                const lastMessage = privateChats[chatId][privateChats[chatId].length - 1];
                const unread = privateChats[chatId].filter(
                  m => m.from !== socket.id && !m.readBy?.includes(socket.id)
                ).length;
                
                return (
                  <div
                    key={chatId}
                    className={`user-item ${activePrivateChat === chatId ? 'active' : ''}`}
                    onClick={() => {
                      setActivePrivateChat(chatId);
                      setSelectedUser(chatId);
                      setShowMobileUserList(false);
                    }}
                    onDoubleClick={() => setShowUserProfile(chatId)}
                  >
                    <div className="user-avatar">
                      {getSafeUserAvatar(user)}
                      <span className={`status-dot ${user.status || 'offline'}`}></span>
                    </div>
                    <div className="user-info">
                      <span className="user-name">{getSafeUserName(user)}</span>
                      <span className="last-message-preview">
                        {lastMessage.message.length > 30 
                          ? lastMessage.message.substring(0, 30) + '...' 
                          : lastMessage.message}
                      </span>
                    </div>
                    {unread > 0 && (
                      <span className="unread-count">{unread}</span>
                    )}
                  </div>
                );
              })}
              
              {/* Usuarios disponibles para chat privado */}
              {users.map((user) => (
                !Object.keys(privateChats).includes(user.id) && (
                <div
                  key={user.id}
                  className={`user-item ${activePrivateChat === user.id ? 'active' : ''}`}
                  onClick={() => {
                    startPrivateChat(user.id);
                    setShowMobileUserList(false);
                  }}
                  onDoubleClick={() => setShowUserProfile(user.id)}
                >
                  <div className="user-avatar">
                    {getSafeUserAvatar(user)}
                    <span className={`status-dot ${user.status || 'offline'}`}></span>
                  </div>
                  <div className="user-info">
                    <span className="user-name">{getSafeUserName(user)}</span>
                    <span className={`user-status ${user.status || 'offline'}`}>
                      {getStatusText(user.status)}
                      {user.status === 'offline' && user.lastSeen && (
                        <span className="last-seen">
                          Últ. vez {formatDistanceToNow(
                            new Date(user.lastSeen), 
                            { addSuffix: true, locale: es }
                          )}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Área de chat principal */}
        <div className="chat-main">
          {/* Encabezado del chat */}
          {activePrivateChat || selectedUser ? (
            <div className="chat-info">
              <div className="chat-info-left">
                <h3>
                  {activePrivateChat 
                    ? getSafeUserName(users.find(u => u.id === activePrivateChat))
                    : selectedUser === 'all' 
                      ? 'Chat General' 
                      : isGroupChat 
                        ? currentGroup?.name 
                        : getSafeUserName(users.find(u => u.id === selectedUser))}
                </h3>
                
                <div className="chat-status">
                  {activePrivateChat 
                    ? users.find(u => u.id === activePrivateChat)?.status === 'online' 
                      ? 'En línea' 
                      : `Últ. vez ${formatDistanceToNow(
                          new Date(users.find(u => u.id === activePrivateChat)?.lastSeen), 
                          { addSuffix: true, locale: es }
                        )}`
                    : selectedUser === 'all' 
                      ? `${users.length + 1} participantes` 
                      : isGroupChat 
                        ? `${currentGroup?.members.length} miembros` 
                        : users.find(u => u.id === selectedUser)?.status === 'online' 
                          ? 'En línea' 
                          : `Últ. vez ${formatDistanceToNow(
                              new Date(users.find(u => u.id === selectedUser)?.lastSeen), 
                              { addSuffix: true, locale: es }
                            )}`}
                </div>
              </div>
              
              <div className="chat-actions">
                {isGroupChat && (
                  <button 
                    className="action-button" 
                    title="Llamada grupal"
                    onClick={() => {
                      setNotifications([...notifications, {
                        id: uuidv4(),
                        from: 'Sistema',
                        message: 'Función de llamada grupal no implementada aún'
                      }]);
                    }}
                  >
                    <FaVideo />
                  </button>
                )}
                
                {(activePrivateChat || (!isGroupChat && selectedUser !== 'all')) && (
                  <button 
                    className="action-button" 
                    title="Llamada de voz"
                    onClick={() => {
                      setNotifications([...notifications, {
                        id: uuidv4(),
                        from: 'Sistema',
                        message: 'Función de llamada no implementada aún'
                      }]);
                    }}
                  >
                    <FaPhone />
                  </button>
                )}
                
                <button 
                  className="action-button" 
                  title="Más opciones"
                  onClick={() => {
                    if (isGroupChat) {
                      setShowUserProfile(selectedUser);
                    } else {
                      setShowUserProfile(activePrivateChat || selectedUser);
                    }
                  }}
                >
                  <FaEllipsisV />
                </button>
              </div>
            </div>
          ) : (
            <div className="no-chat-selected">
              <h3>Selecciona un chat para comenzar</h3>
              <p>Elige una conversación existente o inicia una nueva</p>
            </div>
          )}

          {/* Mensajes fijados */}
          {pinnedMessages.length > 0 && selectedUser === 'all' && (
            <div className="pinned-messages-bar">
              <button 
                onClick={() => setShowPinnedMessages(!showPinnedMessages)}
                className="pinned-toggle"
              >
                {showPinnedMessages ? 'Ocultar mensajes fijados' : `Mostrar ${pinnedMessages.length} mensajes fijados`}
              </button>
              
              {showPinnedMessages && (
                <div className="pinned-messages-container">
                  {pinnedMessages.map((msg, index) => (
                    <div key={index} className="pinned-message">
                      <div className="pinned-content">
                        <strong>{msg.fromName}: </strong>
                        {msg.type === 'text' 
                          ? msg.message.length > 50 
                            ? msg.message.substring(0, 50) + '...' 
                            : msg.message
                          : `[${msg.type === 'image' ? 'Imagen' : msg.type === 'file' ? 'Archivo' : 'Ubicación'}]`}
                      </div>
                      <button 
                        onClick={() => unpinMessage(msg.id)}
                        className="unpin-button"
                      >
                        Desfijar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Área de mensajes */}
          <div className="messages">
            {activePrivateChat ? (
              currentPrivateChat.length === 0 ? (
                <div className="no-messages">
                  No hay mensajes todavía. ¡Envía el primero!
                </div>
              ) : (
                currentPrivateChat.map((msg, index) => renderMessageItem(msg, index, true))
            ) : selectedUser ? (
              filteredMessages.length === 0 ? (
                <div className="no-messages">
                  {messageSearch ? 
                    'No se encontraron mensajes que coincidan con tu búsqueda' : 
                    'No hay mensajes todavía. ¡Envía el primero!'}
                </div>
              ) : (
                filteredMessages.map((msg, index) => renderMessageItem(msg, index))
            ) : (
              <div className="no-chat-selected-message">
                <div className="welcome-message">
                  <h2>Bienvenido a AG Connect</h2>
                  <p>Selecciona un chat para comenzar a conversar</p>
                  <div className="welcome-features">
                    <div className="welcome-feature">
                      <MdGroup className="feature-icon" />
                      <h3>Grupos</h3>
                      <p>Crea grupos con tus amigos, familia o compañeros de trabajo.</p>
                    </div>
                    <div className="welcome-feature">
                      <MdPerson className="feature-icon" />
                      <h3>Chat Privado</h3>
                      <p>Conversaciones uno a uno con total privacidad.</p>
                    </div>
                    <div className="welcome-feature">
                      <FaMapMarkerAlt className="feature-icon" />
                      <h3>Ubicación</h3>
                      <p>Comparte tu ubicación en tiempo real.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Indicador de que alguien está escribiendo */}
          <div className="typing-indicator">
            {typingUsers.length > 0 && (
              <p>
                {typingUsers.length > 1 
                  ? `${typingUsers.join(', ')} están escribiendo...` 
                  : `${typingUsers[0]} está escribiendo...`}
              </p>
            )}
          </div>

          {/* Respondiendo a mensaje */}
          {replyingTo && (
            <div className="reply-preview">
              <div className="reply-info">
                <span>Respondiendo a {replyingTo.from === socket.id ? 'ti mismo' : getSafeUserName(users.find(u => u.id === replyingTo.from))}</span>
                <button onClick={() => setReplyingTo(null)}>×</button>
              </div>
              <div className="reply-content">
                {replyingTo.type === 'text' 
                  ? replyingTo.message.length > 50 
                    ? replyingTo.message.substring(0, 50) + '...' 
                    : replyingTo.message
                  : `[${replyingTo.type === 'image' ? 'Imagen' : replyingTo.type === 'file' ? 'Archivo' : 'Ubicación'}]`}
              </div>
            </div>
          )}

          {/* Editando mensaje */}
          {messageEditId && (
            <div className="edit-message-preview">
              <div className="edit-info">
                <span>Editando mensaje</span>
                <div className="edit-actions">
                  <button onClick={saveEditedMessage}>Guardar</button>
                  <button onClick={() => {
                    setMessageEditId(null);
                    setEditedMessage('');
                  }}>Cancelar</button>
                </div>
              </div>
              <textarea
                value={editedMessage}
                onChange={(e) => setEditedMessage(e.target.value)}
                className="edit-message-input"
              />
            </div>
          )}

          {/* Archivos adjuntos */}
          {files.length > 0 && (
            <div className="attachments-preview">
              {files.map((file, index) => (
                <div key={index} className="attachment-item">
                  <span className="attachment-name">
                    {file.name.length > 20 
                      ? file.name.substring(0, 20) + '...' 
                      : file.name}
                  </span>
                  <span className="attachment-size">{formatFileSize(file.size)}</span>
                  <button 
                    onClick={() => removeFile(index)}
                    className="remove-attachment"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Área de entrada de mensajes */}
          {(activePrivateChat || selectedUser) && (
            <div className="message-input-area">
              <div className="input-buttons">
                <button
                  className="emoji-button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  title="Emojis"
                >
                  <FaSmile />
                </button>
                
                {showEmojiPicker && (
                  <div className="emoji-picker-container">
                    <EmojiPicker 
                      onEmojiClick={onEmojiClick} 
                      skinTonesDisabled
                      searchDisabled
                      width="100%"
                      height="350px"
                    />
                  </div>
                )}

                <button
                  className="location-button"
                  onClick={shareLocation}
                  title="Compartir ubicación"
                >
                  <FaMapMarkerAlt />
                </button>

                <input
                  type="file"
                  style={{ display: 'none' }}
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                  multiple
                />

                <button
                  className="attach-button"
                  onClick={() => fileInputRef.current.click()}
                  title="Adjuntar archivo"
                >
                  <FaPaperclip />
                </button>

                <input
                  type="file"
                  style={{ display: 'none' }}
                  ref={imageInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  multiple
                />

                <button
                  className="image-button"
                  onClick={() => imageInputRef.current.click()}
                  title="Adjuntar imagen"
                >
                  <FaRegImage />
                </button>

                {recording ? (
                  <button
                    className="record-button recording"
                    onClick={stopRecording}
                    title="Detener grabación"
                  >
                    <FaStop />
                  </button>
                ) : (
                  <button
                    className="record-button"
                    onClick={startRecording}
                    title="Grabar audio"
                  >
                    <FaMicrophone />
                  </button>
                )}
              </div>

              <div className="message-input-wrapper">
                <textarea
                  ref={messageInputRef}
                  placeholder={
                    activePrivateChat 
                      ? `Escribe un mensaje privado a ${getSafeUserName(users.find(u => u.id === activePrivateChat))}`
                      : selectedUser === 'all' 
                        ? 'Escribe un mensaje al grupo' 
                        : isGroupChat 
                          ? `Escribe un mensaje al grupo ${currentGroup?.name}`
                          : 'Escribe un mensaje privado'
                  }
                  value={messageEditId ? editedMessage : message}
                  onChange={(e) => messageEditId ? setEditedMessage(e.target.value) : setMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  onFocus={() => {
                    if (selectedUser !== 'all') {
                      socket.emit('typing', { userId: selectedUser, isTyping: true });
                    }
                  }}
                  onBlur={() => {
                    if (selectedUser !== 'all') {
                      socket.emit('typing', { userId: selectedUser, isTyping: false });
                    }
                  }}
                  rows="1"
                />
                
                <button 
                  className="send-button" 
                  onClick={messageEditId ? saveEditedMessage : sendMessage} 
                  disabled={(!message.trim() && files.length === 0 && !location && !recording) || (messageEditId && !editedMessage.trim())}
                >
                  {messageEditId ? 'Guardar' : <MdSend />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de ubicación */}
      {showLocationModal && (
        <div className="location-modal">
          <div className="modal-content">
            <h3>Compartir Ubicación</h3>
            {location ? (
              <>
                <p>¿Compartir esta ubicación?</p>
                <div className="location-preview">
                  <iframe
                    title="Ubicación"
                    width="100%"
                    height="200"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight="0"
                    marginWidth="0"
                    src={`https://maps.google.com/maps?q=${location.lat},${location.lng}&z=15&output=embed`}
                  ></iframe>
                  <div className="location-details">
                    <div>Latitud: {location.lat.toFixed(6)}</div>
                    <div>Longitud: {location.lng.toFixed(6)}</div>
                    <div>Precisión: ~{Math.round(location.accuracy)} metros</div>
                    <div>Hora: {format(new Date(location.timestamp), 'HH:mm dd/MM/yyyy')}</div>
                  </div>
                </div>
                <div className="modal-buttons">
                  <button 
                    onClick={() => {
                      sendLocation(uuidv4(), new Date().toISOString());
                    }} 
                    className="confirm-button"
                  >
                    Compartir
                  </button>
                  <button 
                    onClick={() => {
                      setLocation(null);
                      setShowLocationModal(false);
                    }} 
                    className="cancel-button"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <div className="loading-location">
                <div className="spinner"></div>
                <p>Obteniendo ubicación...</p>
                <button 
                  onClick={() => setShowLocationModal(false)}
                  className="cancel-button"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de creación de grupo */}
      {showGroupModal && (
        <div className="group-modal">
          <div className="modal-content">
            <h3>Crear Nuevo Grupo</h3>
            
            <div className="group-form">
              <input
                type="text"
                placeholder="Nombre del grupo"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="group-name-input"
              />
              
              <h4>Seleccionar miembros:</h4>
              <div className="group-members-list">
                {users.filter(u => u.id !== socket.id).map((user) => (
                  <div 
                    key={user.id} 
                    className={`group-member-item ${selectedUsersForGroup.includes(user.id) ? 'selected' : ''}`}
                    onClick={() => toggleUserSelectionForGroup(user.id)}
                  >
                    <div className="member-avatar">
                      {getSafeUserAvatar(user)}
                      {selectedUsersForGroup.includes(user.id) && (
                        <div className="member-selected">✓</div>
                      )}
                    </div>
                    <span className="member-name">{getSafeUserName(user)}</span>
                  </div>
                ))}
              </div>
              
              <div className="modal-buttons">
                <button 
                  onClick={createGroup} 
                  disabled={!newGroupName.trim() || selectedUsersForGroup.length === 0}
                  className="confirm-button"
                >
                  Crear Grupo
                </button>
                <button 
                  onClick={() => {
                    setNewGroupName('');
                    setSelectedUsersForGroup([]);
                    setShowGroupModal(false);
                  }} 
                  className="cancel-button"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de perfil de usuario/grupo */}
      {showUserProfile && (
        <div className="profile-modal">
          <div className="modal-content">
            <button 
              className="close-button" 
              onClick={() => setShowUserProfile(null)}
            >
              ×
            </button>
            
            <div className="profile-header">
              <div className="profile-avatar">
                {showUserProfile === socket.id ? 
                  username.charAt(0).toUpperCase() : 
                  showUserProfile.startsWith('group-') ?
                  <MdGroup /> :
                  getSafeUserAvatar(users.find(u => u.id === showUserProfile))}
              </div>
              
              <h3>
                {showUserProfile === socket.id ? 
                  username : 
                  showUserProfile.startsWith('group-') ?
                  groups.find(g => g.id === showUserProfile)?.name :
                  getSafeUserName(users.find(u => u.id === showUserProfile))}
              </h3>
              
              <div className={`profile-status ${
                showUserProfile === socket.id ? 
                  onlineStatus : 
                  showUserProfile.startsWith('group-') ?
                  'online' :
                  users.find(u => u.id === showUserProfile)?.status || 'offline'
              }`}>
                {showUserProfile === socket.id ? 
                  getStatusText(onlineStatus) : 
                  showUserProfile.startsWith('group-') ?
                  `${groups.find(g => g.id === showUserProfile)?.members.length} miembros` :
                  getStatusText(users.find(u => u.id === showUserProfile)?.status)}
                
                {!showUserProfile.startsWith('group-') && 
                 showUserProfile !== socket.id && 
                 users.find(u => u.id === showUserProfile)?.status === 'offline' && (
                  <div className="last-seen">
                    Últ. vez {formatDistanceToNow(
                      new Date(users.find(u => u.id === showUserProfile)?.lastSeen), 
                      { addSuffix: true, locale: es }
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {showUserProfile.startsWith('group-') ? (
              <div className="group-members-section">
                <h4>Miembros del grupo</h4>
                <div className="group-members-list">
                  {groups.find(g => g.id === showUserProfile)?.members.map(memberId => (
                    <div key={memberId} className="group-member-item">
                      <div className="member-avatar">
                        {memberId === socket.id ? 
                          username.charAt(0).toUpperCase() : 
                          getSafeUserAvatar(users.find(u => u.id === memberId))}
                      </div>
                      <div className="member-info">
                        <span className="member-name">
                          {memberId === socket.id ? 
                            `${username} (Tú)` : 
                            getSafeUserName(users.find(u => u.id === memberId))}
                        </span>
                        <span className={`member-status ${
                          memberId === socket.id ? 
                            onlineStatus : 
                            users.find(u => u.id === memberId)?.status || 'offline'
                        }`}>
                          {memberId === socket.id ? 
                            getStatusText(onlineStatus) : 
                            getStatusText(users.find(u => u.id === memberId)?.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="group-actions">
                  <button className="group-action-button">
                    <FaUserPlus /> Añadir miembro
                  </button>
                  <button className="group-action-button danger">
                    <FaSignOutAlt /> Abandonar grupo
                  </button>
                </div>
              </div>
            ) : (
              <div className="profile-actions">
                {showUserProfile !== socket.id && (
                  <>
                    <button 
                      className="profile-action-button"
                      onClick={() => {
                        startPrivateChat(showUserProfile);
                        setShowUserProfile(null);
                      }}
                    >
                      <MdPerson /> Enviar mensaje
                    </button>
                    
                    <button className="profile-action-button">
                      <FaPhone /> Llamar
                    </button>
                    
                    <button className="profile-action-button">
                      <FaVideo /> Videollamada
                    </button>
                    
                    <button className="profile-action-button danger">
                      <BiBlock /> Bloquear usuario
                    </button>
                  </>
                )}
                
                {showUserProfile === socket.id && (
                  <>
                    <button 
                      className="profile-action-button"
                      onClick={() => setShowSettings(true)}
                    >
                      <BsThreeDotsVertical /> Configuración
                    </button>
                    
                    <button 
                      className="profile-action-button danger"
                      onClick={handleLogout}
                    >
                      <FaSignOutAlt /> Cerrar sesión
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de reenvío de mensajes */}
      {showForwardModal && forwardMessage && (
        <div className="forward-modal">
          <div className="modal-content">
            <h3>Reenviar Mensaje</h3>
            
            <div className="forward-preview">
              <div className="forward-origin">
                <strong>Mensaje original de {forwardMessage.from === socket.id ? 'ti' : getSafeUserName(users.find(u => u.id === forwardMessage.from))}</strong>
              </div>
              <div className="forward-content">
                {forwardMessage.type === 'text' 
                  ? forwardMessage.message
                  : `[${forwardMessage.type === 'image' ? 'Imagen' : forwardMessage.type === 'file' ? 'Archivo' : 'Ubicación'}]`}
              </div>
            </div>
            
            <h4>Enviar a:</h4>
            <div className="forward-recipients">
              <div 
                className={`forward-recipient ${forwardTo.includes('all') ? 'selected' : ''}`}
                onClick={() => toggleForwardUser('all')}
              >
                <div className="recipient-avatar">👥</div>
                <span className="recipient-name">Chat General</span>
              </div>
              
              {groups.filter(g => g.members.includes(socket.id)).map(group => (
                <div 
                  key={group.id}
                  className={`forward-recipient ${forwardTo.includes(group.id) ? 'selected' : ''}`}
                  onClick={() => toggleForwardUser(group.id)}
                >
                  <div className="recipient-avatar">
                    <MdGroup />
                  </div>
                  <span className="recipient-name">{group.name}</span>
                </div>
              ))}
              
              {users.map(user => (
                <div 
                  key={user.id}
                  className={`forward-recipient ${forwardTo.includes(user.id) ? 'selected' : ''}`}
                  onClick={() => toggleForwardUser(user.id)}
                >
                  <div className="recipient-avatar">
                    {getSafeUserAvatar(user)}
                  </div>
                  <span className="recipient-name">{getSafeUserName(user)}</span>
                </div>
              ))}
            </div>
            
            <div className="modal-buttons">
              <button 
                onClick={forwardMessageToUsers} 
                disabled={forwardTo.length === 0}
                className="confirm-button"
              >
                Reenviar ({forwardTo.length})
              </button>
              <button 
                onClick={() => {
                  setForwardMessage(null);
                  setForwardTo([]);
                  setShowForwardModal(false);
                }} 
                className="cancel-button"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notificaciones */}
      <div className="notifications">
        {notifications.map((notif) => (
          <div key={notif.id} className="notification">
            <strong>{notif.from}:</strong> {notif.message}
          </div>
        ))}
      </div>
      
      {/* Audio para notificaciones */}
      <audio ref={notificationSoundRef} src="/notification.mp3" preload="auto" />
    </div>
  );
}

export default appcj;
```
