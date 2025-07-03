import React, { useState } from 'react';
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
} from '@mui/material';

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
  id: '',
  password: '',
  host: '',
  description: '',
  date: '',
  time: '',
  ampm: 'AM',
  timezone: '(UTC +5:00 Karachi)',
  duration: '1 hour',
};

export default function ScheduleMeeting() {
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.topic) newErrors.topic = 'Required';
    if (!form.id) newErrors.id = 'Required';
    if (!form.password) newErrors.password = 'Required';
    if (!form.host) newErrors.host = 'Required';
    if (!form.date) newErrors.date = 'Required';
    if (!form.time) newErrors.time = 'Required';
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validate();
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      console.log('Meeting Scheduled:', form);
      // Reset or further actions here
    }
  };

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
      <Container maxWidth="md">
        <Paper elevation={8} sx={{ p: { xs: 2, sm: 6 }, borderRadius: 4 }}>
          <Typography variant="h4" align="center" fontWeight={700} mb={4} color="#2196f3">
            Add Schedule
          </Typography>
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
                  placeholder="Set a conference topic before it starts"
                />
                <TextField
                  label="Conference ID"
                  name="id"
                  value={form.id}
                  onChange={handleChange}
                  fullWidth
                  required
                  error={!!errors.id}
                  helperText={errors.id}
                  margin="normal"
                  InputProps={{ style: { borderRadius: 12 } }}
                  placeholder="6 digit id"
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
                  placeholder="Password"
                />
                <TextField
                  label="Host name"
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
                  placeholder="Description"
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
                    InputProps={{ style: { borderRadius: 12 } }}
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
                    helperText={errors.time}
                    InputProps={{ style: { borderRadius: 12 } }}
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
                  <FormControl>
                    <Select
                      name="timezone"
                      value={form.timezone}
                      onChange={handleChange}
                      sx={{ borderRadius: 2, minWidth: 180 }}
                    >
                      {timezones.map((tz) => (
                        <MenuItem key={tz} value={tz}>{tz}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Set duration</InputLabel>
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
                onClick={() => setForm(initialState)}
                type="button"
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="primary"
                size="large"
                sx={{ borderRadius: 3, px: 6, fontWeight: 600, boxShadow: '0 4px 16px 0 rgba(33,150,243,0.15)' }}
                type="submit"
              >
                Save
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
} 