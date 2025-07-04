import React, { useState, useEffect } from 'react';
import {
  AppBar, Toolbar, Typography, Button, Box, Container, Avatar, Paper, Grid, Stack, IconButton,
  Alert, Snackbar, CircularProgress
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
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ACCENT = '#e4572e';
const CARD_BG = '#fafbfc';
const MAIN_BG = '#f4f4f7';
const TEXT_DARK = '#222';
const TEXT_GRAY = '#888';
const BORDER = '#ececec';
const PURPLE = '#726bfa';

const actionCardStyles = [
  { bg: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)', iconColor: '#fff' }, // red
  { bg: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)', iconColor: '#fff' }, // blue
  { bg: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', iconColor: '#fff' }, // purple
  { bg: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)', iconColor: '#fff' }, // green
];

const actions = [
  {
    icon: VideoCameraFrontIcon, title: 'Create Meeting', desc: 'Start an instant video conference',
  },
  {
    icon: LinkIcon, title: 'Join Room', desc: 'Enter a meeting with room ID',
  },
  {
    icon: SmartToyIcon, title: 'Ask AI Assistant', desc: 'Get help with meeting tasks',
  },
  {
    icon: EventIcon, title: 'Schedule Meeting', desc: 'Plan future conferences',
  },
];

// Placeholder for recent meetings - will be replaced with real data
const recentMeetings = [
  { title: 'Team Standup', room: 'echo-team-001', time: 'Yesterday, 10:30 AM' },
  { title: 'Client Presentation', room: 'echo-client-042', time: 'Dec 28, 2:15 PM' },
  { title: 'Product Review', room: 'echo-prod-123', time: 'Dec 27, 4:00 PM' },
];

const sharedFiles = [
  { name: 'Q4_Presentation.pdf', date: 'Dec 28, 2024', icon: <DescriptionIcon sx={{ color: ACCENT }} /> },
  { name: 'Meeting_Notes.docx', date: 'Dec 27, 2024', icon: <InsertDriveFileIcon sx={{ color: '#3b82f6' }} /> },
  { name: 'Budget_Analysis.xlsx', date: 'Dec 26, 2024', icon: <FolderIcon sx={{ color: '#22c55e' }} /> },
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
    <Box sx={{ minHeight: '100vh', bgcolor: MAIN_BG, p: { xs: 0, md: 3 } }}>
      {/* Navbar */}
      <AppBar position="static" elevation={0} sx={{ bgcolor: '#fff', color: TEXT_DARK, borderRadius: 2, boxShadow: '0 2px 8px 0 rgba(60,60,60,0.04)', mb: 4, px: 0 }}>
        <Toolbar sx={{ px: { xs: 1, md: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Box sx={{ bgcolor: 'linear-gradient(135deg, #a78bfa 0%, #6366f1 100%)', color: 'white', borderRadius: 2, p: 1.2, mr: 2, boxShadow: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <VideoCameraFrontIcon sx={{ color: '#fff' }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: TEXT_DARK }}>
              EchoRoom
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar src={user.photo} sx={{ bgcolor: '#f4f4f7', color: '#6366f1', width: 40, height: 40, fontWeight: 700, fontSize: 18 }}>
              {!user.photo && user.name ? user.name.split(' ').map(n => n[0]).join('') : ''}
            </Avatar>
            <Button variant="outlined" sx={{ color: TEXT_DARK, borderColor: BORDER, fontWeight: 600, borderRadius: 2, px: 2.5, py: 1, letterSpacing: 1, bgcolor: '#fff', '&:hover': { bgcolor: '#f3f4f6', color: '#6366f1', borderColor: '#6366f1' } }} onClick={logout}>
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Card */}
      <Container maxWidth={false} disableGutters sx={{ display: 'flex', justifyContent: 'center', mb: 6 }}>
        <Box sx={{ width: '100%', maxWidth: 1200 }}>
          <Paper elevation={0} sx={{ borderRadius: 4, p: { xs: 2, sm: 5 }, background: '#fff', boxShadow: '0 2px 16px 0 rgba(60,60,60,0.06)', border: `1.5px solid ${BORDER}` }}>
            {/* Welcome Section */}
            <Typography variant="h3" sx={{ fontWeight: 800, color: TEXT_DARK, mb: 0.5, fontSize: { xs: 28, sm: 36 } }}>
              Welcome back, {user.name.split(' ')[0] || 'User'}!
            </Typography>
            <Typography variant="subtitle1" sx={{ color: TEXT_GRAY, mb: 4, fontWeight: 500, fontSize: 18 }}>{user.email}</Typography>

            {/* Main Actions: 4 in a row, colored icons, with animation */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
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
                      transition={{ delay: i * 0.12, duration: 0.5, type: 'spring' }}
                      whileHover={{ scale: 1.05, boxShadow: '0 8px 32px 0 rgba(60,60,60,0.10)' }}
                      style={{ height: '100%', cursor: isCreateMeeting || isJoinRoom || isScheduleMeeting ? 'pointer' : 'default' }}
                      onClick={isCreateMeeting ? handleCreateMeeting : isJoinRoom ? handleJoinRoom : isScheduleMeeting ? handleScheduleMeeting : undefined}
                    >
                      <Paper elevation={0} sx={{ p: 4, borderRadius: 3, background: CARD_BG, border: `1.5px solid ${BORDER}`, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 170, transition: 'box-shadow 0.3s' }}>
                        <Box sx={{ mb: 2, width: 48, height: 48, borderRadius: 2, background: style.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px 0 rgba(60,60,60,0.08)' }}>
                          <Icon sx={{ color: style.iconColor, fontSize: 28 }} />
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: TEXT_DARK, mb: 0.5 }}>{action.title}</Typography>
                        <Typography variant="body2" sx={{ color: TEXT_GRAY, fontWeight: 500 }}>{action.desc}</Typography>
                      </Paper>
                    </motion.div>
                  </Grid>
                );
              })}
            </Grid>

            {/* Scheduled Meetings Section Card */}
            <Paper elevation={0} sx={{ borderRadius: 3, p: 3, background: CARD_BG, border: `1.5px solid ${BORDER}`, mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <EventIcon sx={{ color: TEXT_DARK, mr: 1 }} />
                  <Typography variant="h6" sx={{ color: TEXT_DARK, fontWeight: 700, fontSize: 20 }}>
                    Scheduled Meetings
                  </Typography>
                </Box>
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={handleScheduleMeeting}
                  sx={{ 
                    color: PURPLE, 
                    borderColor: PURPLE, 
                    borderRadius: 2, 
                    fontWeight: 600, 
                    textTransform: 'none',
                    '&:hover': { bgcolor: PURPLE, color: 'white' }
                  }}
                >
                  + Schedule New
                </Button>
              </Box>
              
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : scheduledMeetings.length > 0 ? (
                <Grid container spacing={2}>
                  {scheduledMeetings.slice(0, 3).map((meeting) => (
                    <Grid item xs={12} sm={4} key={meeting._id}>
                      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, background: '#fff', border: `1.5px solid ${BORDER}`, height: '100%' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: TEXT_DARK, mb: 0.5 }}>
                          {meeting.topic}
                        </Typography>
                        <Typography variant="body2" sx={{ color: TEXT_GRAY, fontWeight: 500 }}>
                          Meeting ID: {meeting.meetingId}
                        </Typography>
                        <Typography variant="body2" sx={{ color: TEXT_GRAY, mb: 1, fontWeight: 500 }}>
                          {new Date(meeting.scheduledDate).toLocaleDateString()} at {new Date(meeting.scheduledDate).toLocaleTimeString()}
                        </Typography>
                        <Typography variant="body2" sx={{ color: TEXT_GRAY, mb: 1, fontWeight: 500 }}>
                          Duration: {meeting.duration}
                        </Typography>
                        <Button 
                          variant="contained" 
                          size="small" 
                          sx={{ 
                            bgcolor: PURPLE, 
                            color: 'white', 
                            borderRadius: 2, 
                            fontWeight: 700, 
                            textTransform: 'none', 
                            boxShadow: 0, 
                            px: 2.5, 
                            '&:hover': { bgcolor: '#5a53c2' } 
                          }}
                          onClick={() => navigate(`/room/${meeting.meetingId}`)}
                        >
                          Join Meeting
                        </Button>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" sx={{ color: TEXT_GRAY, mb: 2 }}>
                    No scheduled meetings yet
                  </Typography>
                  <Button 
                    variant="contained" 
                    onClick={handleScheduleMeeting}
                    sx={{ 
                      bgcolor: PURPLE, 
                      color: 'white', 
                      borderRadius: 2, 
                      fontWeight: 600,
                      '&:hover': { bgcolor: '#5a53c2' }
                    }}
                  >
                    Schedule Your First Meeting
                  </Button>
                </Box>
              )}
            </Paper>

            {/* Shared Files Section Card */}
            <Paper elevation={0} sx={{ borderRadius: 3, p: 3, background: CARD_BG, border: `1.5px solid ${BORDER}` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <FolderIcon sx={{ color: TEXT_DARK, mr: 1 }} />
                <Typography variant="h6" sx={{ color: TEXT_DARK, fontWeight: 700, fontSize: 20 }}>
                  Shared Files
                </Typography>
              </Box>
              <Stack spacing={2}>
                {sharedFiles.map((file, i) => (
                  <Paper key={file.name} elevation={0} sx={{ p: 2, borderRadius: 3, background: '#fff', border: `1.5px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {file.icon}
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: TEXT_DARK }}>{file.name}</Typography>
                        <Typography variant="caption" sx={{ color: TEXT_GRAY, fontWeight: 500 }}>Uploaded {file.date}</Typography>
                      </Box>
                    </Box>
                    <Button variant="outlined" size="small" sx={{ color: TEXT_DARK, borderColor: BORDER, borderRadius: 2, fontWeight: 700, px: 2.5, textTransform: 'none', bgcolor: '#f8f8fa', '&:hover': { bgcolor: '#ececec', borderColor: ACCENT, color: ACCENT } }} startIcon={<DownloadIcon />}>
                      Download
                    </Button>
                  </Paper>
                ))}
              </Stack>
            </Paper>
          </Paper>
        </Box>
      </Container>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
