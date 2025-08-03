# 🔐 Token Authentication Troubleshooting Guide

This guide helps you resolve "Invalid or expired token" errors when scheduling meetings.

## Quick Fixes

### 1. **Clear Browser Storage**
```javascript
// In browser console
localStorage.clear();
sessionStorage.clear();
// Then refresh the page and login again
```

### 2. **Check Token in Browser Console**
```javascript
// Check if token exists
console.log('Token:', localStorage.getItem('token'));

// Check if user exists
console.log('User:', localStorage.getItem('user'));
```

### 3. **Verify Server is Running**
```bash
# Check if server is running on port 8000
curl http://localhost:8000/api/auth/test
```

## Common Issues & Solutions

### Issue 1: Token Not Stored
**Symptoms:** `localStorage.getItem('token')` returns `null`

**Solution:**
1. Make sure you're logged in
2. Check browser console for login errors
3. Try logging out and logging in again

### Issue 2: Token Expired
**Symptoms:** Token exists but is expired

**Solution:**
1. The app now automatically redirects to login when token expires
2. Login again to get a new token

### Issue 3: JWT Secret Mismatch
**Symptoms:** Token verification fails on server

**Solution:**
1. Check server `.env` file has `JWT_SECRET` set
2. Restart server after changing JWT_SECRET
3. Clear client storage and login again

### Issue 4: CORS Issues
**Symptoms:** Network errors in browser console

**Solution:**
1. Check server CORS configuration
2. Ensure client is making requests to correct server URL

## Testing Steps

### 1. Test Authentication Flow
```bash
# Start server
cd server && npm run dev

# Test auth endpoint
curl http://localhost:8000/api/auth/test
```

### 2. Test Token Creation
```bash
# Login via API
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### 3. Test Token Verification
```bash
# Use the token from login response
curl -X GET http://localhost:8000/api/meetings/test-auth \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Debug Mode

### Enable Debug Logging
Add to your browser console:
```javascript
// Enable detailed logging
localStorage.setItem('debug', 'true');

// Check token details
const token = localStorage.getItem('token');
if (token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('Token payload:', payload);
    console.log('Token expires:', new Date(payload.exp * 1000));
    console.log('Token is expired:', Date.now() > payload.exp * 1000);
  } catch (e) {
    console.error('Invalid token format:', e);
  }
}
```

### Server Debug Mode
Add to `server/server.js`:
```javascript
// Enable detailed JWT logging
app.use((req, res, next) => {
  console.log('Request:', req.method, req.path);
  console.log('Headers:', req.headers);
  next();
});
```

## Environment Variables

### Server (.env)
```env
JWT_SECRET=your_very_long_and_random_secret_key_here
MONGO_URI=your_mongodb_connection_string
PORT=8000
```

### Client (.env.local)
```env
REACT_APP_SERVER_URL=http://localhost:8000
```

## Manual Token Refresh

If automatic refresh isn't working:

```javascript
// In browser console
const refreshToken = async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.log('No token to refresh');
    return;
  }
  
  try {
    const response = await fetch('http://localhost:8000/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      console.log('Token refreshed successfully');
    } else {
      console.log('Token refresh failed');
    }
  } catch (error) {
    console.error('Token refresh error:', error);
  }
};

// Run refresh
refreshToken();
```

## Prevention

### 1. **Regular Token Validation**
The app now automatically:
- Checks token expiration before requests
- Refreshes tokens when needed
- Redirects to login on auth failures

### 2. **Proper Error Handling**
- Clear error messages for users
- Automatic logout on auth failures
- Graceful degradation

### 3. **Security Best Practices**
- Tokens expire after 7 days
- Secure JWT secret
- HTTPS in production

## Still Having Issues?

1. **Check server logs** for detailed error messages
2. **Check browser console** for network errors
3. **Verify MongoDB connection** is working
4. **Test with a fresh browser session**
5. **Check if the issue is network-related** (try localhost vs IP address)

## Support

If you're still experiencing issues:
1. Check the server logs for error messages
2. Verify all environment variables are set correctly
3. Test with the provided debugging tools
4. Ensure both client and server are using the same JWT secret 