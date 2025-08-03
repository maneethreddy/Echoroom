# 🌐 EchoRoom Network Setup Guide

This guide will help you set up EchoRoom to run on your friend's laptop for debugging purposes.

## Prerequisites

- Both computers must be on the same network (same WiFi or connected via LAN)
- Node.js and npm installed on both computers
- MongoDB running (or MongoDB Atlas connection)

## Step 1: Find Your Computer's IP Address

### On macOS/Linux:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### On Windows:
```cmd
ipconfig
```

Look for your local IP address (usually starts with `192.168.` or `10.0.`)

## Step 2: Configure the Application

### Option A: Use the Setup Script (Recommended)
```bash
./setup-network.sh
```

### Option B: Manual Configuration

1. **Create client environment file:**
   ```bash
   # Create client/.env.local file
   echo "REACT_APP_SERVER_URL=http://YOUR_IP_ADDRESS:8000" > client/.env.local
   ```

2. **Update server configuration:**
   The server is already configured to accept network connections.

## Step 3: Configure Firewall

### On macOS:
1. Go to System Preferences > Security & Privacy > Firewall
2. Click "Firewall Options"
3. Add Node.js to the list of allowed applications
4. Or temporarily disable firewall for testing

### On Windows:
1. Open Windows Defender Firewall
2. Allow Node.js through the firewall
3. Or temporarily disable firewall for testing

### On Linux:
```bash
# Allow connections on port 8000
sudo ufw allow 8000
```

## Step 4: Start the Application

### Terminal 1 - Start the Server:
```bash
cd server
npm install
npm run dev
```

### Terminal 2 - Start the Client:
```bash
cd client
npm install
npm start
```

## Step 5: Access from Friend's Laptop

Your friend can now access the application at:
```
http://YOUR_IP_ADDRESS:3000
```

## Troubleshooting

### Connection Issues:
1. **Check if both computers are on the same network**
2. **Verify firewall settings**
3. **Test connectivity:**
   ```bash
   # From friend's laptop
   ping YOUR_IP_ADDRESS
   ```

### Port Issues:
1. **Check if ports are in use:**
   ```bash
   # Check port 8000
   lsof -i :8000
   
   # Check port 3000
   lsof -i :3000
   ```

2. **Kill processes if needed:**
   ```bash
   kill -9 PID_NUMBER
   ```

### MongoDB Issues:
1. **If using local MongoDB:**
   - Make sure MongoDB is running
   - Check MongoDB connection in server logs

2. **If using MongoDB Atlas:**
   - Verify connection string in server/.env
   - Check network access settings in Atlas

## Security Notes

⚠️ **Important:** This setup is for development/debugging only!

- The server accepts connections from any IP address
- CORS is set to allow all origins
- No authentication is required for WebRTC connections

For production, you should:
- Restrict CORS to specific domains
- Add proper authentication
- Use HTTPS
- Configure firewall rules properly

## Quick Test

1. Start the application on your computer
2. Open the app on your friend's laptop
3. Create a room and join from both devices
4. Test video/audio functionality
5. Test screen sharing features

## Debugging Tips

1. **Check browser console** for connection errors
2. **Monitor server logs** for WebRTC signaling issues
3. **Use browser dev tools** to inspect network requests
4. **Test with different browsers** (Chrome, Firefox, Safari)

## Common Issues

### "Connection refused" errors:
- Check if server is running
- Verify IP address is correct
- Check firewall settings

### Video/Audio not working:
- Ensure both devices have camera/microphone permissions
- Check browser console for getUserMedia errors
- Verify WebRTC connections in browser dev tools

### Screen sharing issues:
- Test on Chrome (best WebRTC support)
- Check browser permissions
- Verify screen sharing is enabled in browser settings 