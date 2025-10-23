#!/bin/bash

# Start Mahaveer Bhavan with WhatsApp Integration
# This script starts both the WhatsApp server and the React frontend

echo "🚀 Starting Mahaveer Bhavan with WhatsApp Integration..."
echo ""

# Check if server dependencies are installed
if [ ! -d "server/node_modules" ]; then
  echo "📦 Installing WhatsApp server dependencies..."
  cd server && npm install && cd ..
  echo "✅ Server dependencies installed"
  echo ""
fi

# Function to cleanup processes on exit
cleanup() {
  echo ""
  echo "🛑 Stopping servers..."
  kill $WHATSAPP_PID $FRONTEND_PID 2>/dev/null
  exit
}

# Register cleanup function
trap cleanup EXIT INT TERM

# Start WhatsApp server in background
echo "📱 Starting WhatsApp server on port 3001..."
cd server && npm start &
WHATSAPP_PID=$!
cd ..

# Wait a bit for server to start
sleep 3

# Start frontend
echo "🌐 Starting frontend on port 5173..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ WhatsApp server: http://localhost:3001"
echo "  ✅ Frontend: http://localhost:5173"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📖 Quick Start Guide:"
echo "   1. Open http://localhost:5173 in browser"
echo "   2. Login as admin"
echo "   3. Go to Communication Center → WhatsApp Settings"
echo "   4. Click 'Connect WhatsApp' and scan QR code"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

npm run dev &
FRONTEND_PID=$!

# Wait for both processes
wait
