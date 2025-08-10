import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  Skeleton,
  Alert,
  Grid,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  People as PeopleIcon,
  Lock as LockIcon,
  Public as PublicIcon,
  Category as CategoryIcon,
  Language as LanguageIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

const RoomList = ({ onJoinRoom, onCreateRoom }) => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [languageFilter, setLanguageFilter] = useState('all');

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`${process.env.REACT_APP_SERVER_URL || 'http://localhost:8000'}/api/rooms`);
      const result = await response.json();

      if (result.success) {
        setRooms(result.rooms);
      } else {
        setError(result.error || 'Failed to fetch rooms');
      }
    } catch (error) {
      setError('Failed to connect to server');
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         room.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         room.roomId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         room.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'all' || room.metadata?.category === categoryFilter;
    const matchesLanguage = languageFilter === 'all' || room.metadata?.language === languageFilter;
    
    return matchesSearch && matchesCategory && matchesLanguage;
  });

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'work': return '💼';
      case 'education': return '📚';
      case 'social': return '👥';
      case 'gaming': return '🎮';
      case 'other': return '🔧';
      default: return '🏠';
    }
  };

  const getLanguageIcon = (language) => {
    switch (language) {
      case 'es': return '🇪🇸';
      case 'fr': return '🇫🇷';
      case 'de': return '🇩🇪';
      case 'other': return '🌍';
      default: return '🇺🇸';
    }
  };

  const handleJoinRoom = (room) => {
    if (room.isPrivate) {
      // TODO: Show password dialog
      alert('Private room - password required');
      return;
    }
    onJoinRoom(room);
  };

  if (loading) {
    return (
      <Box p={2}>
        <Typography variant="h6" gutterBottom>
          Available Rooms
        </Typography>
        <Grid container spacing={2}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="60%" height={24} />
                  <Skeleton variant="text" width="40%" height={20} />
                  <Skeleton variant="text" width="80%" height={16} />
                  <Box mt={1}>
                    <Skeleton variant="rectangular" width="100%" height={32} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box p={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Available Rooms
        </Typography>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={fetchRooms}
          size="small"
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Search and Filters */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <TextField
          placeholder="Search rooms..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 250 }}
        />

        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            label="Category"
          >
            <MenuItem value="all">All Categories</MenuItem>
            <MenuItem value="general">General</MenuItem>
            <MenuItem value="work">Work</MenuItem>
            <MenuItem value="education">Education</MenuItem>
            <MenuItem value="social">Social</MenuItem>
            <MenuItem value="gaming">Gaming</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Language</InputLabel>
          <Select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            label="Language"
          >
            <MenuItem value="all">All Languages</MenuItem>
            <MenuItem value="en">English</MenuItem>
            <MenuItem value="es">Spanish</MenuItem>
            <MenuItem value="fr">French</MenuItem>
            <MenuItem value="de">German</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </Select>
        </FormControl>

        <Button
          variant="outlined"
          startIcon={<FilterIcon />}
          onClick={() => {
            setCategoryFilter('all');
            setLanguageFilter('all');
            setSearchTerm('');
          }}
        >
          Clear Filters
        </Button>
      </Box>

      {/* Room Grid */}
      {filteredRooms.length === 0 ? (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No rooms found
          </Typography>
          <Typography color="text.secondary" mb={2}>
            {searchTerm || categoryFilter !== 'all' || languageFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'No rooms are currently available'
            }
          </Typography>
          <Button
            variant="contained"
            onClick={onCreateRoom}
            startIcon={<RefreshIcon />}
          >
            Create First Room
          </Button>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filteredRooms.map((room) => (
            <Grid item xs={12} sm={6} md={4} key={room.roomId}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': {
                    boxShadow: 4,
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s ease-in-out'
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Typography variant="h6" component="h3" noWrap>
                      {room.name}
                    </Typography>
                    {room.isPrivate ? (
                      <Tooltip title="Private Room">
                        <LockIcon color="action" fontSize="small" />
                      </Tooltip>
                    ) : (
                      <Tooltip title="Public Room">
                        <PublicIcon color="action" fontSize="small" />
                      </Tooltip>
                    )}
                  </Box>

                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      mb: 1,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {room.description || 'No description available'}
                  </Typography>

                  <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    sx={{ fontFamily: 'monospace' }}
                  >
                    ID: {room.roomId}
                  </Typography>

                  <Box display="flex" alignItems="center" gap={1} mt={1} mb={2}>
                    <Chip
                      icon={<CategoryIcon />}
                      label={room.metadata?.category || 'general'}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      icon={<LanguageIcon />}
                      label={room.metadata?.language || 'en'}
                      size="small"
                      variant="outlined"
                    />
                  </Box>

                  <Box display="flex" alignItems="center" gap={1}>
                    <PeopleIcon color="action" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">
                      {room.participantCount} online
                    </Typography>
                  </Box>

                  {room.tags && room.tags.length > 0 && (
                    <Box mt={1} display="flex" gap={0.5} flexWrap="wrap">
                      {room.tags.slice(0, 3).map((tag, index) => (
                        <Chip
                          key={index}
                          label={tag}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      ))}
                      {room.tags.length > 3 && (
                        <Chip
                          label={`+${room.tags.length - 3}`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                  )}
                </CardContent>

                <CardActions>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => handleJoinRoom(room)}
                    fullWidth
                  >
                    Join Room
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create Room Button */}
      <Box textAlign="center" mt={4}>
        <Button
          variant="outlined"
          size="large"
          onClick={onCreateRoom}
          startIcon={<RefreshIcon />}
        >
          Create New Room
        </Button>
      </Box>
    </Box>
  );
};

export default RoomList; 