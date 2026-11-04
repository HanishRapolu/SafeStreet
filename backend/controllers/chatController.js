const ChatMessage = require('../models/ChatMessage');
const ChatRoom = require('../models/ChatRoom');
const Admin = require('../models/Admin');
const FieldWorker = require('../models/FieldWorker');

// Get all field worker chat rooms for admin's tenant
const getAllChatRooms = async (req, res) => {
  try {
    const { admin } = req;
    const tenantId = admin.tenant?._id || admin.tenant;

    console.log('getAllChatRooms - Admin:', admin.name, 'Tenant:', tenantId);

    if (!tenantId) {
      return res.status(400).json({ message: 'No tenant associated with this admin' });
    }

    // Get field worker chat rooms for this tenant
    const fieldWorkerChats = await ChatRoom.find({ 
      roomType: 'admin_fieldworker',
      isActive: { $ne: false }
    }).populate({
      path: 'participants.userId',
      select: 'name email role tenant profileImage'
    }).sort({ lastMessageAt: -1, updatedAt: -1 });

    // Transform field worker chats to match expected format
    const transformedFieldWorkerChats = await Promise.all(
      fieldWorkerChats.map(async (room) => {
        const fieldWorkerParticipant = room.participants.find(p => p.userModel === 'FieldWorker');
        const adminParticipant = room.participants.find(p => p.userModel === 'Admin');
        
        if (!fieldWorkerParticipant) return null;
        
        const fieldWorker = await FieldWorker.findById(fieldWorkerParticipant.userId).populate('tenant', 'name');
        if (!fieldWorker) return null;
        
        // Scope to admin's tenant
        const fwTenantId = fieldWorker.tenant?._id?.toString() || fieldWorker.tenant?.toString();
        if (fwTenantId !== tenantId.toString()) return null;

        // Get last message
        const lastMessage = await ChatMessage.findOne({ chatId: room._id })
          .sort({ createdAt: -1 })
          .select('message createdAt senderId senderName senderModel');
        
        // Get unread count for admin
        const unreadCount = await ChatMessage.countDocuments({
          chatId: room._id,
          senderModel: 'FieldWorker',
          readBy: { $not: { $elemMatch: { userId: admin._id } } }
        });
        
        return {
          _id: room._id,
          tenantId: fwTenantId,
          tenantName: fieldWorker.tenant?.name || 'SafeStreets',
          roomType: 'field_worker_chat',
          fieldWorker: {
            _id: fieldWorker._id,
            name: fieldWorker.name,
            email: fieldWorker.email,
            profileImage: fieldWorker.profileImage
          },
          admin: adminParticipant ? {
            _id: adminParticipant.userId,
            name: adminParticipant.name,
            role: adminParticipant.role
          } : null,
          lastMessage: lastMessage ? {
            message: lastMessage.message,
            timestamp: lastMessage.createdAt,
            senderName: lastMessage.senderName,
            senderModel: lastMessage.senderModel
          } : null,
          unreadCount,
          isActive: true,
          updatedAt: room.lastMessageAt || room.updatedAt
        };
      })
    );
    
    const validFieldWorkerChats = transformedFieldWorkerChats.filter(chat => chat !== null);
    
    validFieldWorkerChats.sort((a, b) => {
      const aTime = a.lastMessage?.timestamp || a.updatedAt || new Date(0);
      const bTime = b.lastMessage?.timestamp || b.updatedAt || new Date(0);
      return new Date(bTime) - new Date(aTime);
    });

    console.log('Found field worker chats:', validFieldWorkerChats.length);
    res.json(validFieldWorkerChats);
  } catch (error) {
    console.error('Error getting chat rooms:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get chat messages for field worker room
const getFieldWorkerChatMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const { admin } = req;

    console.log('getFieldWorkerChatMessages - Admin:', admin.name, 'Room ID:', roomId);

    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom || chatRoom.roomType !== 'admin_fieldworker') {
      return res.status(404).json({ message: 'Field worker chat room not found' });
    }

    const skip = (page - 1) * limit;

    const messages = await ChatMessage.find({ chatId: roomId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalMessages = await ChatMessage.countDocuments({ chatId: roomId });

    res.json({
      messages: messages.reverse(),
      totalMessages,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalMessages / limit),
      hasMore: skip + messages.length < totalMessages
    });
  } catch (error) {
    console.error('Error getting field worker chat messages:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Send message to field worker room
const sendMessage = async (req, res) => {
  try {
    const { tenantId: roomId } = req.params; // May be passed as roomId in route
    const { message, messageType = 'text', attachmentUrl } = req.body;
    const { admin } = req;

    if (!message) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    const chatMessage = new ChatMessage({
      chatId: chatRoom._id.toString(),
      senderId: admin._id,
      senderModel: 'Admin',
      senderName: admin.name,
      senderRole: admin.role,
      message,
      messageType,
      attachmentUrl,
      readBy: [{
        userId: admin._id,
        userModel: 'Admin',
        readAt: new Date()
      }]
    });

    await chatMessage.save();

    chatRoom.lastMessage = {
      message,
      senderId: admin._id,
      senderName: admin.name,
      timestamp: new Date()
    };
    chatRoom.updatedAt = new Date();
    await chatRoom.save();

    if (req.io) {
      req.io.to(`chat_${roomId}`).emit('new_message', {
        ...chatMessage.toObject(),
        timestamp: chatMessage.createdAt
      });
    }

    res.status(201).json(chatMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Mark messages as read
const markMessagesAsRead = async (req, res) => {
  try {
    const { tenantId: roomId } = req.params;
    const { admin } = req;

    await ChatMessage.updateMany(
      { 
        chatId: roomId,
        senderId: { $ne: admin._id },
        isRead: false
      },
      { 
        isRead: true,
        $push: {
          readBy: {
            userId: admin._id,
            userModel: 'Admin',
            readAt: new Date()
          }
        }
      }
    );

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAllChatRooms,
  getTenantChatRooms: getAllChatRooms,
  getChatRoom: getAllChatRooms,
  getChatMessages: getFieldWorkerChatMessages,
  getFieldWorkerChatMessages,
  sendMessage,
  markMessagesAsRead,
  getChatRoomsByRole: getAllChatRooms
};
