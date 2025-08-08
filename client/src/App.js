import React, { useState, useEffect } from 'react';
import Register from './Register';
import Login from './Login';
import Dashboard from './Dashboard';
import RoomPage from './RoomPage';
import ScheduleMeeting from './components/ScheduleMeeting';
import { Container, Box, Typography, Paper, Tabs, Tab } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { GOOGLE_CLIENT_ID } from './config/googleOAuth';

function AuthTabs() {
  // Remember last selected tab using localStorage
  const getInitialTab = () => {
    const savedTab = localStorage.getItem('authTab');
    return savedTab !== null ? Number(savedTab) : 1;
  };
  const [tab, setTab] = useState(getInitialTab);

  useEffect(() => {
    localStorage.setItem('authTab', tab);
  }, [tab]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          opacity: 0.3,
        }
      }}
    >
      <Container maxWidth="sm" sx={{ mt: 8, position: 'relative', zIndex: 1 }}>
        <Paper
          elevation={24}
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 6,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
            }
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 3,
                boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)',
              }}
            >
              <Typography variant="h3" sx={{ color: 'white', fontWeight: 700 }}>
                📹
              </Typography>
            </Box>
            <Typography 
              variant="h3" 
              align="center" 
              gutterBottom 
              sx={{ 
                fontWeight: 800,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1
              }}
            >
              EchoRoom
            </Typography>
            <Typography variant="body1" color="text.secondary" align="center" sx={{ fontWeight: 500 }}>
              Secure video conferencing for modern teams
            </Typography>
          </Box>

          <Tabs
            value={tab}
            onChange={(_, newValue) => setTab(newValue)}
            variant="fullWidth"
            sx={{ 
              mb: 4, 
              borderRadius: 3, 
              background: 'rgba(102, 126, 234, 0.05)',
              p: 0.5,
              '& .MuiTabs-indicator': {
                display: 'none',
              },
              '& .MuiTab-root': {
                borderRadius: 2,
                fontWeight: 600,
                fontSize: 16,
                textTransform: 'none',
                minHeight: 48,
                transition: 'all 0.3s ease',
                '&.Mui-selected': {
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                }
              }
            }}
            centered
          >
            <Tab label="Register" />
            <Tab label="Login" />
          </Tabs>

          <Box sx={{ minHeight: 400, transition: 'all 0.3s ease' }}>
            {tab === 0 && <Register />}
            {tab === 1 && <Login />}
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

function RoomPageWrapper() {
  const { roomId } = useParams();
  return <RoomPage roomId={roomId} />;
}

function App() {
  const isAuthenticated = !!localStorage.getItem("token");

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/auth"} />} />
        <Route path="/auth" element={<AuthTabs />} />
        <Route
          path="/dashboard"
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/auth" />}
        />
        <Route path="/room/:roomId" element={<RoomPageWrapper />} />
        <Route path="/schedule" element={<ScheduleMeeting />} />
      </Routes>
    </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
