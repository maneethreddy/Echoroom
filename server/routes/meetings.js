const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Meeting = require("../models/meeting");
const User = require("../models/user");

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key_here_make_it_long_and_random";

// Debug endpoint to test authentication
router.get("/test-auth", (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  console.log("Auth header:", authHeader);
  console.log("Token:", token);
  
  if (!token) {
    return res.status(401).json({ msg: "No token provided" });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log("Token verification error:", err.message);
      return res.status(403).json({ msg: "Invalid or expired token", error: err.message });
    }
    console.log("Token verified successfully, user:", user);
    res.json({ msg: "Token is valid", user });
  });
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log("Auth header:", authHeader);
  console.log("Token:", token ? "Present" : "Missing");

  if (!token) {
    return res.status(401).json({ msg: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log("Token verification failed:", err.message);
      return res.status(403).json({ msg: "Invalid or expired token" });
    }
    console.log("Token verified, user ID:", user.id);
    req.user = user;
    next();
  });
};

// Create a new meeting
router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
      topic,
      password,
      host,
      description,
      date,
      time,
      ampm,
      timezone,
      duration
    } = req.body;

    // Validate required fields
    if (!topic || !password || !host || !date || !time || !timezone || !duration) {
      return res.status(400).json({ msg: "All required fields must be provided" });
    }

    // Parse date and time
    const [hours, minutes] = time.split(':');
    let hour = parseInt(hours);
    
    // Convert to 24-hour format
    if (ampm === 'PM' && hour !== 12) {
      hour += 12;
    } else if (ampm === 'AM' && hour === 12) {
      hour = 0;
    }

    const scheduledDate = new Date(date);
    scheduledDate.setHours(hour, parseInt(minutes), 0, 0);

    // Check if meeting is in the past
    if (scheduledDate < new Date()) {
      return res.status(400).json({ msg: "Cannot schedule meetings in the past" });
    }

    // Get user details
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Generate a unique meeting ID
    let meetingId;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!isUnique && attempts < maxAttempts) {
      meetingId = Math.floor(100000 + Math.random() * 900000).toString();
      const existingMeeting = await Meeting.findOne({ meetingId });
      if (!existingMeeting) {
        isUnique = true;
      }
      attempts++;
    }
    
    if (!isUnique) {
      // Fallback: use timestamp + random number
      meetingId = Date.now().toString().slice(-6) + Math.floor(Math.random() * 100).toString().padStart(2, '0');
    }

    const meeting = new Meeting({
      topic,
      meetingId,
      password,
      host,
      hostId: req.user.id,
      description,
      scheduledDate,
      timezone,
      duration
    });

    await meeting.save();

    res.status(201).json({
      msg: "Meeting scheduled successfully",
      meeting: {
        id: meeting._id,
        topic: meeting.topic,
        meetingId: meeting.meetingId,
        host: meeting.host,
        scheduledDate: meeting.scheduledDate,
        timezone: meeting.timezone,
        duration: meeting.duration,
        status: meeting.status
      }
    });

  } catch (err) {
    console.error("Error creating meeting:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

// Get all meetings for the authenticated user
router.get("/", authenticateToken, async (req, res) => {
  try {
    const meetings = await Meeting.find({ hostId: req.user.id })
      .sort({ scheduledDate: 1 })
      .select('-password');

    res.json(meetings);
  } catch (err) {
    console.error("Error fetching meetings:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

// Get a specific meeting by ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate('hostId', 'name email')
      .populate('participants.userId', 'name email');

    if (!meeting) {
      return res.status(404).json({ msg: "Meeting not found" });
    }

    // Check if user is the host or a participant
    if (meeting.hostId.toString() !== req.user.id && 
        !meeting.participants.some(p => p.userId && p.userId.toString() === req.user.id)) {
      return res.status(403).json({ msg: "Access denied" });
    }

    res.json(meeting);
  } catch (err) {
    console.error("Error fetching meeting:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

// Update a meeting
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({ msg: "Meeting not found" });
    }

    // Only the host can update the meeting
    if (meeting.hostId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Only the host can update this meeting" });
    }

    // Check if meeting is in the past
    if (meeting.scheduledDate < new Date()) {
      return res.status(400).json({ msg: "Cannot update past meetings" });
    }

    const {
      topic,
      password,
      host,
      description,
      date,
      time,
      ampm,
      timezone,
      duration
    } = req.body;

    // Parse date and time if provided
    if (date && time) {
      const [hours, minutes] = time.split(':');
      let hour = parseInt(hours);
      
      if (ampm === 'PM' && hour !== 12) {
        hour += 12;
      } else if (ampm === 'AM' && hour === 12) {
        hour = 0;
      }

      const scheduledDate = new Date(date);
      scheduledDate.setHours(hour, parseInt(minutes), 0, 0);

      if (scheduledDate < new Date()) {
        return res.status(400).json({ msg: "Cannot schedule meetings in the past" });
      }

      meeting.scheduledDate = scheduledDate;
    }

    // Update other fields
    if (topic) meeting.topic = topic;
    if (password) meeting.password = password;
    if (host) meeting.host = host;
    if (description !== undefined) meeting.description = description;
    if (timezone) meeting.timezone = timezone;
    if (duration) meeting.duration = duration;

    await meeting.save();

    res.json({
      msg: "Meeting updated successfully",
      meeting: {
        id: meeting._id,
        topic: meeting.topic,
        meetingId: meeting.meetingId,
        host: meeting.host,
        scheduledDate: meeting.scheduledDate,
        timezone: meeting.timezone,
        duration: meeting.duration,
        status: meeting.status
      }
    });

  } catch (err) {
    console.error("Error updating meeting:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

// Delete a meeting
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({ msg: "Meeting not found" });
    }

    // Only the host can delete the meeting
    if (meeting.hostId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Only the host can delete this meeting" });
    }

    await Meeting.findByIdAndDelete(req.params.id);

    res.json({ msg: "Meeting deleted successfully" });

  } catch (err) {
    console.error("Error deleting meeting:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

// Join a meeting
router.post("/:id/join", authenticateToken, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({ msg: "Meeting not found" });
    }

    // Check if meeting is scheduled for the future
    if (meeting.scheduledDate > new Date()) {
      return res.status(400).json({ msg: "Meeting has not started yet" });
    }

    // Check if user is already a participant
    const existingParticipant = meeting.participants.find(
      p => p.userId && p.userId.toString() === req.user.id
    );

    if (!existingParticipant) {
      const user = await User.findById(req.user.id);
      meeting.participants.push({
        userId: req.user.id,
        name: user.name,
        email: user.email,
        joinedAt: new Date()
      });
      await meeting.save();
    }

    res.json({
      msg: "Joined meeting successfully",
      meetingId: meeting.meetingId,
      topic: meeting.topic
    });

  } catch (err) {
    console.error("Error joining meeting:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

module.exports = router; 