#!/bin/bash
# Start ICPScope Dashboard with Bot Control

echo "🚀 Starting ICPScope Dashboard..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the test script
echo "🤖 Starting servers..."
node test-bot-control.js