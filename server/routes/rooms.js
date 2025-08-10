const express = require('express');
const router = express.Router();
const Room = require('../models/room');
const Message = require('../models/message');
const geminiService = require('../services/geminiService');

// Get all active rooms
router.get('/', async (req, res) => {
  try {
    const rooms = await Room.find({ isActive: true })
      .select('roomId name description createdAt currentParticipants settings metadata')
      .sort({ createdAt: -1 })
      .lean();

    // Add participant count to each room
    const roomsWithCounts = rooms.map(room => ({
      ...room,
      participantCount: room.currentParticipants.filter(p => p.isOnline).length
    }));

    res.json({
      success: true,
      rooms: roomsWithCounts
    });
  } catch (error) {
    console.error('❌ Error fetching rooms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rooms'
    });
  }
});

// Create a new room
router.post('/', async (req, res) => {
  try {
    const { roomId, name, description, createdBy, isPrivate, password, settings, metadata } = req.body;

    if (!roomId || !name || !createdBy) {
      return res.status(400).json({
        success: false,
        error: 'Room ID, name, and creator are required'
      });
    }

    // Check if room already exists
    const existingRoom = await Room.findOne({ roomId });
    if (existingRoom) {
      return res.status(409).json({
        success: false,
        error: 'Room with this ID already exists'
      });
    }

    const room = new Room({
      roomId,
      name,
      description: description || '',
      createdBy,
      isPrivate: isPrivate || false,
      password: password || null,
      settings: {
        allowChat: true,
        allowScreenShare: true,
        allowRecording: false,
        aiAssistantEnabled: true,
        aiModel: 'gemini',
        ...settings
      },
      metadata: {
        tags: [],
        category: 'general',
        language: 'en',
        ...metadata
      }
    });

    await room.save();

    res.status(201).json({
      success: true,
      room: {
        ...room.toObject(),
        participantCount: 0
      }
    });

  } catch (error) {
    console.error('❌ Error creating room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create room'
    });
  }
});

// Get room details by ID
router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = await Room.findOne({ roomId, isActive: true }).lean();
    
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    // Get recent messages
    const messages = await Message.find({ roomId })
      .sort({ timestamp: -1 })
      .limit(20)
      .lean();

    const roomWithMessages = {
      ...room,
      participantCount: room.currentParticipants.filter(p => p.isOnline).length,
      recentMessages: messages.reverse()
    };

    res.json({
      success: true,
      room: roomWithMessages
    });

  } catch (error) {
    console.error('❌ Error fetching room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch room'
    });
  }
});

// Join a room
router.post('/:roomId/join', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, userName, userPhoto } = req.body;

    if (!userId || !userName) {
      return res.status(400).json({
        success: false,
        error: 'User ID and name are required'
      });
    }

    let room = await Room.findOne({ roomId, isActive: true });
    
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    // Check if room is private and requires password
    if (room.isPrivate && room.password) {
      const { password } = req.body;
      if (password !== room.password) {
        return res.status(401).json({
          success: false,
          error: 'Invalid room password'
        });
      }
    }

    // Check if user is already in the room
    const existingParticipant = room.currentParticipants.find(p => p.userId === userId);
    
    if (existingParticipant) {
      // Update existing participant
      existingParticipant.isOnline = true;
      existingParticipant.lastSeen = new Date();
    } else {
      // Add new participant
      room.currentParticipants.push({
        userId,
        userName,
        userPhoto: userPhoto || '',
        joinedAt: new Date(),
        isOnline: true,
        lastSeen: new Date()
      });
    }

    await room.save();

    res.json({
      success: true,
      room: {
        ...room.toObject(),
        participantCount: room.currentParticipants.filter(p => p.isOnline).length
      }
    });

  } catch (error) {
    console.error('❌ Error joining room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to join room'
    });
  }
});

// Leave a room
router.post('/:roomId/leave', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const room = await Room.findOne({ roomId, isActive: true });
    
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    // Mark user as offline
    const participant = room.currentParticipants.find(p => p.userId === userId);
    if (participant) {
      participant.isOnline = false;
      participant.lastSeen = new Date();
      await room.save();
    }

    res.json({
      success: true,
      message: 'Successfully left room'
    });

  } catch (error) {
    console.error('❌ Error leaving room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to leave room'
    });
  }
});

// Get room messages
router.get('/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, before } = req.query;

    let query = { roomId };
    
    if (before) {
      query.timestamp = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .lean();

    // Reverse to show oldest first
    const sortedMessages = messages.reverse();

    res.json({
      success: true,
      messages: sortedMessages.map(msg => ({
        ...msg,
        formattedTime: new Date(msg.timestamp).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }))
    });

  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages'
    });
  }
});

// AI service status
router.get('/ai/status', (req, res) => {
  const status = geminiService.getStatus();
  res.json({
    success: true,
    status
  });
});

module.exports = router; 