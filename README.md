# Echoroom - Video Conferencing Platform

A modern, real-time video conferencing application built with React, Node.js, and WebRTC technology.

## Features

### 🎥 Video Conferencing
- Real-time video and audio communication
- Multiple participants support
- Camera and microphone controls
- High-quality video streaming

### 🖥️ Screen Sharing
- **Share your entire screen** or specific applications
- **Real-time screen sharing** with all participants
- **Automatic fallback** to camera when screen sharing stops
- **Visual indicators** showing when someone is sharing their screen
- **Browser compatibility** detection and graceful degradation

### 💬 Chat & Messaging
- Real-time text messaging
- System notifications for screen sharing events
- Message history during the session

### 📅 Meeting Management
- Schedule meetings for future dates
- Join meetings with room IDs
- Meeting history and management

### 🔐 Authentication
- Google OAuth integration
- Secure user authentication
- User profile management

## Screen Sharing Features

### How to Use Screen Sharing
1. **Start Screen Sharing**: Click the screen share button (🖥️) in the meeting controls
2. **Select Content**: Choose to share your entire screen, a specific window, or a browser tab
3. **Share Audio**: Optionally include system audio (if supported by your browser)
4. **Stop Sharing**: Click the screen share button again or use the browser's stop sharing option

### Browser Support
- ✅ **Chrome/Chromium**: Full support
- ✅ **Firefox**: Full support
- ✅ **Safari**: Full support (macOS 10.15+)
- ✅ **Edge**: Full support
- ❌ **Internet Explorer**: Not supported

### Technical Details
- Uses `navigator.mediaDevices.getDisplayMedia()` API
- Automatic track replacement for seamless switching
- WebRTC peer-to-peer streaming
- Real-time notifications to all participants

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- Modern web browser with WebRTC support

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/echoroom.git
   cd echoroom
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install client dependencies
   cd client
   npm install
   
   # Install server dependencies
   cd ../server
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Create .env file in server directory
   cd server
   cp .env.example .env
   ```
   
   Edit `.env` file:
   ```
   MONGO_URI=mongodb://localhost:27017/echoroom
   PORT=8000
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

4. **Start the application**
   ```bash
   # Start server (from server directory)
   npm start
   
   # Start client (from client directory)
   cd ../client
   npm start
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8000

## Project Structure

```
echoroom/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── App.js         # Main app component
│   │   ├── RoomPage.js    # Video room with screen sharing
│   │   └── Dashboard.js   # Main dashboard
├── server/                 # Node.js backend
│   ├── routes/            # API routes
│   ├── models/            # MongoDB models
│   └── server.js          # Socket.IO server
└── README.md              # This file
```

## API Endpoints

### Authentication
- `POST /api/auth/google` - Google OAuth authentication
- `POST /api/auth/logout` - User logout

### Meetings
- `GET /api/meetings` - Get user's meetings
- `POST /api/meetings` - Create new meeting
- `DELETE /api/meetings/:id` - Delete meeting

### WebRTC Signaling (Socket.IO)
- `join-room` - Join video room
- `sending-signal` - WebRTC signaling
- `returning-signal` - WebRTC response
- `screen-share-started` - Screen sharing started
- `screen-share-stopped` - Screen sharing stopped
- `chat-message` - Send chat message

## Technologies Used

### Frontend
- **React** - UI framework
- **Material-UI** - Component library
- **Socket.IO Client** - Real-time communication
- **Simple Peer** - WebRTC peer connections

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **Socket.IO** - Real-time communication
- **MongoDB** - Database
- **Mongoose** - ODM

### WebRTC & Media
- **getUserMedia** - Camera/microphone access
- **getDisplayMedia** - Screen sharing
- **WebRTC** - Peer-to-peer communication

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review browser compatibility requirements

## Roadmap

- [ ] Recording functionality
- [ ] Virtual backgrounds
- [ ] Breakout rooms
- [ ] Meeting analytics
- [ ] Mobile app
- [ ] Advanced screen sharing options 