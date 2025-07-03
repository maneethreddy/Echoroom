import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import {
  Box, Avatar, Button, Typography, IconButton, Paper, Stack, TextField, Badge, Drawer
} from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import MicIcon from '@mui/icons-material/Mic';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import ChatIcon from '@mui/icons-material/Chat';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SendIcon from '@mui/icons-material/Send';

const SOCKET_SERVER_URL = 'http://localhost:8000';

export default function RoomPage({ roomId }) {
  const [participants, setParticipants] = useState([]); // {id, name, photo, mic, cam}
  const [messages, setMessages] = useState([]); // {sender, text, time}
  const [peers, setPeers] = useState([]); // [{peer, id, name, photo}]
  const [localStream, setLocalStream] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const myVideo = useRef();
  const peersRef = useRef([]);
  const socketRef = useRef();
  const user = JSON.parse(localStorage.getItem('user')) || { name: 'You', profilePicture: '' };

  // --- WebRTC & Socket.IO setup ---
  useEffect(() => {
    let mounted = true;
    
    // Initialize socket connection
    socketRef.current = io(SOCKET_SERVER_URL);
    const socket = socketRef.current;
    
    console.log('Connecting to room:', roomId);
    
    // Get user media and join room
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (!mounted) return;
        console.log('Got local stream');
        setLocalStream(stream);
        if (myVideo.current) myVideo.current.srcObject = stream;
        
        // Join room after getting stream
        socket.emit('join-room', { 
          roomId, 
          user: { name: user.name, photo: user.profilePicture } 
        });
      })
      .catch(err => {
        console.error('Error getting user media:', err);
      });

    // Socket event handlers
    socket.on('participants', (users) => {
      console.log('Received participants:', users);
      if (mounted) {
        setParticipants(users);
        console.log("Participants state updated:", users);
      }
    });

    socket.on('chat-message', (msg) => {
      console.log('Received chat message:', msg);
      if (mounted) setMessages(msgs => [...msgs, msg]);
    });

    socket.on('all-users', users => {
      console.log('Received all-users:', users);
      if (!mounted || !localStream) return;
      
      // Clear existing peers
      peersRef.current.forEach(peerObj => {
        if (peerObj.peer) peerObj.peer.destroy();
      });
      peersRef.current = [];
      
      const newPeers = [];
      users.forEach(({ id, name, photo }) => {
        console.log('Creating peer for user:', id, name);
        const peer = createPeer(id, socket.id, localStream);
        peersRef.current.push({ peerID: id, peer, name, photo });
        newPeers.push({ peer, id, name, photo });
      });
      setPeers(newPeers);
    });

    socket.on('user-joined', payload => {
      console.log('User joined:', payload);
      if (!mounted || !localStream) return;
      
      const peer = addPeer(payload.signal, payload.callerID, localStream);
      peersRef.current.push({ 
        peerID: payload.callerID, 
        peer, 
        name: payload.name, 
        photo: payload.photo 
      });
      setPeers(users => [...users, { 
        peer, 
        id: payload.callerID, 
        name: payload.name, 
        photo: payload.photo 
      }]);
    });

    socket.on('receiving-returned-signal', payload => {
      console.log('Receiving returned signal from:', payload.id);
      const item = peersRef.current.find(p => p.peerID === payload.id);
      if (item) {
        item.peer.signal(payload.signal);
      }
    });

    // Cleanup function
    return () => { 
      console.log('Cleaning up RoomPage');
      mounted = false;
      
      // Destroy all peers
      peersRef.current.forEach(peerObj => {
        if (peerObj.peer) peerObj.peer.destroy();
      });
      peersRef.current = [];
      
      // Stop local stream
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      // Disconnect socket
      if (socket) {
        socket.disconnect();
      }
    };
  }, [roomId, user.name, user.profilePicture]);

  function createPeer(userToSignal, callerID, stream) {
    console.log('Creating peer for:', userToSignal);
    const peer = new Peer({ initiator: true, trickle: false, stream, config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] } });
    peer.on('signal', signal => {
      console.log('Sending signal to:', userToSignal);
      socketRef.current.emit('sending-signal', { userToSignal, callerID, signal });
    });
    peer.on('stream', stream => {
      console.log('Received stream from peer:', userToSignal);
    });
    return peer;
  }

  function addPeer(incomingSignal, callerID, stream) {
    console.log('Adding peer for:', callerID);
    const peer = new Peer({ initiator: false, trickle: false, stream, config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] } });
    peer.on('signal', signal => {
      console.log('Returning signal to:', callerID);
      socketRef.current.emit('returning-signal', { signal, callerID });
    });
    peer.on('stream', stream => {
      console.log('Received stream from new peer:', callerID);
    });
    peer.signal(incomingSignal);
    return peer;
  }

  // --- Controls ---
  const handleMicToggle = () => {
    if (localStream) {
      const enabled = !micOn;
      localStream.getAudioTracks()[0].enabled = enabled;
      setMicOn(enabled);
    }
  };
  const handleCamToggle = () => {
    if (localStream) {
      const enabled = !camOn;
      localStream.getVideoTracks()[0].enabled = enabled;
      setCamOn(enabled);
    }
  };
  const handleSendMessage = () => {
    if (chatInput.trim()) {
      const msg = { sender: user.name, text: chatInput, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      socketRef.current.emit('chat-message', msg);
      setMessages(msgs => [...msgs, msg]);
      setChatInput('');
    }
  };
  const handleEndCall = () => {
    window.location.href = '/';
  };

  // --- UI ---
  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: '#f7fafd' }}>
      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
        {/* Header */}
        <Paper sx={{ display: 'flex', alignItems: 'center', p: 2, mb: 2, borderRadius: 3 }}>
          <VideocamIcon sx={{ color: '#2563eb', fontSize: 36, mr: 2 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={700}>[Internal] Weekly Report Marketing + Sales</Typography>
            <Typography variant="body2" color="text.secondary">{new Date().toLocaleDateString()} | {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>
          </Box>
          <Stack direction="row" spacing={-1} sx={{ mr: 2 }}>
            {participants.slice(0, 4).map((p, i) => (
              <Avatar key={i} src={p.photo} />
            ))}
            {participants.length > 4 && (
              <Avatar sx={{ bgcolor: '#e0e7ef', color: '#2563eb', fontWeight: 700 }}>+{participants.length - 4}</Avatar>
            )}
          </Stack>
          <Button
            variant="outlined"
            startIcon={<ContentCopyIcon />}
            sx={{ mr: 2, borderRadius: 2, textTransform: 'none' }}
            onClick={() => navigator.clipboard.writeText(roomId)}
          >
            {roomId}
          </Button>
          <Avatar src={user.profilePicture} sx={{ mr: 1 }} />
          <Box>
            <Typography fontWeight={700}>{user.name}</Typography>
            <Typography variant="caption" color="text.secondary">You</Typography>
          </Box>
        </Paper>

        {/* Main Video Area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
          <Paper sx={{ width: '100%', maxWidth: 800, aspectRatio: '16/9', mb: 2, position: 'relative', overflow: 'hidden', borderRadius: 3 }}>
            {/* Main video stream here */}
            <video 
              ref={myVideo} 
              autoPlay 
              muted 
              playsInline
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover', 
                background: '#222' 
              }} 
            />
            <Box sx={{ position: 'absolute', top: 16, left: 16, bgcolor: '#fff', px: 2, py: 0.5, borderRadius: 2, fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center' }}>
              <StopCircleIcon sx={{ mr: 1, fontSize: 18 }} /> LIVE
            </Box>
            <Box sx={{ position: 'absolute', bottom: 16, left: 16, bgcolor: '#fff', px: 2, py: 0.5, borderRadius: 2, fontWeight: 700, color: '#222' }}>
              {user.name}
            </Box>
          </Paper>
          {/* Gallery */}
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            {peers.map((peerObj, i) => (
              <PeerVideo key={peerObj.id} peer={peerObj.peer} name={peerObj.name} photo={peerObj.photo} />
            ))}
          </Stack>
          {/* Controls */}
          <Stack direction="row" spacing={3} justifyContent="center" alignItems="center">
            <IconButton size="large" sx={{ bgcolor: micOn ? '#e0e7ef' : '#fde4e1', color: micOn ? '#2563eb' : '#ef4444' }} onClick={handleMicToggle}><MicIcon /></IconButton>
            <IconButton size="large" sx={{ bgcolor: camOn ? '#e0e7ef' : '#fde4e1', color: camOn ? '#2563eb' : '#ef4444' }} onClick={handleCamToggle}><VideocamIcon /></IconButton>
            <IconButton size="large" sx={{ bgcolor: '#e0e7ef', color: '#2563eb' }}><ScreenShareIcon /></IconButton>
            <IconButton size="large" sx={{ bgcolor: '#e0e7ef', color: '#2563eb' }} onClick={() => setChatOpen(true)}><ChatIcon /></IconButton>
            <Button variant="contained" sx={{ bgcolor: '#ef4444', color: '#fff', borderRadius: 2, px: 4, fontWeight: 700, ml: 2 }} onClick={handleEndCall}>End Call</Button>
          </Stack>
        </Box>
      </Box>

      {/* Sidebar */}
      <Box sx={{ width: 340, bgcolor: '#fff', p: 2, display: 'flex', flexDirection: 'column', borderLeft: '1px solid #e5e7eb' }}>
        {/* Participants */}
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography fontWeight={700}>Participants</Typography>
            <Button size="small" variant="outlined" sx={{ borderRadius: 2, textTransform: 'none' }}>Add Participant</Button>
          </Stack>
          <Stack spacing={1}>
            {participants.map((p, i) => (
              <Paper key={p.id || i} sx={{ p: 1, display: 'flex', alignItems: 'center', borderRadius: 2, bgcolor: '#f7fafd' }}>
                <Avatar src={p.photo} sx={{ mr: 1, bgcolor: '#e0e7ef', color: '#2563eb' }}>{p.name ? p.name[0] : '?'}</Avatar>
                <Typography fontWeight={500} flex={1}>{p.name}</Typography>
                <IconButton size="small" sx={{ color: p.mic !== false ? '#22c55e' : '#ef4444' }}><MicIcon /></IconButton>
                <IconButton size="small" sx={{ color: p.cam !== false ? '#2563eb' : '#ef4444' }}><VideocamIcon /></IconButton>
              </Paper>
            ))}
          </Stack>
        </Box>
        {/* Chat */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Stack direction="row" spacing={1} mb={1}>
            <Button size="small" variant="contained" sx={{ bgcolor: '#2563eb', color: '#fff', borderRadius: 2, textTransform: 'none' }}>Group</Button>
            <Button size="small" variant="outlined" sx={{ borderRadius: 2, textTransform: 'none' }}>Personal</Button>
          </Stack>
          <Box sx={{ flex: 1, overflowY: 'auto', mb: 1 }}>
            {messages.map((msg, i) => (
              <Box key={i} sx={{ mb: 1.5 }}>
                <Typography fontWeight={700} fontSize={14}>{msg.sender}</Typography>
                <Typography fontSize={14} color="text.secondary">{msg.text}</Typography>
                {msg.time && <Typography variant="caption" color="text.secondary">{msg.time}</Typography>}
              </Box>
            ))}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <TextField size="small" placeholder="Type Something..." fullWidth sx={{ bgcolor: '#f7fafd', borderRadius: 2 }}
              value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(); }}
            />
            <IconButton sx={{ ml: 1, bgcolor: '#2563eb', color: '#fff', borderRadius: 2 }} onClick={handleSendMessage}><SendIcon /></IconButton>
          </Box>
        </Box>
      </Box>
      {/* Chat Drawer for mobile */}
      <Drawer anchor="right" open={chatOpen} onClose={() => setChatOpen(false)}>
        <Box sx={{ width: 340, p: 2, height: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Typography fontWeight={700} mb={2}>Chat</Typography>
          <Box sx={{ flex: 1, overflowY: 'auto', mb: 1 }}>
            {messages.map((msg, i) => (
              <Box key={i} sx={{ mb: 1.5 }}>
                <Typography fontWeight={700} fontSize={14}>{msg.sender}</Typography>
                <Typography fontSize={14} color="text.secondary">{msg.text}</Typography>
                {msg.time && <Typography variant="caption" color="text.secondary">{msg.time}</Typography>}
              </Box>
            ))}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <TextField size="small" placeholder="Type Something..." fullWidth sx={{ bgcolor: '#f7fafd', borderRadius: 2 }}
              value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(); }}
            />
            <IconButton sx={{ ml: 1, bgcolor: '#2563eb', color: '#fff', borderRadius: 2 }} onClick={handleSendMessage}><SendIcon /></IconButton>
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
}

function PeerVideo({ peer, name, photo }) {
  const ref = useRef();
  
  useEffect(() => {
    if (!peer) return;
    
    console.log('Setting up PeerVideo for:', name);
    
    peer.on('stream', stream => {
      console.log('PeerVideo received stream for:', name);
      if (ref.current) {
        ref.current.srcObject = stream;
      }
    });
    
    peer.on('error', err => {
      console.error('Peer error for:', name, err);
    });
    
    return () => {
      console.log('Cleaning up PeerVideo for:', name);
    };
  }, [peer, name]);
  
  return (
    <Paper sx={{ p: 0.5, borderRadius: 2, minWidth: 140, textAlign: 'center', bgcolor: '#fff' }}>
      <video 
        ref={ref} 
        autoPlay 
        playsInline
        style={{ 
          width: 120, 
          height: 90, 
          borderRadius: 8, 
          background: '#222', 
          marginBottom: 4,
          objectFit: 'cover'
        }} 
      />
      <Avatar src={photo} sx={{ mx: 'auto', mb: 1, width: 32, height: 32 }} />
      <Typography fontWeight={700} fontSize={14}>{name}</Typography>
    </Paper>
  );
} 