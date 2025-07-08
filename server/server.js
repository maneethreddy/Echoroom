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

io.on("connection", (socket) => {
  console.log("New connection:", socket.id);
  socket.on("join-room", ({ roomId, user }) => {
    console.log(`${user.name} joined room ${roomId} (${socket.id})`);
    socket.join(roomId);
    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push({ id: socket.id, ...user });

    // Send all other users to the new user for WebRTC
    const otherUsers = rooms[roomId].filter(u => u.id !== socket.id);
    socket.emit("all-users", otherUsers);

    // Broadcast updated participants to everyone in the room
    io.to(roomId).emit("participants", rooms[roomId]);

    // Save roomId and user on the socket for later use
    socket.roomId = roomId;
    socket.user = user;
    console.log("Current users in room", roomId, rooms[roomId]);
  });

  // WebRTC signaling
  socket.on("sending-signal", payload => {
    console.log("sending-signal from", socket.id, "to", payload.userToSignal);
    io.to(payload.userToSignal).emit("user-joined", {
      signal: payload.signal,
      callerID: socket.id,
      name: socket.user?.name,
      photo: socket.user?.photo
    });
  });

  socket.on("returning-signal", payload => {
    console.log("returning-signal from", socket.id, "to", payload.callerID);
    io.to(payload.callerID).emit("receiving-returned-signal", {
      signal: payload.signal,
      id: socket.id
    });
  });

  // Chat
  socket.on("chat-message", msg => {
    if (socket.roomId) {
      io.to(socket.roomId).emit("chat-message", msg);
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    const roomId = socket.roomId;
    if (roomId && rooms[roomId]) {
      rooms[roomId] = rooms[roomId].filter(u => u.id !== socket.id);
      io.to(roomId).emit("participants", rooms[roomId]);
      if (rooms[roomId].length === 0) delete rooms[roomId];
      console.log("After disconnect, users in room", roomId, rooms[roomId]);
    }
  });
});

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
