const express = require("express");
const http = require("http");
const mongoose = require('mongoose');
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();

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
app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log(`✅ EchoRoom server running on port ${PORT}`);
  })
  .catch((err) => console.log("Mongo Error:", err));
