import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import {
  Box, Avatar, Button, Typography, IconButton, Paper, Stack, TextField, Drawer,
  Chip, Divider, Tooltip
} from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import MicIcon from '@mui/icons-material/Mic';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import ChatIcon from '@mui/icons-material/Chat';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SendIcon from '@mui/icons-material/Send';

import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';

// Use environment variable or fallback to localhost
const SOCKET_SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:8000';

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
  const [screenSharingUser, setScreenSharingUser] = useState(null); // {id, name}
  const [pinnedParticipant, setPinnedParticipant] = useState(null); // {id, name, photo, stream}
  const [screenShareNotification, setScreenShareNotification] = useState(null); // {message, type}
  const myVideo = useRef();
  const peersRef = useRef([]);
  const socketRef = useRef();
  const user = JSON.parse(localStorage.getItem('user')) || { name: 'You', profilePicture: '' };

  // ICE servers configuration


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
        setScreenSharingUser({ id: data.userId, name: data.userName });
        
        // Automatically pin the screen sharing user's video
        if (data.userId !== socket.id) {
          // Find the peer who is screen sharing
          const screenSharingPeer = peersRef.current.find(p => p.peerID === data.userId);
          if (screenSharingPeer) {
            setPinnedParticipant({
              id: data.userId,
              name: data.userName,
              photo: screenSharingPeer.photo,
              stream: screenSharingPeer.stream
            });
            console.log('📌 Automatically pinned screen sharing user:', data.userName);
          }
        }
        
        // Show notification
        setScreenShareNotification({
          message: `${data.userName} started screen sharing`,
          type: 'start'
        });
        
        // Auto-hide notification after 3 seconds
        setTimeout(() => {
          setScreenShareNotification(null);
        }, 3000);
        
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
        setScreenSharingUser(null);
        
        // Unpin the screen sharing user if they were pinned
        if (pinnedParticipant && pinnedParticipant.id === data.userId) {
          setPinnedParticipant(null);
          console.log('📌 Unpinned screen sharing user:', data.userName);
        }
        
        // Also clear local screen sharing state if it was us
        if (data.userId === socket.id) {
          setIsScreenSharing(false);
        }
        
        // Show notification
        setScreenShareNotification({
          message: 'Screen sharing stopped',
          type: 'stop'
        });
        
        // Auto-hide notification after 3 seconds
        setTimeout(() => {
          setScreenShareNotification(null);
        }, 3000);
        
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
      
      // Create peers for all users (excluding self)
      users.forEach(({ id, name, photo }) => {
        if (id === socket.id) {
          console.log('⏭️ Skipping self in peer creation:', id);
          return;
        }
        
        console.log('🔨 Creating peer for user:', id, name);
        try {
          const peer = createPeer(id, socket.id, currentStream, name, photo);
          const peerObj = { peerID: id, peer, name, photo };
          peersRef.current.push(peerObj);
          console.log('✅ Created peer for:', id);
        } catch (error) {
          console.error('❌ Error creating peer for', id, ':', error);
        }
      });
      
      // Update peers state
      setPeers([...peersRef.current]);
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
        
        // Update peers state
        setPeers([...peersRef.current]);
        
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
      if (item && item.peer && !item.peer.destroyed) {
        try {
          item.peer.signal(payload.signal);
          console.log('✅ Applied peer signal from:', payload.from);
        } catch (error) {
          console.error('❌ Error applying peer signal:', error);
        }
      } else {
        console.warn('⚠️ Peer not found or destroyed for signal from:', payload.from);
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
  // eslint-disable-next-line no-use-before-define
  }, [roomId, user.name, user.profilePicture, createPeer, addPeer, localStream, pinnedParticipant, screenStream]);

  const iceServers = useMemo(() => [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // Public TURN server for testing (replace with your own for production)
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ], []);

  // FIXED: Enhanced createPeer with deduplication protection
  const createPeer = useCallback((userToSignal, callerID, stream, name, photo) => {
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
      // Only remove peer if it's a critical error, not just connection issues
      if (err.message.includes('User-Initiated Abort') || err.message.includes('Close called')) {
        console.log('🔄 Peer connection closed normally for:', userToSignal);
        setPeers(prev => prev.filter(p => p.peerID !== userToSignal));
      }
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
      
      // Check if this is a screen sharing stream
      const videoTracks = remoteStream.getVideoTracks();
      let isScreenSharingStream = false;
      
      if (videoTracks.length > 0) {
        const videoTrack = videoTracks[0];
        console.log('📹 Video track settings:', videoTrack.getSettings());
        console.log('📹 Video track constraints:', videoTrack.getConstraints());
        
        // Check if this looks like a screen sharing track
        const settings = videoTrack.getSettings();
        if (settings.width > 1920 || settings.height > 1080) {
          console.log('🖥️ This appears to be a screen sharing stream (high resolution)');
          isScreenSharingStream = true;
        }
      }
      
      // Update peers state with the stream
      setPeers(prev => {
        // Remove any existing peer with same ID to prevent duplicates
        const filtered = prev.filter(p => p.peerID !== userToSignal);
        const newPeer = { 
          peerID: userToSignal, 
          peer, 
          name: name || 'Unknown', 
          photo: photo || '', 
          stream: remoteStream,
          isScreenSharing: isScreenSharingStream
        };
        const updated = [...filtered, newPeer];
        console.log('📊 Updated peers state:', updated.map(p => ({ id: p.peerID, name: p.name, hasStream: !!p.stream })));
        return updated;
      });
      
      // Also update peersRef to keep it in sync
      const existingIndex = peersRef.current.findIndex(p => p.peerID === userToSignal);
      if (existingIndex >= 0) {
        peersRef.current[existingIndex].stream = remoteStream;
        peersRef.current[existingIndex].name = name || 'Unknown';
        peersRef.current[existingIndex].photo = photo || '';
        peersRef.current[existingIndex].isScreenSharing = isScreenSharingStream;
      }
      
      // Automatically pin screen sharing streams
      if (isScreenSharingStream) {
        setPinnedParticipant({
          id: userToSignal,
          name: name || 'Unknown',
          photo: photo || '',
          stream: remoteStream
        });
        console.log('📌 Automatically pinned screen sharing stream from:', name);
      }
    });
    
    peer.on('iceStateChange', (state) => {
      console.log('🧊 ICE state changed for', userToSignal, ':', state);
    });
    
    return peer;
  }, [iceServers]);

  // FIXED: Enhanced addPeer with similar deduplication
  const addPeer = useCallback((incomingSignal, callerID, stream, name, photo) => {
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
      
      // Check if this is a screen sharing stream
      const videoTracks = remoteStream.getVideoTracks();
      let isScreenSharingStream = false;
      
      if (videoTracks.length > 0) {
        const videoTrack = videoTracks[0];
        console.log('📹 Video track settings:', videoTrack.getSettings());
        console.log('📹 Video track constraints:', videoTrack.getConstraints());
        
        // Check if this looks like a screen sharing track
        const settings = videoTrack.getSettings();
        if (settings.width > 1920 || settings.height > 1080) {
          console.log('🖥️ This appears to be a screen sharing stream (high resolution)');
          isScreenSharingStream = true;
        }
      }
      
      // Update peers state with the stream
      setPeers(prev => {
        // Remove any existing peer with same ID to prevent duplicates
        const filtered = prev.filter(p => p.peerID !== callerID);
        const newPeer = { 
          peerID: callerID, 
          peer, 
          name: name || 'Unknown', 
          photo: photo || '', 
          stream: remoteStream,
          isScreenSharing: isScreenSharingStream
        };
        const updated = [...filtered, newPeer];
        console.log('📊 Updated peers state for addPeer:', updated.map(p => ({ id: p.peerID, name: p.name, hasStream: !!p.stream })));
        return updated;
      });
      
      // Also update peersRef to keep it in sync
      const existingIndex = peersRef.current.findIndex(p => p.peerID === callerID);
      if (existingIndex >= 0) {
        peersRef.current[existingIndex].stream = remoteStream;
        peersRef.current[existingIndex].name = name || 'Unknown';
        peersRef.current[existingIndex].photo = photo || '';
        peersRef.current[existingIndex].isScreenSharing = isScreenSharingStream;
      }
      
      // Automatically pin screen sharing streams
      if (isScreenSharingStream) {
        setPinnedParticipant({
          id: callerID,
          name: name || 'Unknown',
          photo: photo || '',
          stream: remoteStream
        });
        console.log('📌 Automatically pinned screen sharing stream from:', name);
      }
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
  }, [iceServers]);

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
      
      // Replace video tracks in existing peers with camera stream
      await replaceVideoTracksInPeers(localStream);
      
    } else {
      // Start screen sharing
      try {
        // Automatically turn on camera if it's off when starting screen sharing
        if (!camOn && localStream) {
          const videoTrack = localStream.getVideoTracks()[0];
          if (videoTrack) {
            videoTrack.enabled = true;
            setCamOn(true);
            console.log('📹 Automatically turned on camera for screen sharing');
          }
        }
        
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: 'always',
            displaySurface: 'monitor'
          },
          audio: false // Most browsers don't support audio in screen sharing
        });
        
        // Create a new stream that combines screen video with camera audio
        const combinedStream = new MediaStream();
        
        // Add screen video track
        const screenVideoTrack = displayStream.getVideoTracks()[0];
        if (screenVideoTrack) {
          combinedStream.addTrack(screenVideoTrack);
          console.log('✅ Added screen video track to combined stream');
        }
        
        // Add camera audio track if available
        if (localStream) {
          const audioTrack = localStream.getAudioTracks()[0];
          if (audioTrack) {
            combinedStream.addTrack(audioTrack);
            console.log('✅ Added camera audio track to combined stream');
          }
        }
        
        console.log('📹 Combined stream tracks:', combinedStream.getTracks().map(t => `${t.kind}: ${t.enabled}`));
        
        setScreenStream(combinedStream);
        setIsScreenSharing(true);
        
        // Switch video to combined stream
        if (myVideo.current) {
          myVideo.current.srcObject = combinedStream;
        }
        
        // Notify other participants that screen sharing started
        socketRef.current.emit('screen-share-started', { 
          roomId, 
          userId: user.id || 'user',
          userName: user.name 
        });
        
        // Replace video tracks in existing peers with screen sharing stream
        await replaceVideoTracksInPeers(combinedStream);
        
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

  // Helper function to replace video tracks in existing peers
  const replaceVideoTracksInPeers = async (newStream) => {
    console.log('🔄 Replacing video tracks in peers with new stream');
    console.log('📹 New stream tracks:', newStream.getTracks().map(t => `${t.kind}: ${t.enabled}`));
    
    const currentPeers = [...peersRef.current];
    let successCount = 0;
    let failureCount = 0;
    
    for (const peerObj of currentPeers) {
      if (peerObj.peer && !peerObj.peer.destroyed) {
        try {
          // Get the video track from the new stream
          const videoTrack = newStream.getVideoTracks()[0];
          if (videoTrack) {
            console.log(`📹 Replacing video track for peer ${peerObj.peerID}`);
            
            // Get the current sender for video
            const senders = peerObj.peer.getSenders();
            const videoSender = senders.find(sender => 
              sender.track && sender.track.kind === 'video'
            );
            
            if (videoSender) {
              // Replace the video track
              await videoSender.replaceTrack(videoTrack);
              console.log(`✅ Successfully replaced video track for peer ${peerObj.peerID}`);
              successCount++;
            } else {
              console.warn(`⚠️ No video sender found for peer ${peerObj.peerID}`);
              failureCount++;
            }
          } else {
            console.warn('⚠️ No video track in new stream');
            failureCount++;
          }
        } catch (error) {
          console.error(`❌ Error replacing video track for peer ${peerObj.peerID}:`, error);
          failureCount++;
        }
      }
    }
    
    console.log(`📊 Track replacement results: ${successCount} success, ${failureCount} failures`);
    
    // If most replacements failed, fall back to recreating peers
    if (failureCount > successCount && currentPeers.length > 0) {
      console.log('🔄 Falling back to peer recreation due to track replacement failures');
      await recreatePeersWithStream(newStream);
    }
  };

  // Helper function to recreate peers with a new stream (fallback method)
  const recreatePeersWithStream = async (newStream) => {
    console.log('🔄 Recreating peers with new stream');
    console.log('📹 New stream tracks:', newStream.getTracks().map(t => `${t.kind}: ${t.enabled}`));
    
    const currentPeers = [...peersRef.current];
    
    // Store peer information
    const peerInfo = currentPeers.map(peerObj => ({
      peerID: peerObj.peerID,
      name: peerObj.name,
      photo: peerObj.photo
    }));
    
    // Destroy current peers
    currentPeers.forEach(peerObj => {
      if (peerObj.peer && !peerObj.peer.destroyed) {
        try {
          peerObj.peer.destroy();
        } catch (error) {
          console.warn('Error destroying peer:', error);
        }
      }
    });
    
    // Clear peers array
    peersRef.current = [];
    setPeers([]);
    
    // Wait a bit for cleanup
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Recreate peers with new stream
    for (const info of peerInfo) {
      try {
        const newPeer = createPeer(info.peerID, socketRef.current.id, newStream, info.name, info.photo);
        const peerObj = { peerID: info.peerID, peer: newPeer, name: info.name, photo: info.photo };
        peersRef.current.push(peerObj);
        console.log('✅ Recreated peer for:', info.peerID);
      } catch (error) {
        console.error('❌ Error recreating peer for:', info.peerID, error);
      }
    }
    
    // Update peers state
    setPeers([...peersRef.current]);
  };

  const handleRecording = () => {
    setIsRecording(!isRecording);
    // TODO: Implement recording functionality
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    // TODO: Show success notification
  };

  const handlePinParticipant = (participant) => {
    if (pinnedParticipant && pinnedParticipant.id === participant.id) {
      setPinnedParticipant(null); // Unpin
    } else {
      setPinnedParticipant(participant); // Pin
    }
  };

  const handleUnpin = () => {
    setPinnedParticipant(null);
  };

  // --- UI ---
  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100vh', 
      bgcolor: '#0f172a',
      '@keyframes slideDown': {
        '0%': {
          opacity: 0,
          transform: 'translateX(-50%) translateY(-20px)'
        },
        '100%': {
          opacity: 1,
          transform: 'translateX(-50%) translateY(0)'
        }
      }
    }}>
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
            {/* Main video stream - show pinned participant or user's video */}
            {pinnedParticipant ? (
              <PinnedParticipantVideo 
                participant={pinnedParticipant} 
                onUnpin={handleUnpin}
              />
            ) : (
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
            )}
            
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
              {screenSharingUser && (
                <Chip 
                  icon={<ScreenShareIcon />} 
                  label={`${screenSharingUser.name} SCREEN SHARING`}
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
            
            {/* Screen sharing notification */}
            {screenSharingUser && (
              <Box sx={{ 
                position: 'absolute', 
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)',
                zIndex: 10
              }}>
                <Paper 
                  sx={{ 
                    px: 3, 
                    py: 2, 
                    borderRadius: 3, 
                    background: 'rgba(16, 185, 129, 0.9)',
                    backdropFilter: 'blur(10px)',
                    color: 'white',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    boxShadow: '0 8px 32px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <ScreenShareIcon />
                  <Typography>
                    {screenSharingUser.name} is sharing their screen
                  </Typography>
                </Paper>
              </Box>
            )}
            
            {/* Temporary notification */}
            {screenShareNotification && (
              <Box sx={{ 
                position: 'absolute', 
                top: 20, 
                left: '50%', 
                transform: 'translateX(-50%)',
                zIndex: 20
              }}>
                <Paper 
                  sx={{ 
                    px: 3, 
                    py: 2, 
                    borderRadius: 3, 
                    background: screenShareNotification.type === 'start' 
                      ? 'rgba(16, 185, 129, 0.9)' 
                      : 'rgba(239, 68, 68, 0.9)',
                    backdropFilter: 'blur(10px)',
                    color: 'white',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    boxShadow: screenShareNotification.type === 'start'
                      ? '0 8px 32px rgba(16, 185, 129, 0.3)'
                      : '0 8px 32px rgba(239, 68, 68, 0.3)',
                    animation: 'slideDown 0.3s ease-out'
                  }}
                >
                  <ScreenShareIcon />
                  <Typography>
                    {screenShareNotification.message}
                  </Typography>
                </Paper>
              </Box>
            )}
            
            {/* Show participant name if pinned, otherwise show user name */}
            <Box sx={{ position: 'absolute', bottom: 16, left: 16 }}>
              <Paper 
                sx={{ 
                  px: 2, 
                  py: 1, 
                  borderRadius: 3, 
                  background: 'rgba(0, 0, 0, 0.7)',
                  backdropFilter: 'blur(10px)',
                  color: 'white',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                {pinnedParticipant ? (
                  <>
                    {pinnedParticipant.id !== 'local' && screenSharingUser && screenSharingUser.id === pinnedParticipant.id && (
                      <ScreenShareIcon sx={{ fontSize: 16, color: '#10b981' }} />
                    )}
                    {pinnedParticipant.name}
                  </>
                ) : (
                  <>
                    {isScreenSharing && <ScreenShareIcon sx={{ fontSize: 16, color: '#10b981' }} />}
                    {user.name}
                  </>
                )}
              </Paper>
            </Box>
          </Paper>
          
          {/* Participant Gallery */}
          <Box sx={{ width: '100%', maxWidth: 1000, mb: 4 }}>
            <Typography variant="h6" sx={{ color: 'white', mb: 2, fontWeight: 600 }}>
              Participants ({peers.length + 1})
            </Typography>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 2 }}>
              {/* User's video */}
              <UserVideo 
                stream={localStream} 
                name={user.name} 
                photo={user.profilePicture} 
                isPinned={false}
                onPin={() => handlePinParticipant({ id: 'local', name: user.name, photo: user.profilePicture, stream: localStream })}
              />
              {/* Other participants */}
              {peers.map((peerObj, i) => (
                <PeerVideo 
                  key={peerObj.peerID} 
                  stream={peerObj.stream} 
                  name={peerObj.name} 
                  photo={peerObj.photo} 
                  id={peerObj.peerID}
                  isPinned={pinnedParticipant && pinnedParticipant.id === peerObj.peerID}
                  isScreenSharing={peerObj.isScreenSharing || (screenSharingUser && screenSharingUser.id === peerObj.peerID)}
                  onPin={() => handlePinParticipant({ id: peerObj.peerID, name: peerObj.name, photo: peerObj.photo, stream: peerObj.stream })}
                />
              ))}
            </Stack>
          </Box>
          
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
              
                            {isScreenSharingAvailable ? (
                <Tooltip title={isScreenSharing ? 'Stop Screen Sharing' : 'Start Screen Sharing'}>
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
                </Tooltip>
              ) : (
                <Tooltip title="Screen sharing not supported">
                  <span>
                    <IconButton 
                      size="large" 
                      disabled
                      sx={{ 
                        bgcolor: 'rgba(107, 114, 128, 0.2)', 
                        color: '#6b7280',
                        width: 56,
                        height: 56,
                        '&:disabled': {
                          bgcolor: 'rgba(107, 114, 128, 0.2)',
                          color: '#6b7280'
                        }
                      }} 
                    >
                      <ScreenShareIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
              
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
                
                <Box flex={1}>
                  <Typography fontWeight={600} sx={{ color: 'white' }}>
                    {p.name}
                  </Typography>
                  {screenSharingUser && screenSharingUser.id === p.id && (
                    <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 600 }}>
                      Screen Sharing
                    </Typography>
                  )}
                </Box>
                
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
                  
                  {screenSharingUser && screenSharingUser.id === p.id && (
                    <IconButton 
                      size="small" 
                      sx={{ 
                        color: '#10b981',
                        bgcolor: 'rgba(16, 185, 129, 0.2)',
                        '&:hover': {
                          bgcolor: 'rgba(16, 185, 129, 0.3)'
                        }
                      }}
                    >
                      <ScreenShareIcon fontSize="small" />
                    </IconButton>
                  )}
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

// Enhanced PeerVideo component with pinning functionality
function PeerVideo({ stream, name, photo, id, isPinned, isScreenSharing, onPin }) {
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
        
        // Add more detailed event listeners for debugging
        videoRef.current.oncanplay = () => {
          console.log('🎬 Video can play for:', name);
        };
        
        videoRef.current.onplaying = () => {
          console.log('▶️ Video is playing for:', name);
        };
        
        videoRef.current.onwaiting = () => {
          console.log('⏳ Video is waiting for:', name);
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
      border: isPinned ? '2px solid #667eea' : '2px solid rgba(255, 255, 255, 0.2)',
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
      
      {/* Pin button */}
      <IconButton
        onClick={onPin}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          bgcolor: 'rgba(0, 0, 0, 0.7)',
          color: isPinned ? '#667eea' : 'white',
          width: 32,
          height: 32,
          '&:hover': {
            bgcolor: 'rgba(0, 0, 0, 0.8)',
          }
        }}
      >
        {isPinned ? <PushPinIcon fontSize="small" /> : <PushPinOutlinedIcon fontSize="small" />}
      </IconButton>
      
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
        <Stack direction="row" spacing={0.5} alignItems="center">
          {isScreenSharing && (
            <ScreenShareIcon 
              sx={{ 
                fontSize: 12, 
                color: '#10b981' 
              }} 
            />
          )}
          <Box sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: videoError ? '#ef4444' : '#10b981'
          }} />
        </Stack>
      </Box>
    </Box>
  );
}

// User video component for the participant gallery
function UserVideo({ stream, name, photo, isPinned, onPin }) {
  const videoRef = useRef();

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <Box sx={{ 
      position: 'relative', 
      borderRadius: 3, 
      overflow: 'hidden', 
      border: isPinned ? '2px solid #667eea' : '2px solid rgba(255, 255, 255, 0.2)',
      bgcolor: '#1e293b'
    }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={true} // Mute local video
        style={{
          width: 200,
          height: 150,
          objectFit: 'cover',
          background: '#1e293b'
        }}
      />
      
      {/* Pin button */}
      <IconButton
        onClick={onPin}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          bgcolor: 'rgba(0, 0, 0, 0.7)',
          color: isPinned ? '#667eea' : 'white',
          width: 32,
          height: 32,
          '&:hover': {
            bgcolor: 'rgba(0, 0, 0, 0.8)',
          }
        }}
      >
        {isPinned ? <PushPinIcon fontSize="small" /> : <PushPinOutlinedIcon fontSize="small" />}
      </IconButton>
      
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
          {name} (You)
        </Typography>
        <Box sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: '#10b981'
        }} />
      </Box>
    </Box>
  );
}

// Pinned participant video component for main display
function PinnedParticipantVideo({ participant, onUnpin }) {
  const videoRef = useRef();

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={participant.id === 'local'} // Mute if it's local video
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          background: '#1e293b'
        }}
      />
      
      {/* Unpin button */}
      <IconButton
        onClick={onUnpin}
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          bgcolor: 'rgba(0, 0, 0, 0.7)',
          color: '#667eea',
          width: 40,
          height: 40,
          '&:hover': {
            bgcolor: 'rgba(0, 0, 0, 0.8)',
          }
        }}
      >
        <PushPinIcon />
      </IconButton>
    </>
  );
} 