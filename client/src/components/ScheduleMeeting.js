import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  MenuItem,
  Paper,
  TextField,
  Typography,
  Select,
  InputLabel,
  FormControl,
  FormHelperText,
  Grid,
  Alert,
  Snackbar,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import api from '../utils/api';
import { getToken, isTokenExpired, removeToken } from '../utils/auth';

const durations = [
  '15 minutes',
  '30 minutes',
  '45 minutes',
  '1 hour',
  '1.5 hours',
  '2 hours',
];

const timezones = [
  '(UTC -8:00 Pacific)',
  '(UTC -5:00 Eastern)',
  '(UTC +0:00 London)',
  '(UTC +5:00 Karachi)',
  '(UTC +5:30 India)',
  '(UTC +8:00 Beijing)',
];

const initialState = {
  topic: '',
  password: '',
  host: '',
  description: '',
  date: '',
  time: '',
  ampm: 'AM',
  timezone: '(UTC +5:30 India)',
  duration: '1 hour',
};

export default function ScheduleMeeting() {
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [successDialog, setSuccessDialog] = useState({ open: false, meeting: null });
  const navigate = useNavigate();

  // Get user info from localStorage
  const user = JSON.parse(localStorage.getItem('user')) || {};

  useEffect(() => {
    // Pre-fill host name with current user's name
    if (user.name && !form.host) {
      setForm(prev => ({ ...prev, host: user.name }));
    }
  }, [user.name, form.host]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.topic.trim()) newErrors.topic = 'Conference topic is required';
    if (!form.password.trim()) newErrors.password = 'Password is required';
    if (!form.host.trim()) newErrors.host = 'Host name is required';
    if (!form.date) newErrors.date = 'Date is required';
    if (!form.time) newErrors.time = 'Time is required';

    // Validate password length
    if (form.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Validate date is not in the past
    if (form.date && form.time) {
      const [hours, minutes] = form.time.split(':');
      let hour = parseInt(hours);
      
      if (form.ampm === 'PM' && hour !== 12) {
        hour += 12;
      } else if (form.ampm === 'AM' && hour === 12) {
        hour = 0;
      }

      const scheduledDate = new Date(form.date);
      scheduledDate.setHours(hour, parseInt(minutes), 0, 0);

      if (scheduledDate < new Date()) {
        newErrors.date = 'Cannot schedule meetings in the past';
      }
    }

    return newErrors;
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      setLoading(true);
      
      try {
        const token = getToken();
        
        // Check if token exists and is valid
        if (!token) {
          throw new Error('Authentication required. Please login again.');
        }
        
        if (isTokenExpired(token)) {
          removeToken();
          throw new Error('Session expired. Please login again.');
        }

        const response = await api.post('/meetings', form);

        setLoading(false);
        setSuccessDialog({ 
          open: true, 
          meeting: response.data.meeting 
        });
        setForm(initialState);
        setErrors({});

      } catch (err) {
        setLoading(false);
        let errorMessage = 'Failed to schedule meeting';
        
        if (err.response?.data?.msg) {
          errorMessage = err.response.data.msg;
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        // If token is invalid, redirect to login
          if (errorMessage.includes('Invalid or expired token') || 
              errorMessage.includes('Authentication required') ||
              errorMessage.includes('Session expired')) {
            removeToken();
            setTimeout(() => {
              window.location.href = '/auth';
            }, 2000);
          }
        
        showSnackbar(errorMessage, 'error');
        console.error('Error scheduling meeting:', err);
      }
    }
  };

  const handleSuccessDialogClose = () => {
    setSuccessDialog({ open: false, meeting: null });
    navigate('/dashboard');
  };

  const handleCancel = () => {
    setForm(initialState);
    setErrors({});
    navigate('/dashboard');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)',
        py: 4
      }}
    >
      <Container maxWidth="md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Paper elevation={8} sx={{ p: { xs: 2, sm: 6 }, borderRadius: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
              <Typography variant="h4" fontWeight={700} color="#2196f3">
                Schedule Meeting
              </Typography>
              <IconButton onClick={handleCancel} sx={{ color: '#666' }}>
                <CloseIcon />
              </IconButton>
            </Box>
            
            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Conference Topic"
                    name="topic"
                    value={form.topic}
                    onChange={handleChange}
                    fullWidth
                    required
                    error={!!errors.topic}
                    helperText={errors.topic}
                    margin="normal"
                    InputProps={{ style: { borderRadius: 12 } }}
                    placeholder="Enter meeting topic"
                  />
                  <TextField
                    label="Password"
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    fullWidth
                    required
                    error={!!errors.password}
                    helperText={errors.password}
                    margin="normal"
                    InputProps={{ style: { borderRadius: 12 } }}
                    placeholder="Meeting password"
                  />
                  <TextField
                    label="Host Name"
                    name="host"
                    value={form.host}
                    onChange={handleChange}
                    fullWidth
                    required
                    error={!!errors.host}
                    helperText={errors.host}
                    margin="normal"
                    InputProps={{ style: { borderRadius: 12 } }}
                    placeholder="Host name"
                  />
                  <TextField
                    label="Description"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    fullWidth
                    multiline
                    minRows={3}
                    margin="normal"
                    InputProps={{ style: { borderRadius: 12 } }}
                    placeholder="Meeting description (optional)"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required error={!!errors.date} margin="normal">
                    <InputLabel>Date</InputLabel>
                    <TextField
                      type="date"
                      name="date"
                      value={form.date}
                      onChange={handleChange}
                      InputLabelProps={{ shrink: true }}
                      InputProps={{ 
                        style: { borderRadius: 12 },
                        inputProps: {
                          min: new Date().toISOString().split('T')[0] // Disable past dates
                        }
                      }}
                    />
                    <FormHelperText>{errors.date}</FormHelperText>
                  </FormControl>
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <TextField
                      type="time"
                      name="time"
                      value={form.time}
                      onChange={handleChange}
                      required
                      error={!!errors.time}
                      helperText={errors.time || "Select meeting time"}
                      InputProps={{ 
                        style: { borderRadius: 12 },
                        placeholder: "HH:MM"
                      }}
                      sx={{ flex: 1 }}
                      placeholder="HH:MM"
                    />
                    <FormControl>
                      <Select
                        name="ampm"
                        value={form.ampm}
                        onChange={handleChange}
                        sx={{ borderRadius: 2, minWidth: 80 }}
                      >
                        <MenuItem value="AM">AM</MenuItem>
                        <MenuItem value="PM">PM</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Timezone</InputLabel>
                    <Select
                      name="timezone"
                      value={form.timezone}
                      onChange={handleChange}
                      sx={{ borderRadius: 2 }}
                    >
                      {timezones.map((tz) => (
                        <MenuItem key={tz} value={tz}>{tz}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  {/* Show selected date and time preview */}
                  {form.date && form.time && (
                    <Box sx={{ 
                      mt: 2, 
                      p: 2, 
                      bgcolor: 'rgba(33, 150, 243, 0.1)', 
                      borderRadius: 2, 
                      border: '1px solid rgba(33, 150, 243, 0.2)'
                    }}>
                      <Typography variant="body2" color="primary" fontWeight={600}>
                        📅 Meeting scheduled for:
                      </Typography>
                      <Typography variant="body1" color="text.primary" sx={{ mt: 0.5 }}>
                        {new Date(form.date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })} at {form.time} {form.ampm}
                      </Typography>
                    </Box>
                  )}
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Duration</InputLabel>
                    <Select
                      name="duration"
                      value={form.duration}
                      onChange={handleChange}
                      sx={{ borderRadius: 2 }}
                    >
                      {durations.map((d) => (
                        <MenuItem key={d} value={d}>{d}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  size="large"
                  sx={{ borderRadius: 3, px: 4, fontWeight: 600 }}
                  onClick={handleCancel}
                  type="button"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  sx={{ 
                    borderRadius: 3, 
                    px: 6, 
                    fontWeight: 600, 
                    boxShadow: '0 4px 16px 0 rgba(33,150,243,0.15)',
                    minWidth: 120
                  }}
                  type="submit"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                >
                  {loading ? 'Scheduling...' : 'Schedule Meeting'}
                </Button>
              </Box>
            </Box>
          </Paper>
        </motion.div>
      </Container>

      {/* Success Dialog */}
      <Dialog 
        open={successDialog.open} 
        onClose={handleSuccessDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleIcon sx={{ color: 'success.main' }} />
          Meeting Scheduled Successfully!
        </DialogTitle>
        <DialogContent>
          {successDialog.meeting && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {successDialog.meeting.topic}
              </Typography>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                <strong>Meeting ID:</strong> {successDialog.meeting.meetingId}
              </Typography>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                <strong>Date:</strong> {new Date(successDialog.meeting.scheduledDate).toLocaleDateString()}
              </Typography>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                <strong>Time:</strong> {new Date(successDialog.meeting.scheduledDate).toLocaleTimeString()}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                <strong>Duration:</strong> {successDialog.meeting.duration}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSuccessDialogClose} variant="contained" color="primary">
            Go to Dashboard
          </Button>
        </DialogActions>
      </Dialog>

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