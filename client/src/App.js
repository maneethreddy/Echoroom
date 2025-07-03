import React, { useState, useEffect } from 'react';
import Register from './Register';
import Login from './Login';
import Dashboard from './Dashboard';
import RoomPage from './RoomPage';
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
        background: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)',
      }}
    >
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper
          elevation={8}
          sx={{
            p: { xs: 2, sm: 4 },
            borderRadius: 4,
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
            <img src={require('./logo.svg').default} alt="EchoRoom Logo" style={{ width: 64, marginBottom: 8 }} />
            <Typography variant="h4" align="center" gutterBottom fontWeight={700}>
              EchoRoom 🔐 Auth
            </Typography>
          </Box>

          <Tabs
            value={tab}
            onChange={(_, newValue) => setTab(newValue)}
            variant="fullWidth"
            sx={{ mb: 3, borderRadius: 2, background: '#f5f7fa' }}
            centered
            TabIndicatorProps={{ style: { transition: 'all 0.3s cubic-bezier(.4,0,.2,1)', height: 4, borderRadius: 2, background: '#1976d2' } }}
          >
            <Tab label="Register" sx={{ fontWeight: 500, fontSize: 18 }} />
            <Tab label="Login" sx={{ fontWeight: 500, fontSize: 18 }} />
          </Tabs>

          <Box sx={{ minHeight: 320, transition: 'all 0.3s' }}>
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
      </Routes>
    </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
