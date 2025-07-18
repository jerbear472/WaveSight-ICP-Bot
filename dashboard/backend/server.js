/**
 * WaveSight Bot Backend Server
 * Handles real Instagram and TikTok automation
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');

// Import bot controllers
const InstagramBot = require('./bots/instagram-bot');
const TikTokBot = require('./bots/tiktok-bot');
const BotSessionManager = require('./services/bot-session-manager');
const BotEngineConnector = require('./services/bot-engine-connector');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Use service key for backend operations
);

// Bot session manager
const sessionManager = new BotSessionManager(supabase, io);

// Bot engine connector (advanced system)
const botEngineConnector = new BotEngineConnector(supabase, io);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('start-bot', async (data) => {
    const { platform, profileType, duration, browser } = data;
    
    try {
      console.log(`🚀 Starting bot via advanced bot-engine: ${platform} - ${profileType} - ${browser || 'chrome'}`);
      
      // Use advanced bot-engine system
      const sessionId = await botEngineConnector.startSession({
        platform,
        profileType,
        duration,
        browser
      }, socket);
      
      console.log(`✅ Bot-engine session started: ${sessionId}`);
      
    } catch (error) {
      console.error('❌ Error starting bot-engine session:', error);
      
      // Fallback to basic bot system
      console.log('🔄 Falling back to basic bot system...');
      try {
        const session = await sessionManager.createSession({
          platform,
          profileType,
          duration,
          socketId: socket.id
        });

        let bot;
        if (platform === 'instagram') {
          bot = new InstagramBot(session, supabase, socket);
        } else if (platform === 'tiktok') {
          bot = new TikTokBot(session, supabase, socket);
        }

        await bot.start();
        socket.emit('bot-started', { sessionId: session.id });
        
      } catch (fallbackError) {
        console.error('❌ Fallback bot system also failed:', fallbackError);
        socket.emit('bot-error', { error: fallbackError.message });
      }
    }
  });

  socket.on('stop-bot', async (data) => {
    const { sessionId } = data;
    
    try {
      // First try to stop bot-engine session
      if (sessionId && sessionId.startsWith('botengine_')) {
        console.log(`🛑 Stopping bot-engine session: ${sessionId}`);
        await botEngineConnector.stopSession(sessionId);
      } else {
        // Fallback to basic session manager
        await sessionManager.stopSession(sessionId);
      }
      
      socket.emit('bot-stopped', { sessionId });
    } catch (error) {
      console.error('Error stopping bot:', error);
      socket.emit('bot-error', { error: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Clean up any active sessions for this socket
    sessionManager.cleanupSocketSessions(socket.id);
  });
});

// REST API endpoints

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'WaveSight Bot Backend',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'WaveSight Bot Backend',
    timestamp: new Date().toISOString()
  });
});

// Get bot sessions
app.get('/api/sessions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bot_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get discovered content
app.get('/api/content', async (req, res) => {
  const { platform, timeRange = '24h', viral = false } = req.query;
  
  try {
    let query = supabase
      .from('discovered_content')
      .select('*');

    if (platform) {
      query = query.eq('platform', platform);
    }

    if (viral === 'true') {
      query = query.eq('is_viral', true);
    }

    // Add time range filter
    const now = new Date();
    let startTime = new Date();
    
    switch(timeRange) {
      case '1h':
        startTime.setHours(now.getHours() - 1);
        break;
      case '24h':
        startTime.setDate(now.getDate() - 1);
        break;
      case '7d':
        startTime.setDate(now.getDate() - 7);
        break;
      case '30d':
        startTime.setDate(now.getDate() - 30);
        break;
    }

    const { data, error } = await query
      .gte('discovered_at', startTime.toISOString())
      .order('engagement_rate', { ascending: false })
      .limit(100);

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get trending analysis
app.get('/api/trends', async (req, res) => {
  const { platform, timeRange = '24h' } = req.query;
  
  try {
    const { data, error } = await supabase
      .from('detected_trends')
      .select('*')
      .eq('platform', platform || 'all')
      .order('viral_score', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get aggregated stats
app.get('/api/stats', async (req, res) => {
  const { platform, timeRange = '24h' } = req.query;
  
  try {
    // Get content stats
    const { data: contentStats, error: contentError } = await supabase
      .from('content_stats')
      .select('*')
      .order('date', { ascending: false })
      .limit(30);

    if (contentError) throw contentError;

    // Get trending hashtags
    const { data: trendingHashtags, error: hashtagError } = await supabase
      .from('trending_hashtags')
      .select('*')
      .order('usage_count', { ascending: false })
      .limit(10);

    if (hashtagError) throw hashtagError;

    res.json({ 
      success: true, 
      data: {
        contentStats,
        trendingHashtags
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Initialize bot engine connector
async function initializeServices() {
  try {
    console.log('🔧 Initializing advanced bot-engine...');
    await botEngineConnector.initialize();
    console.log('✅ Bot-engine initialized successfully');
  } catch (error) {
    console.error('⚠️ Bot-engine initialization failed, using basic bots only:', error);
  }
}

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, async () => {
  console.log(`WaveSight Bot Backend running on port ${PORT}`);
  
  // Initialize services
  await initializeServices();
});