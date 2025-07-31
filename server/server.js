const express = require("express");
const http = require("http");
const mongoose = require('mongoose');
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();
// Ensure you have a .env file with MONGO_URI set
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // For dev only! Lock down in production.
    methods: ["GET", "POST"]
  }
});

const rooms = {};
// This will hold all active rooms and their participants
// Enhanced server.js - WebRTC signaling improvements
// FIXED server.js - Prevent infinite signaling loops
io.on("connection", (socket) => {
  console.log("🔌 New connection:", socket.id);
  
  socket.on("join-room", ({ roomId, user }) => {
    console.log(`👋 ${user.name} (${socket.id}) joined room ${roomId}`);
    
    socket.join(roomId);
    
    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }
    
    // FIXED: Check if user already exists (prevent duplicates)
    const existingUser = rooms[roomId].find(u => u.id === socket.id);
    if (existingUser) {
      console.log(`⚠️ User ${socket.id} already in room ${roomId}`);
      return;
    }
    
    rooms[roomId].push({ id: socket.id, ...user });

    // Send existing users to the new user
    const otherUsers = rooms[roomId].filter(u => u.id !== socket.id);
    console.log(`📤 Sending ${otherUsers.length} existing users to ${socket.id}`);
    socket.emit("all-users", otherUsers);

    // Broadcast updated participants
    console.log(`📡 Broadcasting participants to room ${roomId}`);
    io.to(roomId).emit("participants", rooms[roomId]);

    socket.roomId = roomId;
    socket.user = user;
    
    console.log(`📊 Room ${roomId} users: [${rooms[roomId].map(u => `${u.name}(${u.id})`).join(', ')}]`);
  });

  // FIXED: Enhanced signaling with duplicate prevention
  socket.on("sending-signal", payload => {
    console.log(`📤 Signal: ${socket.id} -> ${payload.userToSignal} (${payload.signal.type})`);
    
    // Verify target user exists and is in the same room
    const targetSocket = io.sockets.sockets.get(payload.userToSignal);
    if (!targetSocket) {
      console.warn(`⚠️ Target socket ${payload.userToSignal} not found`);
      return;
    }
    
    // Check if target is in same room
    if (targetSocket.roomId !== socket.roomId) {
      console.warn(`⚠️ Target ${payload.userToSignal} not in same room`);
      return;
    }
    
    // CRITICAL FIX: Only send user-joined for offers, not for ice candidates
    if (payload.signal.type === 'offer') {
      console.log(`✅ Sending OFFER to ${payload.userToSignal}`);
      io.to(payload.userToSignal).emit("user-joined", {
        signal: payload.signal,
        callerID: socket.id,
        name: socket.user?.name || 'Unknown',
        photo: socket.user?.photo || ''
      });
    } else {
      // For ICE candidates and other signals, use a different event
      console.log(`📡 Forwarding ${payload.signal.type} to ${payload.userToSignal}`);
      io.to(payload.userToSignal).emit("peer-signal", {
        signal: payload.signal,
        from: socket.id
      });
    }
  });

  socket.on("returning-signal", payload => {
    console.log(`📤 Return Signal: ${socket.id} -> ${payload.callerID} (${payload.signal.type})`);
    
    const callerSocket = io.sockets.sockets.get(payload.callerID);
    if (!callerSocket) {
      console.warn(`⚠️ Caller socket ${payload.callerID} not found`);
      return;
    }
    
    if (callerSocket.roomId !== socket.roomId) {
      console.warn(`⚠️ Caller ${payload.callerID} not in same room`);
      return;
    }
    
    io.to(payload.callerID).emit("receiving-returned-signal", {
      signal: payload.signal,
      id: socket.id
    });
    
    console.log(`✅ Sent return signal to ${payload.callerID}`);
  });

  socket.on("chat-message", msg => {
    if (socket.roomId) {
      const messageWithUser = {
        ...msg,
        senderId: socket.id,
        senderPhoto: socket.user?.photo
      };
      io.to(socket.roomId).emit("chat-message", messageWithUser);
      console.log(`💬 Chat in ${socket.roomId}: ${msg.sender}: ${msg.text}`);
    }
  });

  // Screen sharing event handlers
  socket.on("screen-share-started", data => {
    if (socket.roomId) {
      console.log(`🖥️ Screen sharing started by ${data.userName} in room ${data.roomId}`);
      io.to(socket.roomId).emit("screen-share-started", {
        userId: data.userId,
        userName: data.userName
      });
    }
  });

  socket.on("screen-share-stopped", data => {
    if (socket.roomId) {
      console.log(`🖥️ Screen sharing stopped by ${data.userId} in room ${data.roomId}`);
      io.to(socket.roomId).emit("screen-share-stopped", {
        userId: data.userId
      });
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`👋 User ${socket.id} disconnected (${reason})`);
    
    const roomId = socket.roomId;
    if (roomId && rooms[roomId]) {
      const beforeCount = rooms[roomId].length;
      rooms[roomId] = rooms[roomId].filter(u => u.id !== socket.id);
      
      console.log(`📊 Room ${roomId}: ${beforeCount} -> ${rooms[roomId].length} users`);
      
      if (rooms[roomId].length > 0) {
        io.to(roomId).emit("participants", rooms[roomId]);
        console.log(`📡 Updated participants sent to room ${roomId}`);
      } else {
        delete rooms[roomId];
        console.log(`🧹 Deleted empty room ${roomId}`);
      }
    }
  });

  socket.on("error", (error) => {
    console.error(`❌ Socket error for ${socket.id}:`, error);
  });
});

// Add room monitoring
setInterval(() => {
  const roomCount = Object.keys(rooms).length;
  const totalUsers = Object.values(rooms).reduce((sum, room) => sum + room.length, 0);
  
  if (roomCount > 0) {
    console.log(`📊 Status: ${roomCount} rooms, ${totalUsers} users`);
    
    // Log individual room status
    Object.entries(rooms).forEach(([roomId, users]) => {
      if (users.length > 1) {
        console.log(`🏠 Room ${roomId}: ${users.map(u => u.name).join(', ')}`);
      }
    });
  }
}, 30000);

app.get("/", (req, res) => {
  res.send("EchoRoom backend is alive!");
});
const authRoutes = require("./routes/auth");
const meetingRoutes = require("./routes/meetings");
app.use("/api/auth", authRoutes);
app.use("/api/meetings", meetingRoutes);

const PORT = process.env.PORT || 8000;

// Connect to MongoDB first, then start the server
async function startServer() {
  try {
    // Check if MONGO_URI is set
    if (!process.env.MONGO_URI) {
      console.error("❌ MONGO_URI environment variable is not set!");
      console.log("Please set MONGO_URI in your .env file");
      console.log("Example: MONGO_URI=mongodb://localhost:27017/echoroom");
      process.exit(1);
    }

    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB successfully!");

    // Start the server after MongoDB connects
    server.listen(PORT, () => {
      console.log(`🚀 EchoRoom server running on port ${PORT}`);
      console.log(`📡 Socket.IO server ready for connections`);
      console.log(`🔗 API endpoints available at http://localhost:${PORT}/api`);
    });

  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    console.log("Please check your MONGO_URI and ensure MongoDB is running");
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during shutdown:', err);
    process.exit(1);
  }
});

startServer();
