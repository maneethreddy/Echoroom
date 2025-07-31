import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import {
  Box, Avatar, Button, Typography, IconButton, Paper, Stack, TextField, Badge, Drawer,
  Chip, Divider, useTheme, Tooltip
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
  const [peers, setPeers] = useState([]); // [{peerID, peer, name, photo, stream}]
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isScreenSharingAvailable, setIsScreenSharingAvailable] = useState(false);
  const myVideo = useRef();
  const peersRef = useRef([]);
  const socketRef = useRef();
  const user = JSON.parse(localStorage.getItem('user')) || { name: 'You', profilePicture: '' };
  const theme = useTheme();

  // Check if screen sharing is available
  useEffect(() => {
    setIsScreenSharingAvailable(!!navigator.mediaDevices.getDisplayMedia);
  }, []);

  // --- WebRTC & Socket.IO setup ---
  // FIXED: Complete solution to prevent infinite loops and video conflicts
  useEffect(() => {
    let mounted = true;
    let socket = null;
    
    socket = io(SOCKET_SERVER_URL);
    socketRef.current = socket;
    
    console.log('🔌 Connecting to room:', roomId);
    
    navigator.mediaDevices.getUserMedia({ 
      video: { width: 640, height: 480 }, 
      audio: true 
    })
      .then(stream => {
        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        console.log('📹 Got local stream with tracks:', stream.getTracks().map(t => t.kind));
        setLocalStream(stream);
        
        if (myVideo.current) {
          myVideo.current.srcObject = stream;
          const playPromise = myVideo.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(e => {
              if (e.name !== 'AbortError') {
                console.error('Local video play failed:', e);
              }
            });
          }
        }
        
        socket.emit('join-room', { 
          roomId, 
          user: { name: user.name, photo: user.profilePicture } 
        });
      })
      .catch(err => {
        console.error('❌ Error getting user media:', err);
        alert('Camera/Microphone access required. Please refresh and allow permissions.');
      });

    socket.on('participants', (users) => {
      console.log('👥 Received participants:', users);
      if (mounted) {
        setParticipants(users);
      }
    });

    socket.on('chat-message', (msg) => {
      if (mounted) setMessages(msgs => [...msgs, msg]);
    });

    // Screen sharing event handlers
    socket.on('screen-share-started', (data) => {
      if (mounted) {
        console.log('🖥️ Screen sharing started by:', data.userName);
        setMessages(msgs => [...msgs, {
          sender: 'System',
          text: `${data.userName} started screen sharing`,
          time: new Date().toLocaleTimeString(),
          type: 'system'
        }]);
      }
    });

    socket.on('screen-share-stopped', (data) => {
      if (mounted) {
        console.log('🖥️ Screen sharing stopped by:', data.userId);
        setMessages(msgs => [...msgs, {
          sender: 'System',
          text: 'Screen sharing stopped',
          time: new Date().toLocaleTimeString(),
          type: 'system'
        }]);
      }
    });

    // FIXED: Handle all-users event with proper deduplication
    socket.on('all-users', users => {
      console.log('🔗 Received all-users:', users);
      if (!mounted) return;
      
      const currentStream = myVideo.current?.srcObject;
      if (!currentStream) {
        console.warn('⚠️ Local stream not ready yet');
        return;
      }
      
      // Clear existing peers first
      console.log('🧹 Clearing existing peers');
      peersRef.current.forEach(peerObj => {
        if (peerObj.peer) {
          try {
            peerObj.peer.destroy();
          } catch (e) {
            console.warn('Error destroying peer:', e);
          }
        }
      });
      peersRef.current = [];
      setPeers([]);
      
      // Create peers for all users
      users.forEach(({ id, name, photo }) => {
        console.log('🔨 Creating peer for user:', id, name);
        try {
          const peer = createPeer(id, socket.id, currentStream, name, photo);
          peersRef.current.push({ peerID: id, peer, name, photo });
        } catch (error) {
          console.error('❌ Error creating peer for', id, ':', error);
        }
      });
    });

    // FIXED: Handle user-joined with deduplication
    socket.on('user-joined', payload => {
      console.log('👋 User joined:', payload.callerID, payload.name);
      if (!mounted) return;
      
      // CRITICAL FIX: Check if we already have a peer for this user
      const existingPeer = peersRef.current.find(p => p.peerID === payload.callerID);
      if (existingPeer) {
        console.log('⚠️ Peer already exists for:', payload.callerID, '- skipping');
        return;
      }
      
      const currentStream = myVideo.current?.srcObject;
      if (!currentStream) {
        console.warn('⚠️ Local stream not ready for new user');
        return;
      }
      
      try {
        const peer = addPeer(payload.signal, payload.callerID, currentStream, payload.name, payload.photo);
        
        const newPeerObj = { 
          peerID: payload.callerID, 
          peer, 
          name: payload.name, 
          photo: payload.photo 
        };
        peersRef.current.push(newPeerObj);
        console.log('✅ Added new peer to peersRef:', payload.callerID);
        
      } catch (error) {
        console.error('❌ Error adding peer:', error);
      }
    });

    socket.on('receiving-returned-signal', payload => {
      console.log('📡 Receiving returned signal from:', payload.id);
      const item = peersRef.current.find(p => p.peerID === payload.id);
      if (item && item.peer) {
        try {
          item.peer.signal(payload.signal);
          console.log('✅ Applied return signal to peer:', payload.id);
        } catch (error) {
          console.error('❌ Error applying return signal:', error);
        }
      } else {
        console.warn('⚠️ Peer not found for return signal from:', payload.id);
      }
    });

    // Add peer-signal event handler
    socket.on('peer-signal', payload => {
      console.log('📡 Received peer signal from:', payload.from, 'Type:', payload.signal.type);
      const item = peersRef.current.find(p => p.peerID === payload.from);
      if (item && item.peer) {
        try {
          item.peer.signal(payload.signal);
          console.log('✅ Applied peer signal from:', payload.from);
        } catch (error) {
          console.error('❌ Error applying peer signal:', error);
        }
      } else {
        console.warn('⚠️ Peer not found for signal from:', payload.from);
      }
    });

    // Cleanup function
    return () => { 
      console.log('🧹 Cleaning up RoomPage');
      mounted = false;
      
      peersRef.current.forEach(peerObj => {
        if (peerObj.peer) {
          try {
            peerObj.peer.destroy();
          } catch (e) {
            console.warn('Error destroying peer during cleanup:', e);
          }
        }
      });
      peersRef.current = [];
      
      if (localStream) {
        localStream.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (e) {
            console.warn('Error stopping track:', e);
          }
        });
      }
      
      // Clean up screen sharing stream
      if (screenStream) {
        screenStream.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (e) {
            console.warn('Error stopping screen track:', e);
          }
        });
      }
      
      if (socket) {
        try {
          socket.disconnect();
        } catch (e) {
          console.warn('Error disconnecting socket:', e);
        }
      }
    };
  }, [roomId, user.name, user.profilePicture]);

  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // Public TURN server for testing (replace with your own for production)
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ];

  // FIXED: Enhanced createPeer with deduplication protection
  function createPeer(userToSignal, callerID, stream, name, photo) {
    console.log('🔨 Creating peer for:', userToSignal, 'from', callerID);
    console.log('📹 Stream tracks:', stream.getTracks().map(t => `${t.kind}: ${t.enabled}`));
    
    if (!stream || stream.getTracks().length === 0) {
      throw new Error('No valid stream available for peer creation');
    }
    
    const peer = new Peer({ 
      initiator: true, 
      trickle: true, 
      stream, 
      config: { iceServers },
      // Add these options for better compatibility
      sdpSemantics: 'unified-plan'
    });
    
    peer.on('signal', signal => {
      console.log('📤 Sending signal to:', userToSignal, 'Type:', signal.type);
      try {
        socketRef.current.emit('sending-signal', { userToSignal, callerID, signal });
      } catch (error) {
        console.error('❌ Error sending signal:', error);
      }
    });
    
    peer.on('connect', () => {
      console.log('🤝 Peer connection established with', userToSignal);
    });
    
    peer.on('close', () => {
      console.log('👋 Peer connection closed with', userToSignal);
      setPeers(prev => prev.filter(p => p.peerID !== userToSignal));
    });
    
    peer.on('error', err => {
      console.error('❌ Peer error for:', userToSignal, err);
      setPeers(prev => prev.filter(p => p.peerID !== userToSignal));
    });
    
    // CRITICAL FIX: Enhanced stream handling
    peer.on('stream', remoteStream => {
      console.log('🎥 ✅ Got remote stream from', userToSignal);
      console.log('📹 Remote stream tracks:', remoteStream.getTracks().map(t => `${t.kind}: ${t.enabled}`));
      
      // Verify stream has tracks
      if (remoteStream.getTracks().length === 0) {
        console.warn('⚠️ Remote stream has no tracks');
        return;
      }
      
      // Update peers state with the stream
      setPeers(prev => {
        // Remove any existing peer with same ID to prevent duplicates
        const filtered = prev.filter(p => p.peerID !== userToSignal);
        const newPeer = { 
          peerID: userToSignal, 
          peer, 
          name, 
          photo, 
          stream: remoteStream 
        };
        const updated = [...filtered, newPeer];
        console.log('📊 Updated peers state:', updated.map(p => ({ id: p.peerID, name: p.name, hasStream: !!p.stream })));
        return updated;
      });
    });
    
    peer.on('iceStateChange', (state) => {
      console.log('🧊 ICE state changed for', userToSignal, ':', state);
    });
    
    return peer;
  }

  // FIXED: Enhanced addPeer with similar deduplication
  function addPeer(incomingSignal, callerID, stream, name, photo) {
    console.log('➕ Adding peer for:', callerID, name);
    console.log('📹 Stream tracks:', stream.getTracks().map(t => `${t.kind}: ${t.enabled}`));
    
    if (!stream || stream.getTracks().length === 0) {
      throw new Error('No valid stream available for peer creation');
    }
    
    const peer = new Peer({ 
      initiator: false, 
      trickle: true, 
      stream, 
      config: { iceServers },
      sdpSemantics: 'unified-plan'
    });
    
    peer.on('signal', signal => {
      console.log('📤 Returning signal to:', callerID, 'Type:', signal.type);
      try {
        socketRef.current.emit('returning-signal', { signal, callerID });
      } catch (error) {
        console.error('❌ Error returning signal:', error);
      }
    });
    
    peer.on('connect', () => {
      console.log('🤝 Peer connection established with', callerID);
    });
    
    peer.on('close', () => {
      console.log('👋 Peer connection closed with', callerID);
      setPeers(prev => prev.filter(p => p.peerID !== callerID));
    });
    
    peer.on('error', err => {
      console.error('❌ Peer error for:', callerID, err);
      setPeers(prev => prev.filter(p => p.peerID !== callerID));
    });
    
    // CRITICAL FIX: Enhanced stream handling for addPeer
    peer.on('stream', remoteStream => {
      console.log('🎥 ✅ Got remote stream from', callerID);
      console.log('📹 Remote stream tracks:', remoteStream.getTracks().map(t => `${t.kind}: ${t.enabled}`));
      
      if (remoteStream.getTracks().length === 0) {
        console.warn('⚠️ Remote stream has no tracks');
        return;
      }
      
      setPeers(prev => {
        const filtered = prev.filter(p => p.peerID !== callerID);
        const newPeer = { 
          peerID: callerID, 
          peer, 
          name, 
          photo, 
          stream: remoteStream 
        };
        const updated = [...filtered, newPeer];
        console.log('📊 Updated peers state:', updated.map(p => ({ id: p.peerID, name: p.name, hasStream: !!p.stream })));
        return updated;
      });
    });
    
    peer.on('iceStateChange', (state) => {
      console.log('🧊 ICE state changed for', callerID, ':', state);
    });
    
    // Signal after all handlers are attached
    try {
      peer.signal(incomingSignal);
      console.log('📡 Applied incoming signal from:', callerID);
    } catch (error) {
      console.error('❌ Error signaling incoming peer:', error);
      throw error;
    }
    
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

  const handleScreenShare = async () => {
    if (!isScreenSharingAvailable) {
      alert('Screen sharing is not supported in your browser');
      return;
    }

    if (isScreenSharing) {
      // Stop screen sharing
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        setScreenStream(null);
      }
      setIsScreenSharing(false);
      
      // Switch back to camera stream
      if (localStream && myVideo.current) {
        myVideo.current.srcObject = localStream;
      }
      
      // Notify other participants that screen sharing stopped
      socketRef.current.emit('screen-share-stopped', { roomId, userId: user.id || 'user' });
      
      // Update all peers with camera stream
      peersRef.current.forEach(peerObj => {
        if (peerObj.peer && localStream) {
          const videoTrack = localStream.getVideoTracks()[0];
          const audioTrack = localStream.getAudioTracks()[0];
          if (videoTrack) {
            const sender = peerObj.peer.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
              sender.replaceTrack(videoTrack);
            }
          }
        }
      });
    } else {
      // Start screen sharing
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: 'always',
            displaySurface: 'monitor'
          },
          audio: false // Most browsers don't support audio in screen sharing
        });
        
        setScreenStream(displayStream);
        setIsScreenSharing(true);
        
        // Switch video to screen stream
        if (myVideo.current) {
          myVideo.current.srcObject = displayStream;
        }
        
        // Notify other participants that screen sharing started
        socketRef.current.emit('screen-share-started', { 
          roomId, 
          userId: user.id || 'user',
          userName: user.name 
        });
        
        // Update all peers with screen stream
        const screenVideoTrack = displayStream.getVideoTracks()[0];
        const localAudioTrack = localStream?.getAudioTracks()[0];
        
        peersRef.current.forEach(peerObj => {
          if (peerObj.peer) {
            // Replace video track with screen track
            const videoSender = peerObj.peer.getSenders().find(s => s.track?.kind === 'video');
            if (videoSender && screenVideoTrack) {
              videoSender.replaceTrack(screenVideoTrack);
            }
            
            // Keep audio track from camera
            const audioSender = peerObj.peer.getSenders().find(s => s.track?.kind === 'audio');
            if (audioSender && localAudioTrack) {
              audioSender.replaceTrack(localAudioTrack);
            }
          }
        });
        
        // Handle screen sharing stop
        displayStream.getVideoTracks()[0].onended = () => {
          handleScreenShare(); // This will stop screen sharing
        };
        
      } catch (error) {
        console.error('Error starting screen share:', error);
        if (error.name === 'NotAllowedError') {
          alert('Screen sharing permission denied');
        } else {
          alert('Failed to start screen sharing: ' + error.message);
        }
      }
    }
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
              {isScreenSharing && (
                <Chip 
                  icon={<ScreenShareIcon />} 
                  label="SCREEN SHARING" 
                  size="small"
                  sx={{ 
                    bgcolor: '#10b981', 
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
                  <PeerVideo key={peerObj.peerID} stream={peerObj.stream} name={peerObj.name} photo={peerObj.photo} id={peerObj.peerID} />
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
              
              <Tooltip title={isScreenSharingAvailable ? (isScreenSharing ? 'Stop Screen Sharing' : 'Start Screen Sharing') : 'Screen sharing not supported'}>
                <IconButton 
                  size="large" 
                  disabled={!isScreenSharingAvailable}
                  sx={{ 
                    bgcolor: isScreenSharing ? 'rgba(16, 185, 129, 0.2)' : isScreenSharingAvailable ? 'rgba(102, 126, 234, 0.2)' : 'rgba(107, 114, 128, 0.2)', 
                    color: isScreenSharing ? '#10b981' : isScreenSharingAvailable ? '#667eea' : '#6b7280',
                    width: 56,
                    height: 56,
                    '&:hover': {
                      bgcolor: isScreenSharing ? 'rgba(16, 185, 129, 0.3)' : isScreenSharingAvailable ? 'rgba(102, 126, 234, 0.3)' : 'rgba(107, 114, 128, 0.2)'
                    },
                    '&:disabled': {
                      bgcolor: 'rgba(107, 114, 128, 0.2)',
                      color: '#6b7280'
                    }
                  }}
                  onClick={handleScreenShare}
                >
                  <ScreenShareIcon />
                </IconButton>
              </Tooltip>
              
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
                {msg.type === 'system' ? (
                  // System message (screen sharing events)
                  <Box sx={{ 
                    textAlign: 'center', 
                    py: 1, 
                    px: 2, 
                    bgcolor: 'rgba(16, 185, 129, 0.1)', 
                    borderRadius: 2,
                    border: '1px solid rgba(16, 185, 129, 0.3)'
                  }}>
                    <Typography fontSize={12} sx={{ color: '#10b981', fontWeight: 600 }}>
                      {msg.text}
                    </Typography>
                    {msg.time && (
                      <Typography variant="caption" sx={{ color: 'rgba(16, 185, 129, 0.7)' }}>
                        {msg.time}
                      </Typography>
                    )}
                  </Box>
                ) : (
                  // Regular chat message
                  <Box>
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

// FIXED: Enhanced PeerVideo component with proper video handling
function PeerVideo({ stream, name, photo, id }) {
  const videoRef = useRef();
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    console.log('🎬 PeerVideo useEffect for:', name, 'ID:', id);
    console.log('📹 Stream available:', !!stream);
    
    if (videoRef.current && stream) {
      console.log('📹 Stream tracks:', stream.getTracks().map(t => `${t.kind}: ${t.enabled}`));
      
      // Check if stream has video tracks
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      
      console.log('📊 Video tracks:', videoTracks.length, 'Audio tracks:', audioTracks.length);
      
      if (videoTracks.length === 0) {
        console.warn('⚠️ No video tracks in stream for:', name);
        setVideoError(true);
        return;
      }
      
      try {
        videoRef.current.srcObject = stream;
        
        // Add event listeners
        videoRef.current.onloadedmetadata = () => {
          console.log('✅ Video metadata loaded for:', name);
          setVideoError(false);
        };
        
        videoRef.current.onerror = (e) => {
          console.error('❌ Video error for:', name, e);
          setVideoError(true);
        };
        
        // Try to play
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log('▶️ Video playing for:', name);
            setVideoError(false);
          }).catch(e => {
            if (e.name !== 'AbortError') {
              console.error('❌ Video play failed for:', name, e);
              setVideoError(true);
            }
          });
        }
          
      } catch (error) {
        console.error('❌ Error setting video source for:', name, error);
        setVideoError(true);
      }
    } else {
      console.warn('⚠️ Missing videoRef or stream for:', name);
      setVideoError(true);
    }
  }, [stream, name, id]);

  return (
    <Box sx={{ 
      position: 'relative', 
      borderRadius: 3, 
      overflow: 'hidden', 
      border: '2px solid rgba(255, 255, 255, 0.2)',
      bgcolor: '#1e293b'
    }}>
      {videoError ? (
        // Fallback when video fails
        <Box sx={{
          width: 200,
          height: 150,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          bgcolor: '#1e293b',
          color: 'white'
        }}>
          <Avatar 
            src={photo} 
            sx={{ 
              width: 60, 
              height: 60, 
              bgcolor: 'rgba(102, 126, 234, 0.8)',
              mb: 1
            }}
          >
            {name ? name[0] : '?'}
          </Avatar>
          <Typography variant="caption">Camera Off</Typography>
        </Box>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={false} // Don't mute remote videos
          data-peer-id={id}
          style={{
            width: 200,
            height: 150,
            objectFit: 'cover',
            background: '#1e293b'
          }}
        />
      )}
      
      <Box sx={{ 
        position: 'absolute', 
        bottom: 8, 
        left: 8, 
        right: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        bgcolor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 2,
        px: 1,
        py: 0.5
      }}>
        <Avatar 
          src={photo} 
          sx={{ 
            width: 20, 
            height: 20, 
            bgcolor: 'rgba(102, 126, 234, 0.8)',
            fontSize: 10
          }}
        >
          {name ? name[0] : '?'}
        </Avatar>
        <Typography 
          variant="caption" 
          sx={{ 
            color: 'white', 
            fontWeight: 600,
            flex: 1,
            fontSize: 11
          }}
        >
          {name}
        </Typography>
        <Box sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: videoError ? '#ef4444' : '#10b981'
        }} />
      </Box>
    </Box>
  );
} 