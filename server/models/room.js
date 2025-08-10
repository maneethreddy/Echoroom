const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    default: 'New Room'
  },
  description: {
    type: String,
    default: ''
  },
  createdBy: {
    userId: String,
    userName: String,
    userPhoto: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  password: {
    type: String,
    default: null
  },
  maxParticipants: {
    type: Number,
    default: 50
  },
  currentParticipants: [{
    userId: String,
    userName: String,
    userPhoto: String,
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isOnline: {
      type: Boolean,
      default: true
    },
    lastSeen: {
      type: Date,
      default: Date.now
    }
  }],
  settings: {
    allowChat: {
      type: Boolean,
      default: true
    },
    allowScreenShare: {
      type: Boolean,
      default: true
    },
    allowRecording: {
      type: Boolean,
      default: false
    },
    aiAssistantEnabled: {
      type: Boolean,
      default: true
    },
    aiModel: {
      type: String,
      default: 'gemini'
    }
  },
  metadata: {
    tags: [String],
    category: {
      type: String,
      default: 'general'
    },
    language: {
      type: String,
      default: 'en'
    }
  }
});

// Indexes for better query performance
roomSchema.index({ roomId: 1 });
roomSchema.index({ isActive: 1, createdAt: -1 });
roomSchema.index({ 'currentParticipants.userId': 1 });

// Virtual for participant count
roomSchema.virtual('participantCount').get(function() {
  return this.currentParticipants.filter(p => p.isOnline).length;
});

// Method to add participant
roomSchema.methods.addParticipant = function(userId, userName, userPhoto) {
  const existingIndex = this.currentParticipants.findIndex(p => p.userId === userId);
  
  if (existingIndex >= 0) {
    // Update existing participant
    this.currentParticipants[existingIndex].isOnline = true;
    this.currentParticipants[existingIndex].lastSeen = new Date();
  } else {
    // Add new participant
    this.currentParticipants.push({
      userId,
      userName,
      userPhoto,
      joinedAt: new Date(),
      isOnline: true,
      lastSeen: new Date()
    });
  }
  
  return this.save();
};

// Method to remove participant
roomSchema.methods.removeParticipant = function(userId) {
  const participantIndex = this.currentParticipants.findIndex(p => p.userId === userId);
  
  if (participantIndex >= 0) {
    this.currentParticipants[participantIndex].isOnline = false;
    this.currentParticipants[participantIndex].lastSeen = new Date();
  }
  
  return this.save();
};

// Ensure virtual fields are serialized
roomSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Room', roomSchema); 