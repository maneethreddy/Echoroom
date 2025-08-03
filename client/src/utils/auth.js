// Authentication utility functions
import { jwtDecode } from 'jwt-decode';

// Check if token is expired
export const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  } catch (error) {
    console.error('Error decoding token:', error);
    return true;
  }
};

// Get token from localStorage
export const getToken = () => {
  return localStorage.getItem('token');
};

// Set token in localStorage
export const setToken = (token) => {
  localStorage.setItem('token', token);
};

// Remove token from localStorage
export const removeToken = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const token = getToken();
  return token && !isTokenExpired(token);
};

// Get user info from token
export const getUserFromToken = (token) => {
  if (!token) return null;
  
  try {
    return jwtDecode(token);
  } catch (error) {
    console.error('Error decoding user from token:', error);
    return null;
  }
};

// Refresh token if needed
export const refreshTokenIfNeeded = async () => {
  const token = getToken();
  
  if (!token) {
    return false;
  }
  
  if (isTokenExpired(token)) {
    console.log('Token expired, redirecting to login');
    removeToken();
    window.location.href = '/login';
    return false;
  }
  
  return true;
};

// Refresh token
export const refreshToken = async () => {
  const token = getToken();
  
  if (!token) {
    throw new Error('No token to refresh');
  }
  
  try {
    const response = await fetch('http://localhost:8000/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }
    
    const data = await response.json();
    setToken(data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data.token;
  } catch (error) {
    console.error('Token refresh failed:', error);
    removeToken();
    throw error;
  }
}; 