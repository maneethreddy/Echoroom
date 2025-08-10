import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Chip,
  Box,
  Typography,
  Alert
} from '@mui/material';
import { Add as AddIcon, Lock as LockIcon } from '@mui/icons-material';

const CreateRoom = ({ open, onClose, onRoomCreated }) => {
  const [formData, setFormData] = useState({
    roomId: '',
    name: '',
    description: '',
    isPrivate: false,
    password: '',
    category: 'general',
    language: 'en',
    tags: [],
    aiAssistantEnabled: true,
    allowChat: true,
    allowScreenShare: true,
    allowRecording: false
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTag, setNewTag] = useState('');

  const handleInputChange = (field) => (event) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSwitchChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.checked
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.roomId.trim()) {
      newErrors.roomId = 'Room ID is required';
    } else if (formData.roomId.length < 3) {
      newErrors.roomId = 'Room ID must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9-_]+$/.test(formData.roomId)) {
      newErrors.roomId = 'Room ID can only contain letters, numbers, hyphens, and underscores';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Room name is required';
    }

    if (formData.isPrivate && !formData.password.trim()) {
      newErrors.password = 'Password is required for private rooms';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_SERVER_URL || 'http://localhost:8000'}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          createdBy: {
            userId: 'current-user-id', // This should come from auth context
            userName: 'Current User', // This should come from auth context
            userPhoto: '' // This should come from auth context
          }
        }),
      });

      const result = await response.json();

      if (result.success) {
        onRoomCreated(result.room);
        onClose();
        // Reset form
        setFormData({
          roomId: '',
          name: '',
          description: '',
          isPrivate: false,
          password: '',
          category: 'general',
          language: 'en',
          tags: [],
          aiAssistantEnabled: true,
          allowChat: true,
          allowScreenShare: true,
          allowRecording: false
        });
      } else {
        setErrors({ submit: result.error });
      }
    } catch (error) {
      setErrors({ submit: 'Failed to create room. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      if (event.target.name === 'newTag') {
        addTag();
      }
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <AddIcon color="primary" />
          Create New Room
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} mt={1}>
          {errors.submit && (
            <Alert severity="error" onClose={() => setErrors(prev => ({ ...prev, submit: '' }))}>
              {errors.submit}
            </Alert>
          )}

          <TextField
            label="Room ID"
            value={formData.roomId}
            onChange={handleInputChange('roomId')}
            error={!!errors.roomId}
            helperText={errors.roomId || 'Unique identifier for the room (e.g., "team-meeting-2024")'}
            fullWidth
            required
          />

          <TextField
            label="Room Name"
            value={formData.name}
            onChange={handleInputChange('name')}
            error={!!errors.name}
            helperText={errors.name || 'Display name for the room'}
            fullWidth
            required
          />

          <TextField
            label="Description"
            value={formData.description}
            onChange={handleInputChange('description')}
            multiline
            rows={2}
            fullWidth
            placeholder="Optional description of the room's purpose"
          />

          <Box display="flex" gap={2}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                onChange={handleInputChange('category')}
                label="Category"
              >
                <MenuItem value="general">General</MenuItem>
                <MenuItem value="work">Work</MenuItem>
                <MenuItem value="education">Education</MenuItem>
                <MenuItem value="social">Social</MenuItem>
                <MenuItem value="gaming">Gaming</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Language</InputLabel>
              <Select
                value={formData.language}
                onChange={handleInputChange('language')}
                label="Language"
              >
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="es">Spanish</MenuItem>
                <MenuItem value="fr">French</MenuItem>
                <MenuItem value="de">German</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Tags
            </Typography>
            <Box display="flex" gap={1} mb={1}>
              <TextField
                name="newTag"
                size="small"
                placeholder="Add a tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
                sx={{ flexGrow: 1 }}
              />
              <Button
                variant="outlined"
                size="small"
                onClick={addTag}
                disabled={!newTag.trim()}
              >
                Add
              </Button>
            </Box>
            <Box display="flex" gap={1} flexWrap="wrap">
              {formData.tags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  onDelete={() => removeTag(tag)}
                  size="small"
                />
              ))}
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Room Settings
            </Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isPrivate}
                  onChange={handleSwitchChange('isPrivate')}
                />
              }
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <LockIcon fontSize="small" />
                  Private Room
                </Box>
              }
            />

            {formData.isPrivate && (
              <TextField
                label="Room Password"
                type="password"
                value={formData.password}
                onChange={handleInputChange('password')}
                error={!!errors.password}
                helperText={errors.password || 'Password required to join this room'}
                fullWidth
                sx={{ mt: 1 }}
              />
            )}

            <FormControlLabel
              control={
                <Switch
                  checked={formData.aiAssistantEnabled}
                  onChange={handleSwitchChange('aiAssistantEnabled')}
                />
              }
              label="Enable AI Assistant"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.allowChat}
                  onChange={handleSwitchChange('allowChat')}
                />
              }
              label="Allow Chat Messages"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.allowScreenShare}
                  onChange={handleSwitchChange('allowScreenShare')}
                />
              }
              label="Allow Screen Sharing"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.allowRecording}
                  onChange={handleSwitchChange('allowRecording')}
                />
              }
              label="Allow Recording"
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isSubmitting}
          startIcon={<AddIcon />}
        >
          {isSubmitting ? 'Creating...' : 'Create Room'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateRoom; 