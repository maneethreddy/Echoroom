#!/bin/bash

echo "🌐 EchoRoom Network Setup Script"
echo "================================"

# Get the local IP address
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)

if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP=$(hostname -I | awk '{print $1}')
fi

echo "📱 Your local IP address is: $LOCAL_IP"
echo ""

echo "🔧 Configuration Steps:"
echo "1. Create client/.env.local file with:"
echo "   REACT_APP_SERVER_URL=http://$LOCAL_IP:8000"
echo ""
echo "2. Make sure your firewall allows connections on port 8000"
echo ""
echo "3. Start the server:"
echo "   cd server && npm run dev"
echo ""
echo "4. Start the client:"
echo "   cd client && npm start"
echo ""
echo "5. Your friend can access the app at:"
echo "   http://$LOCAL_IP:3000"
echo ""

# Create the .env.local file
echo "Creating client/.env.local file..."
mkdir -p client
echo "REACT_APP_SERVER_URL=http://$LOCAL_IP:8000" > client/.env.local
echo "✅ Created client/.env.local with network configuration"
echo ""

echo "🚀 Ready to start! Run the following commands:"
echo "   Terminal 1: cd server && npm run dev"
echo "   Terminal 2: cd client && npm start" 