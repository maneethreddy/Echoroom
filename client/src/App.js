import React, { useState } from 'react';
import Register from './Register';
import Login from './Login';
import Dashboard from './Dashboard';
import { Container, Box, Typography, Paper, Tabs, Tab } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

function AuthTabs() {
  const [tab, setTab] = useState(1); // default to Login

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={6} sx={{ p: 4 }}>
        <Typography variant="h4" align="center" gutterBottom>
          EchoRoom 🔐 Auth
        </Typography>

        <Tabs
          value={tab}
          onChange={(_, newValue) => setTab(newValue)}
          variant="fullWidth"
          sx={{ mb: 3 }}
          centered
        >
          <Tab label="Register" />
          <Tab label="Login" />
        </Tabs>

        <Box>
          {tab === 0 && <Register />}
          {tab === 1 && <Login />}
        </Box>
      </Paper>
    </Container>
  );
}

function App() {
  const isAuthenticated = !!localStorage.getItem("token");

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/auth"} />} />
        <Route path="/auth" element={<AuthTabs />} />
        <Route
          path="/dashboard"
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/auth" />}
        />
      </Routes>
    </Router>
  );
}

export default App;
