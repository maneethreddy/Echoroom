import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material';

function Dashboard() {
  const logout = () => {
    localStorage.removeItem("token");
    window.location.href = "/auth";
  };

  return (
    <>
      {/* 🧭 Navbar */}
      <AppBar position="static" sx={{ backgroundColor: '#1e1e2f' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            EchoRoom 🚀
          </Typography>
          <Button color="inherit" onClick={logout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      {/* 📦 Main Content */}
      <Container maxWidth="md" sx={{ mt: 6, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          👑 Welcome to EchoRoom Dashboard
        </Typography>
        <Typography variant="body1">
          You are successfully logged in.
        </Typography>
      </Container>
    </>
  );
}

export default Dashboard;
