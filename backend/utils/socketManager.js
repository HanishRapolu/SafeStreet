const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Tenant = require('../models/Tenant');
const FieldWorker = require('../models/FieldWorker');
const ChatMessage = require('../models/ChatMessage');
const ChatRoom = require('../models/ChatRoom');

class SocketManager {
  constructor(io) {
    this.io = io;
    this.userSockets = new Map(); // Map userId to socket.id
    this.socketUsers = new Map(); // Map socket.id to user info
    
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('User connected:', socket.id);
      
      // Add a connection timeout to ensure authentication happens
      const authTimeout = setTimeout(() => {
        if (!socket.userId) {
          console.log('Socket connection timed out without authentication:', socket.id);
          socket.disconnect(true);
        }
      }, 10000); // 10 seconds timeout for authentication
      
      // Clear timeout on disconnect
      socket.on('disconnect', () => {
        clearTimeout(authTimeout);
      });

      // Handle authentication
      socket.on('authenticate', async (token) => {
        console.log('Authentication attempt for socket:', socket.id);
        clearTimeout(authTimeout);
        try {
          // Validate token format
          if (!token || typeof token !== 'string') {
            console.error('Invalid token format received:', typeof token, token);
            socket.emit('error', 'Invalid token format - must be a string');
            return;
          }
          
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          console.log('Token decoded successfully:', decoded);
          let user;
          
          if (socket.handshake.auth && socket.handshake.auth.userType === 'fieldworker') {
            // This is a field worker token
            if (decoded.fieldWorkerId) {
              user = await FieldWorker.findById(decoded.fieldWorkerId).populate('tenant');
              if (user) {
                const userInfo = {
                  id: user._id.toString(),
                  name: user.name,
                  role: 'field_worker',
                  tenantId: user.tenant?._id?.toString() || user.tenant?.toString() || null,
                  userType: 'fieldworker'
                };

                // Store user-socket mapping
                this.userSockets.set(userInfo.id, socket.id);
                this.socketUsers.set(socket.id, userInfo);

                socket.userId = userInfo.id;
                socket.userInfo = userInfo;

                // Join a field worker room for notifications
                socket.join(`fieldworker_${userInfo.id}`);
                
                // Join tenant rooms for better message routing
                if (userInfo.tenantId) {
                  socket.join(`tenant_fieldworkers_${userInfo.tenantId}`);
                  socket.join(`tenant_${userInfo.tenantId}`);
                  socket.join(`chat_${userInfo.tenantId}`);
                }
                
                try {
                  const chatRooms = await ChatRoom.find({
                    'participants': {
                      $elemMatch: { userId: user._id, userModel: 'FieldWorker' }
                    }
                  });
                  
                  for (const room of chatRooms) {
                    socket.join(`chat_${room._id}`);
                    
                    const adminParticipant = room.participants.find(p => p.userModel === 'Admin');
                    if (adminParticipant && adminParticipant.userId) {
                      socket.join(`admin_${adminParticipant.userId.toString()}`);
                    }
                  }
                } catch (roomErr) {
                  console.error('Error joining chat rooms for field worker:', roomErr);
                }

                socket.emit('authenticated', userInfo);
                console.log(`Field worker authenticated: ${userInfo.name}`);
              }
            }
          } else if (decoded.adminId) {
            // This is an admin token
            user = await Admin.findById(decoded.adminId).populate('tenant');
            if (user) {
              const userInfo = {
                id: user._id.toString(),
                name: user.name,
                role: user.role,
                tenantId: user.tenant?._id?.toString() || user.tenant?.toString() || null,
                userType: 'admin'
              };

              // Store user-socket mapping
              this.userSockets.set(userInfo.id, socket.id);
              this.socketUsers.set(socket.id, userInfo);

              socket.userId = userInfo.id;
              socket.userInfo = userInfo;

              // Join admin-specific room
              socket.join(`admin_${userInfo.id}`);

              if (userInfo.tenantId) {
                socket.join(`chat_${userInfo.tenantId}`);
                socket.join(`tenant_${userInfo.tenantId}`);
                console.log(`Admin joined tenant rooms for ${userInfo.tenantId}`);
              }

              socket.emit('authenticated', userInfo);
              console.log(`Admin authenticated: ${userInfo.name} (${userInfo.role})`);
            }
          }

          if (!user) {
            socket.emit('auth_error', 'User not found');
            return;
          }

        } catch (error) {
          console.error('Authentication error:', error);
          socket.emit('auth_error', 'Invalid token');
        }
      });

      // Handle joining chat room
      socket.on('join_room', async (data) => {
        if (!socket.userInfo) {
          socket.emit('error', 'Not authenticated');
          return;
        }
        
        socket.join(data.room);
        console.log(`User ${socket.userInfo.name} joined room: ${data.room}`);
      });
      
      // Handle field worker typing notifications
      socket.on('fieldworker_typing', (data) => {
        if (!socket.userInfo) return;
        
        console.log(`Field worker ${socket.userInfo.name} typing in room ${data.chatRoomId}`);
        
        if (data.adminId) {
          this.io.to(`admin_${data.adminId}`).emit('user_typing', {
            userId: socket.userInfo.id,
            name: socket.userInfo.name,
            isTyping: data.isTyping,
            chatRoomId: data.chatRoomId
          });
        }
        
        if (data.chatRoomId) {
          socket.to(`chat_${data.chatRoomId}`).emit('user_typing', {
            userId: socket.userInfo.id,
            name: socket.userInfo.name,
            isTyping: data.isTyping,
            chatRoomId: data.chatRoomId
          });
        }
      });
      
      // Handle admin typing notifications
      socket.on('admin_typing', (data) => {
        if (!socket.userInfo) return;
        
        console.log(`Admin ${socket.userInfo.name} typing to field worker ${data.fieldWorkerId}`);
        
        if (data.fieldWorkerId) {
          this.io.to(`fieldworker_${data.fieldWorkerId}`).emit('user_typing', {
            userId: socket.userInfo.id,
            name: socket.userInfo.name,
            isTyping: data.isTyping,
            chatRoomId: data.chatRoomId
          });
        }
        
        if (data.chatRoomId) {
          socket.to(`chat_${data.chatRoomId}`).emit('user_typing', {
            userId: socket.userInfo.id,
            name: socket.userInfo.name,
            isTyping: data.isTyping,
            chatRoomId: data.chatRoomId
          });
        }
      });

      // Add ping-pong for connection testing
      socket.on('ping_server', () => {
        socket.emit('pong_server', { timestamp: new Date().toISOString() });
      });
      
      // Handle joining chat room
      socket.on('join_chat', async (tenantId) => {
        if (!socket.userInfo) {
          socket.emit('error', 'Not authenticated');
          return;
        }

        if (socket.userInfo.tenantId !== tenantId) {
          socket.emit('error', 'Access denied');
          return;
        }

        socket.join(`chat_${tenantId}`);
      });

      // Handle direct message from admin to field worker or vice versa
      socket.on('direct_message', async (messageData) => {
        try {
          if (!socket.userInfo) {
            socket.emit('error', 'Not authenticated');
            return;
          }
          
          if (messageData.recipientId) {
            if (socket.userInfo.userType === 'admin') {
              this.io.to(`fieldworker_${messageData.recipientId}`).emit('new_message', messageData.message);
            } else {
              this.io.to(`admin_${messageData.recipientId}`).emit('new_message', messageData.message);
            }
          }
          
          if (messageData.chatRoomId) {
            this.io.to(`chat_${messageData.chatRoomId}`).emit('new_message', messageData.message);
          }
          
          if (socket.userInfo.tenantId) {
            this.io.to(`chat_${socket.userInfo.tenantId}`).emit('new_message', messageData.message);
          }
        } catch (error) {
          console.error('Error handling direct_message:', error);
        }
      });
      
      // Handle manual message forwarding
      socket.on('manual_message', async (messageData) => {
        try {
          if (!socket.userInfo) {
            socket.emit('error', 'Not authenticated');
            return;
          }
          
          if (messageData.adminId) {
            this.io.to(`admin_${messageData.adminId}`).emit('new_message', messageData);
          }
          
          if (messageData.chatRoomId) {
            this.io.to(`chat_${messageData.chatRoomId}`).emit('new_message', messageData);
          }
          
          if (socket.userInfo.tenantId) {
            this.io.to(`chat_${socket.userInfo.tenantId}`).emit('new_message', messageData);
          }
        } catch (error) {
          console.error('Error handling manual message:', error);
        }
      });
      
      // Handle disconnection
      socket.on('disconnect', () => {
        if (socket.userInfo) {
          this.userSockets.delete(socket.userInfo.id);
          this.socketUsers.delete(socket.id);
          console.log(`User disconnected: ${socket.userInfo.name}`);
        }
      });
    });
  }

  // Method to send notification to specific user
  sendNotificationToUser(userId, notification) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit('notification', notification);
    }
  }
}

module.exports = SocketManager;
