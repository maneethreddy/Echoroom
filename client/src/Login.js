import React, { useState } from 'react';
import { Container, Box, TextField, Button, Typography, Divider } from '@mui/material';
import { motion } from 'framer-motion';
import GoogleLoginButton from './components/GoogleLoginButton';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:8000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (data.token) {
      localStorage.setItem("token", data.token);
      window.location.href = "/dashboard"; 
    }else {
        alert(data.msg);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGoogleError = (error) => {
    alert(error);
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          Login
        </Typography>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <Box component="form" onSubmit={handleLogin} sx={{ mt: 1 }}>
            <motion.div variants={itemVariants}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                InputProps={{ style: { fontSize: '1.2rem', padding: '1px' } }}
                InputLabelProps={{ style: { fontSize: '1.2rem' } }}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{ style: { fontSize: '1.2rem', padding: '1px' } }}
                InputLabelProps={{ style: { fontSize: '1.2rem' } }}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
              >
                Sign In
              </Button>
            </motion.div>
          </Box>
          
          <motion.div variants={itemVariants}>
            <Divider sx={{ my: 2 }}>
              <Typography variant="body2" color="text.secondary">
                OR
              </Typography>
            </Divider>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <GoogleLoginButton onError={handleGoogleError} />
          </motion.div>
        </motion.div>
      </Box>
    </Container>
  );
};

export default Login;
