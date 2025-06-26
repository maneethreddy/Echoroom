import React from 'react';
import Register from './Register';
import Login from './Login';
import { Container, Box, Typography, Paper, Tabs, Tab } from '@mui/material';
import { useState } from 'react';

function App() {
  const [tab, setTab] = useState(0);

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

export default App;
