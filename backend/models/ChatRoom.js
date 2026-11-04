const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
  roomType: {
    type: String,
    enum: ['admin_fieldworker'],
    default: 'admin_fieldworker',
    required: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant'
  },
  tenantName: {
    type: String
  },
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'participants.userModel'
    },
    userModel: {
      type: String,
      required: true,
      enum: ['Admin', 'FieldWorker']
    },
    name: String,
    role: {
      type: String,
      enum: ['tenant-owner', 'admin', 'field_worker']
    },
    lastSeen: {
      type: Date,
      default: Date.now
    }
  }],
  lastMessage: {
    message: String,
    senderId: mongoose.Schema.Types.ObjectId,
    senderName: String,
    timestamp: Date
  },
  unreadCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

chatRoomSchema.index({ tenantId: 1 });

const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);

module.exports = ChatRoom;
