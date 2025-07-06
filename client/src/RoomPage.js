import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import {
  Box, Avatar, Button, Typography, IconButton, Paper, Stack, TextField, Badge, Drawer,
  Chip, Divider, useTheme
} from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import MicIcon from '@mui/icons-material/Mic';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import ChatIcon from '@mui/icons-material/Chat';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SendIcon from '@mui/icons-material/Send';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';

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
  const [isRecording, setIsRecording] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const myVideo = useRef();
  const peersRef = useRef([]);
  const socketRef = useRef();
  const user = JSON.parse(localStorage.getItem('user')) || { name: 'You', profilePicture: '' };
  const theme = useTheme();

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
      console.log('Created peers:', newPeers.length);
    });

    socket.on('user-joined', payload => {
      console.log('User joined:', payload);
      if (!mounted || !localStream) return;
      
      const peer = addPeer(payload.signal, payload.callerID, localStream);
      const newPeerObj = { 
        peerID: payload.callerID, 
        peer, 
        name: payload.name, 
        photo: payload.photo 
      };
      peersRef.current.push(newPeerObj);
      setPeers(users => {
        const updated = [...users, { 
          peer, 
          id: payload.callerID, 
          name: payload.name, 
          photo: payload.photo 
        }];
        console.log('Updated peers after user joined:', updated.length);
        return updated;
      });
    });

    socket.on('receiving-returned-signal', payload => {
      console.log('Receiving returned signal from:', payload.id);
      const item = peersRef.current.find(p => p.peerID === payload.id);
      if (item) {
        console.log('Found peer for signal, applying signal to:', payload.id);
        item.peer.signal(payload.signal);
      } else {
        console.warn('Peer not found for signal from:', payload.id);
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
    const peer = new Peer({ 
      initiator: true, 
      trickle: false, 
      stream, 
      config: { 
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ] 
      } 
    });
    
    peer.on('signal', signal => {
      console.log('Sending signal to:', userToSignal);
      socketRef.current.emit('sending-signal', { userToSignal, callerID, signal });
    });
    
    peer.on('stream', stream => {
      console.log('Received stream from peer:', userToSignal);
      // Find the peer video element and set the stream
      const peerVideo = document.querySelector(`[data-peer-id="${userToSignal}"]`);
      if (peerVideo) {
        peerVideo.srcObject = stream;
      }
    });
    
    peer.on('error', err => {
      console.error('Peer error for:', userToSignal, err);
    });
    
    return peer;
  }

  function addPeer(incomingSignal, callerID, stream) {
    console.log('Adding peer for:', callerID);
    const peer = new Peer({ 
      initiator: false, 
      trickle: false, 
      stream, 
      config: { 
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ] 
      } 
    });
    
    peer.on('signal', signal => {
      console.log('Returning signal to:', callerID);
      socketRef.current.emit('returning-signal', { signal, callerID });
    });
    
    peer.on('stream', stream => {
      console.log('Received stream from new peer:', callerID);
      // Find the peer video element and set the stream
      const peerVideo = document.querySelector(`[data-peer-id="${callerID}"]`);
      if (peerVideo) {
        peerVideo.srcObject = stream;
      }
    });
    
    peer.on('error', err => {
      console.error('Peer error for:', callerID, err);
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

  const handleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
    // TODO: Implement screen sharing functionality
  };

  const handleRecording = () => {
    setIsRecording(!isRecording);
    // TODO: Implement recording functionality
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    // TODO: Show success notification
  };

  // --- UI ---
  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: '#0f172a' }}>
      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 3 }}>
        {/* Header */}
        <Paper 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            p: 3, 
            mb: 3, 
            borderRadius: 4, 
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'white'
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
              Team Meeting
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              {new Date().toLocaleDateString()} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Typography>
          </Box>
          
          <Stack direction="row" spacing={1} sx={{ mr: 3 }}>
            {participants.slice(0, 4).map((p, i) => (
              <Avatar 
                key={i} 
                src={p.photo} 
                sx={{ 
                  width: 32, 
                  height: 32, 
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  bgcolor: 'rgba(102, 126, 234, 0.8)'
                }}
              />
            ))}
            {participants.length > 4 && (
              <Avatar 
                sx={{ 
                  width: 32, 
                  height: 32, 
                  bgcolor: 'rgba(102, 126, 234, 0.8)', 
                  color: 'white', 
                  fontWeight: 700,
                  fontSize: 12
                }}
              >
                +{participants.length - 4}
              </Avatar>
            )}
          </Stack>
          
          <Button
            variant="outlined"
            startIcon={<ContentCopyIcon />}
            sx={{ 
              mr: 2, 
              borderRadius: 3, 
              textTransform: 'none',
              color: 'rgba(255, 255, 255, 0.8)',
              borderColor: 'rgba(255, 255, 255, 0.2)',
              '&:hover': {
                borderColor: '#667eea',
                color: '#667eea'
              }
            }}
            onClick={copyRoomId}
          >
            {roomId}
          </Button>
          
          <Avatar 
            src={user.profilePicture} 
            sx={{ 
              mr: 2,
              width: 40,
              height: 40,
              border: '2px solid rgba(255, 255, 255, 0.2)'
            }} 
          />
          
          <Box>
            <Typography fontWeight={700} sx={{ color: 'white' }}>
              {user.name}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              You
            </Typography>
          </Box>
        </Paper>

        {/* Main Video Area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
          <Paper 
            sx={{ 
              width: '100%', 
              maxWidth: 1000, 
              aspectRatio: '16/9', 
              mb: 3, 
              position: 'relative', 
              overflow: 'hidden', 
              borderRadius: 4,
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
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
                background: '#1e293b' 
              }} 
            />
            
            {/* Status indicators */}
            <Box sx={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 1 }}>
              <Chip 
                icon={<StopCircleIcon />} 
                label="LIVE" 
                size="small"
                sx={{ 
                  bgcolor: '#ef4444', 
                  color: 'white', 
                  fontWeight: 700,
                  '& .MuiChip-icon': { color: 'white' }
                }} 
              />
              {isRecording && (
                <Chip 
                  icon={<RecordVoiceOverIcon />} 
                  label="REC" 
                  size="small"
                  sx={{ 
                    bgcolor: '#dc2626', 
                    color: 'white', 
                    fontWeight: 700,
                    '& .MuiChip-icon': { color: 'white' }
                  }} 
                />
              )}
            </Box>
            
            <Box sx={{ position: 'absolute', bottom: 16, left: 16 }}>
              <Paper 
                sx={{ 
                  px: 2, 
                  py: 1, 
                  borderRadius: 3, 
                  background: 'rgba(0, 0, 0, 0.7)',
                  backdropFilter: 'blur(10px)',
                  color: 'white',
                  fontWeight: 600
                }}
              >
                {user.name}
              </Paper>
            </Box>
          </Paper>
          
          {/* Participant Gallery */}
          {peers.length > 0 && (
            <Box sx={{ width: '100%', maxWidth: 1000, mb: 4 }}>
              <Typography variant="h6" sx={{ color: 'white', mb: 2, fontWeight: 600 }}>
                Participants ({peers.length + 1})
              </Typography>
              <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 2 }}>
                {peers.map((peerObj, i) => (
                  <PeerVideo key={peerObj.id} peer={peerObj.peer} name={peerObj.name} photo={peerObj.photo} id={peerObj.id} />
                ))}
              </Stack>
            </Box>
          )}
          
          {/* Controls */}
          <Paper 
            sx={{ 
              p: 3, 
              borderRadius: 4, 
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <Stack direction="row" spacing={2} justifyContent="center" alignItems="center">
              <IconButton 
                size="large" 
                sx={{ 
                  bgcolor: micOn ? 'rgba(102, 126, 234, 0.2)' : 'rgba(239, 68, 68, 0.2)', 
                  color: micOn ? '#667eea' : '#ef4444',
                  width: 56,
                  height: 56,
                  '&:hover': {
                    bgcolor: micOn ? 'rgba(102, 126, 234, 0.3)' : 'rgba(239, 68, 68, 0.3)'
                  }
                }} 
                onClick={handleMicToggle}
              >
                <MicIcon />
              </IconButton>
              
              <IconButton 
                size="large" 
                sx={{ 
                  bgcolor: camOn ? 'rgba(102, 126, 234, 0.2)' : 'rgba(239, 68, 68, 0.2)', 
                  color: camOn ? '#667eea' : '#ef4444',
                  width: 56,
                  height: 56,
                  '&:hover': {
                    bgcolor: camOn ? 'rgba(102, 126, 234, 0.3)' : 'rgba(239, 68, 68, 0.3)'
                  }
                }} 
                onClick={handleCamToggle}
              >
                <VideocamIcon />
              </IconButton>
              
              <IconButton 
                size="large" 
                sx={{ 
                  bgcolor: isScreenSharing ? 'rgba(16, 185, 129, 0.2)' : 'rgba(102, 126, 234, 0.2)', 
                  color: isScreenSharing ? '#10b981' : '#667eea',
                  width: 56,
                  height: 56,
                  '&:hover': {
                    bgcolor: isScreenSharing ? 'rgba(16, 185, 129, 0.3)' : 'rgba(102, 126, 234, 0.3)'
                  }
                }}
                onClick={handleScreenShare}
              >
                <ScreenShareIcon />
              </IconButton>
              
              <IconButton 
                size="large" 
                sx={{ 
                  bgcolor: 'rgba(102, 126, 234, 0.2)', 
                  color: '#667eea',
                  width: 56,
                  height: 56,
                  '&:hover': {
                    bgcolor: 'rgba(102, 126, 234, 0.3)'
                  }
                }}
                onClick={() => setChatOpen(true)}
              >
                <ChatIcon />
              </IconButton>
              
              <IconButton 
                size="large" 
                sx={{ 
                  bgcolor: isRecording ? 'rgba(239, 68, 68, 0.2)' : 'rgba(102, 126, 234, 0.2)', 
                  color: isRecording ? '#ef4444' : '#667eea',
                  width: 56,
                  height: 56,
                  '&:hover': {
                    bgcolor: isRecording ? 'rgba(239, 68, 68, 0.3)' : 'rgba(102, 126, 234, 0.3)'
                  }
                }}
                onClick={handleRecording}
              >
                <RecordVoiceOverIcon />
              </IconButton>
              
              <Button 
                variant="contained" 
                sx={{ 
                  bgcolor: '#ef4444', 
                  color: 'white', 
                  borderRadius: 3, 
                  px: 4, 
                  py: 1.5,
                  fontWeight: 700, 
                  textTransform: 'none',
                  fontSize: 16,
                  '&:hover': { 
                    bgcolor: '#dc2626' 
                  }
                }} 
                onClick={handleEndCall}
                startIcon={<StopCircleIcon />}
              >
                End Call
              </Button>
            </Stack>
          </Paper>
        </Box>
      </Box>

      {/* Sidebar */}
      <Box sx={{ width: 380, bgcolor: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(20px)', p: 3, display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(255, 255, 255, 0.1)' }}>
        {/* Participants */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
              Participants ({participants.length})
            </Typography>
            <Button 
              size="small" 
              variant="outlined" 
              sx={{ 
                borderRadius: 3, 
                textTransform: 'none',
                color: 'rgba(255, 255, 255, 0.8)',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                '&:hover': {
                  borderColor: '#667eea',
                  color: '#667eea'
                }
              }}
            >
              Add
            </Button>
          </Box>
          
          <Stack spacing={1}>
            {participants.map((p, i) => (
              <Paper 
                key={p.id || i} 
                sx={{ 
                  p: 2, 
                  display: 'flex', 
                  alignItems: 'center', 
                  borderRadius: 3, 
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'white'
                }}
              >
                <Avatar 
                  src={p.photo} 
                  sx={{ 
                    mr: 2, 
                    bgcolor: 'rgba(102, 126, 234, 0.8)',
                    width: 40,
                    height: 40
                  }}
                >
                  {p.name ? p.name[0] : '?'}
                </Avatar>
                
                <Typography fontWeight={600} flex={1} sx={{ color: 'white' }}>
                  {p.name}
                </Typography>
                
                <Stack direction="row" spacing={1}>
                  <IconButton 
                    size="small" 
                    sx={{ 
                      color: p.mic !== false ? '#10b981' : '#ef4444',
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.2)'
                      }
                    }}
                  >
                    <MicIcon fontSize="small" />
                  </IconButton>
                  
                  <IconButton 
                    size="small" 
                    sx={{ 
                      color: p.cam !== false ? '#667eea' : '#ef4444',
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.2)'
                      }
                    }}
                  >
                    <VideocamIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Box>
        
        <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', my: 2 }} />
        
        {/* Chat */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
              Chat
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button 
                size="small" 
                variant="contained" 
                sx={{ 
                  bgcolor: '#667eea', 
                  color: 'white', 
                  borderRadius: 3, 
                  textTransform: 'none',
                  px: 2,
                  '&:hover': { bgcolor: '#5a53c2' }
                }}
              >
                Group
              </Button>
              <Button 
                size="small" 
                variant="outlined" 
                sx={{ 
                  borderRadius: 3, 
                  textTransform: 'none',
                  color: 'rgba(255, 255, 255, 0.8)',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  '&:hover': {
                    borderColor: '#667eea',
                    color: '#667eea'
                  }
                }}
              >
                Personal
              </Button>
            </Stack>
          </Box>
          
          <Box sx={{ flex: 1, overflowY: 'auto', mb: 2, pr: 1 }}>
            {messages.map((msg, i) => (
              <Box key={i} sx={{ mb: 2 }}>
                <Typography fontWeight={700} fontSize={14} sx={{ color: 'white', mb: 0.5 }}>
                  {msg.sender}
                </Typography>
                <Typography fontSize={14} sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 0.5 }}>
                  {msg.text}
                </Typography>
                {msg.time && (
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    {msg.time}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField 
              size="small" 
              placeholder="Type a message..." 
              fullWidth 
              sx={{ 
                bgcolor: 'rgba(255, 255, 255, 0.05)', 
                borderRadius: 3,
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#667eea',
                  },
                },
                '& .MuiInputBase-input::placeholder': {
                  color: 'rgba(255, 255, 255, 0.5)',
                  opacity: 1,
                },
              }}
              value={chatInput} 
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(); }}
            />
            <IconButton 
              sx={{ 
                bgcolor: '#667eea', 
                color: 'white', 
                borderRadius: 3,
                width: 40,
                height: 40,
                '&:hover': { 
                  bgcolor: '#5a53c2' 
                }
              }} 
              onClick={handleSendMessage}
            >
              <SendIcon />
            </IconButton>
          </Box>
        </Box>
      </Box>
      
      {/* Chat Drawer for mobile */}
      <Drawer 
        anchor="right" 
        open={chatOpen} 
        onClose={() => setChatOpen(false)}
        PaperProps={{
          sx: {
            width: 380,
            bgcolor: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(20px)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.1)'
          }
        }}
      >
        <Box sx={{ p: 3, height: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h6" sx={{ color: 'white', fontWeight: 700, mb: 3 }}>
            Chat
          </Typography>
          <Box sx={{ flex: 1, overflowY: 'auto', mb: 2 }}>
            {messages.map((msg, i) => (
              <Box key={i} sx={{ mb: 2 }}>
                <Typography fontWeight={700} fontSize={14} sx={{ color: 'white', mb: 0.5 }}>
                  {msg.sender}
                </Typography>
                <Typography fontSize={14} sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 0.5 }}>
                  {msg.text}
                </Typography>
                {msg.time && (
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    {msg.time}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField 
              size="small" 
              placeholder="Type a message..." 
              fullWidth 
              sx={{ 
                bgcolor: 'rgba(255, 255, 255, 0.05)', 
                borderRadius: 3,
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#667eea',
                  },
                },
                '& .MuiInputBase-input::placeholder': {
                  color: 'rgba(255, 255, 255, 0.5)',
                  opacity: 1,
                },
              }}
              value={chatInput} 
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(); }}
            />
            <IconButton 
              sx={{ 
                bgcolor: '#667eea', 
                color: 'white', 
                borderRadius: 3,
                width: 40,
                height: 40,
                '&:hover': { 
                  bgcolor: '#5a53c2' 
                }
              }} 
              onClick={handleSendMessage}
            >
              <SendIcon />
            </IconButton>
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
}

function PeerVideo({ peer, name, photo, id }) {
  const ref = useRef();
  
  useEffect(() => {
    if (peer) {
      peer.on('stream', stream => {
        if (ref.current) {
          ref.current.srcObject = stream;
        }
      });
    }
  }, [peer]);

  return (
    <Box sx={{ position: 'relative', borderRadius: 3, overflow: 'hidden', border: '2px solid rgba(255, 255, 255, 0.2)' }}>
      <video
        ref={ref}
        autoPlay
        playsInline
        data-peer-id={id}
        style={{
          width: 200,
          height: 150,
          objectFit: 'cover',
          background: '#1e293b'
        }}
      />
      <Box sx={{ 
        position: 'absolute', 
        bottom: 8, 
        left: 8, 
        right: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        <Avatar 
          src={photo} 
          sx={{ 
            width: 24, 
            height: 24, 
            bgcolor: 'rgba(102, 126, 234, 0.8)',
            fontSize: 12
          }}
        >
          {name ? name[0] : '?'}
        </Avatar>
        <Typography 
          variant="caption" 
          sx={{ 
            color: 'white', 
            fontWeight: 600,
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
            flex: 1
          }}
        >
          {name}
        </Typography>
      </Box>
    </Box>
  );
} 