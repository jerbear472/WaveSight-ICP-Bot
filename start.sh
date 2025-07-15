#!/bin/bash

# ICPScope Startup Script
# Helps you get started with the complete setup

echo "🚀 ICPScope Startup Guide"
echo "=========================="
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    echo "📋 Please follow these steps:"
    echo ""
    echo "1. Copy the environment template:"
    echo "   cp .env.example .env"
    echo ""
    echo "2. Set up Supabase:"
    echo "   - Go to https://supabase.com"
    echo "   - Create a new project"
    echo "   - Run the SQL schema from config/supabase-schema.sql"
    echo "   - Get your URL and API keys"
    echo ""
    echo "3. Edit .env with your credentials:"
    echo "   - SUPABASE_URL=https://your-project.supabase.co"
    echo "   - SUPABASE_ANON_KEY=your_anon_key"
    echo "   - SUPABASE_SERVICE_KEY=your_service_key"
    echo ""
    echo "4. Run this script again: ./start.sh"
    echo ""
    echo "📖 Full setup guide: See SETUP_GUIDE.md"
    exit 1
fi

# Check if Supabase is configured
if grep -q "your-project.supabase.co" .env; then
    echo "⚠️  Supabase not configured!"
    echo "📋 Please edit .env file with your Supabase credentials"
    echo ""
    echo "1. Go to https://supabase.com"
    echo "2. Create a new project"
    echo "3. Run SQL schema from config/supabase-schema.sql"
    echo "4. Update .env with your actual credentials"
    echo ""
    echo "📖 Full setup guide: See SETUP_GUIDE.md"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

echo "✅ Environment configured"
echo "✅ Dependencies installed"
echo ""

# Offer startup options
echo "🔧 Choose startup mode:"
echo "1. Full system (requires Supabase)"
echo "2. Demo mode (no database needed)"
echo "3. Dashboard only"
echo "4. Bot orchestrator only"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        echo "🚀 Starting full ICPScope system..."
        echo "📊 Dashboard: http://localhost:3000"
        echo "🤖 Bot orchestrator will run in background"
        echo "🛑 Press Ctrl+C to stop"
        echo ""
        npm start
        ;;
    2)
        echo "🎭 Starting demo mode..."
        echo "📊 Dashboard: http://localhost:3000"
        echo "ℹ️  Demo data only - no database required"
        echo "🛑 Press Ctrl+C to stop"
        echo ""
        npm run demo
        ;;
    3)
        echo "📊 Starting dashboard only..."
        echo "📊 Dashboard: http://localhost:3000"
        echo "🛑 Press Ctrl+C to stop"
        echo ""
        npm run dashboard
        ;;
    4)
        echo "🤖 Starting bot orchestrator only..."
        echo "ℹ️  Bots will run in background"
        echo "🛑 Press Ctrl+C to stop"
        echo ""
        npm run orchestrator
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac