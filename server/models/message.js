const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true
  },
  senderId: {
    type: String,
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  senderPhoto: {
    type: String,
    default: ''
  },
  text: {
    type: String,
    required: true
  },
  messageType: {
    type: String,
    enum: ['user', 'ai', 'system'],
    default: 'user'
  },
  aiModel: {
    type: String,
    default: 'gemini'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    isEdited: {
      type: Boolean,
      default: false
    },
    editTimestamp: Date,
    reactions: [{
      userId: String,
      emoji: String,
      timestamp: Date
    }],
    attachments: [{
      type: String,
      url: String,
      filename: String,
      size: Number
    }]
  }
});

// Indexes for better query performance
messageSchema.index({ roomId: 1, timestamp: -1 });
messageSchema.index({ senderId: 1, timestamp: -1 });

// Virtual for formatted timestamp
messageSchema.virtual('formattedTime').get(function() {
  return this.timestamp.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
});

// Ensure virtual fields are serialized
messageSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Message', messageSchema); 