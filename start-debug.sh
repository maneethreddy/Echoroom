#!/bin/bash

echo "🚀 EchoRoom Debug Mode Startup"
echo "=============================="

# Check if .env.local exists
if [ ! -f "client/.env.local" ]; then
    echo "⚠️  client/.env.local not found. Running network setup..."
    ./setup-network.sh
fi

echo "📡 Starting server..."
cd server
npm run dev &
SERVER_PID=$!

echo "⏳ Waiting for server to start..."
sleep 3

echo "🖥️  Starting client..."
cd ../client
npm start &
CLIENT_PID=$!

echo ""
echo "✅ EchoRoom is starting up!"
echo "📱 Server: http://localhost:8000"
echo "🌐 Client: http://localhost:3000"
echo ""
echo "🔗 Your friend can access: http://192.168.1.10:3000"
echo ""
echo "Press Ctrl+C to stop both server and client"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping EchoRoom..."
    kill $SERVER_PID 2>/dev/null
    kill $CLIENT_PID 2>/dev/null
    echo "✅ Stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for background processes
wait 