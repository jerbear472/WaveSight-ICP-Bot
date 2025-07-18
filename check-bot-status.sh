#!/bin/bash

echo "🔍 ICPScope Bot System Status Check"
echo "===================================="

# Check if dashboard is running
echo -n "Dashboard (port 3000): "
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Running"
else
    echo "❌ Not running"
fi

# Check if backend is running
echo -n "Backend API (port 3001): "
HEALTH=$(curl -s http://localhost:3001/api/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Running - $HEALTH"
else
    echo "❌ Not running"
fi

# Check for Chrome processes
echo ""
echo "Chrome/Puppeteer processes:"
CHROME_COUNT=$(ps aux | grep -E "(Google Chrome|chromium)" | grep -v grep | wc -l)
if [ $CHROME_COUNT -gt 0 ]; then
    echo "✅ $CHROME_COUNT Chrome instance(s) running"
    ps aux | grep -E "(Google Chrome|chromium)" | grep -v grep | head -3
else
    echo "❌ No Chrome instances running"
fi

echo ""
echo "Ready to start bot sessions!"
echo ""
echo "To start a bot:"
echo "1. Open file:///Users/JeremyUys_1/Desktop/ICPScope/verify-bot-system.html"
echo "2. Or use the dashboard at http://localhost:3000"
echo ""
echo "The bot will:"
echo "✓ Open Instagram in desktop mode (1920x1080)"
echo "✓ Navigate to instagram.com homepage"
echo "✓ Handle login popups by clicking X buttons"
echo "✓ Scroll naturally with human-like patterns"
echo "✓ Stop immediately when Stop button is clicked"