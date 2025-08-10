import React, { useState, useEffect } from 'react';
import {
  AppBar, Toolbar, Typography, Button, Box, Container, Avatar, Paper, Grid, Stack, IconButton,
  Alert, Snackbar, Chip, Tooltip, Tabs, Tab
} from '@mui/material';
import VideoCameraFrontIcon from '@mui/icons-material/VideoCameraFront';
import LinkIcon from '@mui/icons-material/Link';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import EventIcon from '@mui/icons-material/Event';
import HomeIcon from '@mui/icons-material/Home';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';

import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon from '@mui/icons-material/Settings';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from './utils/api';
import { getToken, isTokenExpired, removeToken } from './utils/auth';
import RoomList from './components/RoomList';
import CreateRoom from './components/CreateRoom';

const ACCENT = '#667eea';
const CARD_BG = '#ffffff';
const MAIN_BG = '#f8fafc';
const TEXT_DARK = '#1e293b';
const TEXT_GRAY = '#64748b';
const BORDER = '#e2e8f0';

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





export default function Dashboard() {
  const navigate = useNavigate();
  const [scheduledMeetings, setScheduledMeetings] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [activeTab, setActiveTab] = useState(0);
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  
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
    removeToken();
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

  // Handle joining a meeting
  const handleJoinMeeting = (meeting) => {
    if (meeting.meetingId) {
      navigate(`/room/${meeting.meetingId}`);
    }
  };

  // Handle deleting a meeting
  const handleDeleteMeeting = async (meeting) => {
    if (window.confirm(`Are you sure you want to delete "${meeting.topic}"?`)) {
      try {
        await api.delete(`/meetings/${meeting._id}`);
        showSnackbar('Meeting deleted successfully', 'success');
        fetchScheduledMeetings(); // Refresh the list
      } catch (err) {
        console.error('Error deleting meeting:', err);
        const errorMessage = err.response?.data?.msg || 'Failed to delete meeting';
        showSnackbar(errorMessage, 'error');
      }
    }
  };

  // Format meeting date for display
  const formatMeetingDate = (scheduledDate) => {
    const meetingDate = new Date(scheduledDate);
    const now = new Date();
    const isPast = meetingDate < now;
    const isToday = meetingDate.toDateString() === now.toDateString();
    const isTomorrow = meetingDate.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
    
    let dateStr;
    if (isToday) {
      dateStr = 'Today';
    } else if (isTomorrow) {
      dateStr = 'Tomorrow';
    } else {
      dateStr = meetingDate.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
    
    const timeStr = meetingDate.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    return { dateStr, timeStr, isPast, isToday };
  };

  // Fetch scheduled meetings
  const fetchScheduledMeetings = async () => {
    try {
      const token = getToken();
      if (!token) return;
      
      if (isTokenExpired(token)) {
        removeToken();
        window.location.href = '/auth';
        return;
      }

      const response = await api.get('/meetings');
      setScheduledMeetings(response.data);
    } catch (err) {
      console.error('Error fetching meetings:', err);
      if (err.response?.data?.msg?.includes('Invalid or expired token')) {
        removeToken();
        window.location.href = '/auth';
      }
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip label={`${scheduledMeetings.length} meetings`} size="small" sx={{ bgcolor: 'rgba(102, 126, 234, 0.1)', color: ACCENT }} />
                <IconButton 
                  size="small" 
                  onClick={fetchScheduledMeetings}
                  sx={{ 
                    color: TEXT_GRAY,
                    '&:hover': { 
                      color: ACCENT,
                      bgcolor: 'rgba(102, 126, 234, 0.1)' 
                    }
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </Box>
            </Box>
            <Stack spacing={2}>
              {scheduledMeetings.length === 0 ? (
                <Box sx={{ 
                  p: 4, 
                  textAlign: 'center', 
                  color: TEXT_GRAY,
                  border: '2px dashed rgba(226, 232, 240, 0.8)',
                  borderRadius: 3
                }}>
                  <EventIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                    No scheduled meetings
                  </Typography>
                  <Typography variant="body2">
                    Create your first meeting to get started
                  </Typography>
                </Box>
              ) : (
                scheduledMeetings.map((meeting, i) => {
                  // Format the scheduled date
                  const { dateStr, timeStr, isPast } = formatMeetingDate(meeting.scheduledDate);
                  
                  // Determine status
                  let status = meeting.status;
                  let statusColor = '#667eea';
                  let statusBg = 'rgba(102, 126, 234, 0.1)';
                  
                  if (isPast && status === 'scheduled') {
                    status = 'missed';
                    statusColor = '#ef4444';
                    statusBg = 'rgba(239, 68, 68, 0.1)';
                  } else if (status === 'completed') {
                    statusColor = '#10b981';
                    statusBg = 'rgba(16, 185, 129, 0.1)';
                  } else if (status === 'ongoing') {
                    statusColor = '#f59e0b';
                    statusBg = 'rgba(245, 158, 11, 0.1)';
                  }
                  
                  return (
                    <Box 
                      key={meeting._id || i} 
                      sx={{ 
                        p: 3, 
                        borderRadius: 3, 
                        bgcolor: 'rgba(248, 250, 252, 0.8)',
                        border: '1px solid rgba(226, 232, 240, 0.6)',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: 'rgba(102, 126, 234, 0.05)',
                          borderColor: ACCENT,
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)'
                        }
                      }}
                      onClick={() => {
                        // Navigate to meeting room or show meeting details
                        if (status === 'scheduled' && !isPast) {
                          navigate(`/room/${meeting.meetingId}`);
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography fontWeight={700} color={TEXT_DARK} sx={{ mb: 1, fontSize: 16 }}>
                            {meeting.topic}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                            <Typography variant="body2" color={TEXT_GRAY} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <EventIcon sx={{ fontSize: 14 }} />
                              {dateStr} at {timeStr}
                            </Typography>
                            <Typography variant="body2" color={TEXT_GRAY}>
                              • {meeting.duration}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="body2" color={TEXT_GRAY} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              👤 {meeting.host}
                            </Typography>
                            {meeting.participants && meeting.participants.length > 0 && (
                              <Typography variant="body2" color={TEXT_GRAY}>
                                • {meeting.participants.length} participants
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                          <Chip 
                            label={status} 
                            size="small" 
                            sx={{ 
                              bgcolor: statusBg,
                              color: statusColor,
                              fontWeight: 600,
                              textTransform: 'capitalize'
                            }} 
                          />
                          {meeting.meetingId && (
                            <Typography variant="caption" color={TEXT_GRAY} sx={{ fontFamily: 'monospace' }}>
                              ID: {meeting.meetingId}
                            </Typography>
                          )}
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {status === 'scheduled' && !isPast && (
                              <Button
                                variant="contained"
                                size="small"
                                sx={{
                                  bgcolor: ACCENT,
                                  color: 'white',
                                  borderRadius: 2,
                                  px: 2,
                                  py: 0.5,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  textTransform: 'none',
                                  '&:hover': {
                                    bgcolor: '#5a53c2'
                                  }
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleJoinMeeting(meeting);
                                }}
                              >
                                Join
                              </Button>
                            )}
                            <Tooltip title="Delete meeting">
                              <IconButton
                                size="small"
                                sx={{
                                  color: '#ef4444',
                                  bgcolor: 'rgba(239, 68, 68, 0.1)',
                                  '&:hover': {
                                    bgcolor: 'rgba(239, 68, 68, 0.2)',
                                    color: '#dc2626'
                                  }
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteMeeting(meeting);
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  );
                })
              )}
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
