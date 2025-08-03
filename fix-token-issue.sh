#!/bin/bash

echo "🔧 EchoRoom Token Issue Fix Script"
echo "=================================="

echo "1. Checking server status..."
if curl -s http://localhost:8000/api/auth/test > /dev/null; then
    echo "✅ Server is running"
else
    echo "❌ Server is not running"
    echo "   Starting server..."
    cd server && npm run dev &
    sleep 3
fi

echo ""
echo "2. Clearing browser storage..."
echo "   Please run this in your browser console:"
echo "   localStorage.clear(); sessionStorage.clear();"
echo ""

echo "3. Testing authentication..."
echo "   Please login again to get a fresh token"
echo ""

echo "4. If the issue persists, try these steps:"
echo "   - Check browser console for errors"
echo "   - Verify you're logged in"
echo "   - Try a different browser"
echo "   - Check server logs for detailed errors"
echo ""

echo "5. Quick test commands:"
echo "   curl http://localhost:8000/api/auth/test"
echo "   curl -X POST http://localhost:8000/api/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"test@example.com\",\"password\":\"password\"}'"
echo ""

echo "📖 For detailed troubleshooting, see TOKEN_TROUBLESHOOTING.md" 