import React, { useState } from 'react';
import { Container, Box, TextField, Button, Typography } from '@mui/material';
import { motion } from 'framer-motion';

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

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:8000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      alert(data.msg || "Registered!");
    } catch (err) {
      console.error(err);
    }
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
          Register
        </Typography>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <Box component="form" onSubmit={handleRegister} sx={{ mt: 1 }}>
            <motion.div variants={itemVariants}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="name"
                label="Name"
                name="name"
                autoComplete="name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                InputProps={{ style: { fontSize: '1.2rem', padding: '1px' } }}
                InputLabelProps={{ style: { fontSize: '1.2rem' } }}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
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
                Register
              </Button>
            </motion.div>
          </Box>
        </motion.div>
      </Box>
    </Container>
  );
};

export default Register;
