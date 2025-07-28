import React, { useState, useEffect } from 'react';
import {
  AppBar, Toolbar, Typography, Button, Box, Container, Avatar, Paper, Grid, Stack, IconButton,
  Alert, Snackbar, CircularProgress, Chip, Divider
} from '@mui/material';
import VideoCameraFrontIcon from '@mui/icons-material/VideoCameraFront';
import LinkIcon from '@mui/icons-material/Link';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import EventIcon from '@mui/icons-material/Event';
import NotesIcon from '@mui/icons-material/Notes';
import FolderIcon from '@mui/icons-material/Folder';
import DescriptionIcon from '@mui/icons-material/Description';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DownloadIcon from '@mui/icons-material/Download';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon from '@mui/icons-material/Settings';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ACCENT = '#667eea';
const CARD_BG = '#ffffff';
const MAIN_BG = '#f8fafc';
const TEXT_DARK = '#1e293b';
const TEXT_GRAY = '#64748b';
const BORDER = '#e2e8f0';
const PURPLE = '#667eea';

const actionCardStyles = [
  { 
    bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 
    iconColor: '#fff',
    shadow: '0 10px 25px rgba(239, 68, 68, 0.3)'
  },
  { 
    bg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
    iconColor: '#fff',
    shadow: '0 10px 25px rgba(59, 130, 246, 0.3)'
  },
  { 
    bg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', 
    iconColor: '#fff',
    shadow: '0 10px 25px rgba(139, 92, 246, 0.3)'
  },
  { 
    bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
    iconColor: '#fff',
    shadow: '0 10px 25px rgba(16, 185, 129, 0.3)'
  },
];

const actions = [
  {
    icon: VideoCameraFrontIcon, 
    title: 'Create Meeting', 
    desc: 'Start an instant video conference',
    color: '#ef4444'
  },
  {
    icon: LinkIcon, 
    title: 'Join Room', 
    desc: 'Enter a meeting with room ID',
    color: '#3b82f6'
  },
  {
    icon: SmartToyIcon, 
    title: 'AI Assistant', 
    desc: 'Get help with meeting tasks',
    color: '#8b5cf6'
  },
  {
    icon: EventIcon, 
    title: 'Schedule Meeting', 
    desc: 'Plan future conferences',
    color: '#10b981'
  },
];

// Placeholder for recent meetings - will be replaced with real data
const recentMeetings = [
  { title: 'Team Standup', room: 'echo-team-001', time: 'Yesterday, 10:30 AM', status: 'completed' },
  { title: 'Client Presentation', room: 'echo-client-042', time: 'Dec 28, 2:15 PM', status: 'completed' },
  { title: 'Product Review', room: 'echo-prod-123', time: 'Dec 27, 4:00 PM', status: 'completed' },
];

const sharedFiles = [
  { name: 'Q4_Presentation.pdf', date: 'Dec 28, 2024', icon: <DescriptionIcon sx={{ color: ACCENT }} />, size: '2.4 MB' },
  { name: 'Meeting_Notes.docx', date: 'Dec 27, 2024', icon: <InsertDriveFileIcon sx={{ color: '#3b82f6' }} />, size: '1.2 MB' },
  { name: 'Budget_Analysis.xlsx', date: 'Dec 26, 2024', icon: <FolderIcon sx={{ color: '#22c55e' }} />, size: '3.8 MB' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [scheduledMeetings, setScheduledMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Extract user info from localStorage
  let user = { name: '', email: '', photo: '' };
  try {
    const stored = JSON.parse(localStorage.getItem('user'));
    if (stored) {
      user = {
        name: stored.name || '',
        email: stored.email || '',
        photo: stored.profilePicture || '',
      };
    }
  } catch (e) {}

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/auth';
  };

  // Generate a random room ID
  const generateRoomId = () => Math.random().toString(36).substring(2, 10);

  // Handle Create Meeting click
  const handleCreateMeeting = () => {
    const roomId = generateRoomId();
    navigate(`/room/${roomId}`);
  };

  // Handle Join Room click
  const handleJoinRoom = () => {
    const roomId = window.prompt('Enter Room ID to join:');
    if (roomId && roomId.trim()) {
      navigate(`/room/${roomId.trim()}`);
    }
  };

  // Handle Schedule Meeting click
  const handleScheduleMeeting = () => {
    navigate('/schedule');
  };

  // Fetch scheduled meetings
  const fetchScheduledMeetings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get('http://localhost:8000/api/meetings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setScheduledMeetings(response.data);
    } catch (err) {
      console.error('Error fetching meetings:', err);
    }
  };

  // Show snackbar notification
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // Load scheduled meetings on component mount
  useEffect(() => {
    fetchScheduledMeetings();
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: MAIN_BG }}>
      {/* Navbar */}
      <AppBar 
        position="static" 
        elevation={0} 
        sx={{ 
          bgcolor: 'rgba(255, 255, 255, 0.95)', 
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
          color: TEXT_DARK 
        }}
      >
        <Toolbar sx={{ px: { xs: 2, md: 4 }, py: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Box 
              sx={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                color: 'white', 
                borderRadius: 3, 
                p: 1.5, 
                mr: 2, 
                boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}
            >
              <VideoCameraFrontIcon sx={{ color: '#fff', fontSize: 28 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              EchoRoom
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton sx={{ color: TEXT_GRAY }}>
              <NotificationsIcon />
            </IconButton>
            <IconButton sx={{ color: TEXT_GRAY }}>
              <SettingsIcon />
            </IconButton>
            <Avatar 
              src={user.photo} 
              sx={{ 
                bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                color: '#fff', 
                width: 44, 
                height: 44, 
                fontWeight: 700, 
                fontSize: 18,
                border: '2px solid rgba(102, 126, 234, 0.2)'
              }}
            >
              {!user.photo && user.name ? user.name.split(' ').map(n => n[0]).join('') : ''}
            </Avatar>
            <Button 
              variant="outlined" 
              sx={{ 
                color: TEXT_DARK, 
                borderColor: BORDER, 
                fontWeight: 600, 
                borderRadius: 3, 
                px: 3, 
                py: 1, 
                textTransform: 'none',
                fontSize: 14,
                '&:hover': { 
                  bgcolor: '#f1f5f9', 
                  color: ACCENT, 
                  borderColor: ACCENT 
                } 
              }} 
              onClick={logout}
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
        <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
          {/* Welcome Section */}
          <Box sx={{ mb: 6 }}>
            <Typography 
              variant="h2" 
              sx={{ 
                fontWeight: 900, 
                color: TEXT_DARK, 
                mb: 1, 
                fontSize: { xs: 32, sm: 48 },
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Welcome back, {user.name.split(' ')[0] || 'User'}! 👋
            </Typography>
            <Typography variant="h6" sx={{ color: TEXT_GRAY, fontWeight: 500, fontSize: 18 }}>
              {user.email}
            </Typography>
          </Box>

          {/* Main Actions */}
          <Grid container spacing={3} sx={{ mb: 6 }}>
            {actions.map((action, i) => {
              const Icon = action.icon;
              const style = actionCardStyles[i];
              const isCreateMeeting = i === 0;
              const isJoinRoom = i === 1;
              const isScheduleMeeting = i === 3;
              return (
                <Grid item xs={12} sm={6} md={3} key={action.title}>
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.6, type: 'spring' }}
                    whileHover={{ 
                      scale: 1.02, 
                      y: -8,
                      transition: { duration: 0.2 }
                    }}
                    style={{ height: '100%', cursor: isCreateMeeting || isJoinRoom || isScheduleMeeting ? 'pointer' : 'default' }}
                    onClick={isCreateMeeting ? handleCreateMeeting : isJoinRoom ? handleJoinRoom : isScheduleMeeting ? handleScheduleMeeting : undefined}
                  >
                    <Paper 
                      elevation={0} 
                      sx={{ 
                        p: 4, 
                        borderRadius: 4, 
                        background: CARD_BG, 
                        border: '1px solid rgba(226, 232, 240, 0.8)', 
                        textAlign: 'center', 
                        height: '100%', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        minHeight: 200,
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        '&:hover': {
                          boxShadow: style.shadow,
                          transform: 'translateY(-4px)',
                        }
                      }}
                    >
                      <Box 
                        sx={{ 
                          mb: 3, 
                          width: 64, 
                          height: 64, 
                          borderRadius: 3, 
                          background: style.bg, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          boxShadow: style.shadow,
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <Icon sx={{ color: style.iconColor, fontSize: 32 }} />
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: TEXT_DARK, mb: 1, fontSize: 18 }}>
                        {action.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: TEXT_GRAY, fontWeight: 500, lineHeight: 1.6 }}>
                        {action.desc}
                      </Typography>
                    </Paper>
                  </motion.div>
                </Grid>
              );
            })}
          </Grid>

          {/* Scheduled Meetings */}
          <Paper 
            elevation={0} 
            sx={{ 
              p: 4, 
              borderRadius: 4, 
              background: CARD_BG,
              border: '1px solid rgba(226, 232, 240, 0.8)',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: TEXT_DARK }}>
                Scheduled Meetings
              </Typography>
              <Chip label={`${scheduledMeetings.length} meetings`} size="small" sx={{ bgcolor: 'rgba(102, 126, 234, 0.1)', color: ACCENT }} />
            </Box>
            <Stack spacing={2}>
              {scheduledMeetings.map((meeting, i) => (
                <Box 
                  key={i} 
                  sx={{ 
                    p: 2, 
                    borderRadius: 3, 
                    bgcolor: 'rgba(248, 250, 252, 0.8)',
                    border: '1px solid rgba(226, 232, 240, 0.6)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: 'rgba(102, 126, 234, 0.05)',
                      borderColor: ACCENT
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography fontWeight={600} color={TEXT_DARK}>
                        {meeting.title}
                      </Typography>
                      <Typography variant="body2" color={TEXT_GRAY}>
                        {meeting.time}
                      </Typography>
                    </Box>
                    <Chip 
                      label={meeting.status} 
                      size="small" 
                      sx={{ 
                        bgcolor: meeting.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(102, 126, 234, 0.1)',
                        color: meeting.status === 'completed' ? '#10b981' : ACCENT
                      }} 
                    />
                  </Box>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Box>
      </Container>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ borderRadius: 3 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
