/**
 * Bot Engine Connector
 * Bridges the dashboard socket.io interface with the advanced bot-engine system
 */

const path = require('path');
const BotOrchestrator = require('../../../bot-engine/orchestrator');
const DataRecorder = require('./data-recorder');

class BotEngineConnector {
  constructor(supabase, io) {
    this.supabase = supabase;
    this.io = io;
    this.dataRecorder = new DataRecorder(supabase);
    this.activeSessions = new Map();
    this.orchestrator = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      console.log('🔧 Initializing Bot Engine Connector...');
      
      // Initialize orchestrator with dashboard-specific config
      this.orchestrator = new BotOrchestrator({
        maxConcurrentBots: 3,
        sessionDuration: 300000, // 5 minutes default
        restPeriod: 10000, // 10 seconds between sessions
        platforms: ['instagram', 'tiktok']
      });

      // Initialize the orchestrator
      await this.orchestrator.initialize();
      
      this.isInitialized = true;
      console.log('✅ Bot Engine Connector initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Bot Engine Connector:', error);
      throw error;
    }
  }

  async startSession(sessionData, socket) {
    try {
      const { platform, profileType, duration } = sessionData;
      
      console.log(`🚀 Starting bot-engine session: ${platform} - ${profileType}`);
      
      // Create session in our database first
      const sessionId = `botengine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await this.supabase
        .from('bot_sessions')
        .insert({
          session_id: sessionId,
          platform,
          profile_type: profileType,
          duration_ms: duration,
          status: 'running'
        });

      // Get credentials for the platform
      const credentials = this.getCredentialsForPlatform(platform);

      // Start manual session through orchestrator with credentials
      const orchestratorSessionId = await this.orchestrator.runManualSession({
        profileType,
        platform,
        duration: duration || 300000,
        credentials
      });

      // Track the session
      this.activeSessions.set(sessionId, {
        socket: socket.id,
        orchestratorSessionId,
        platform,
        profileType,
        startTime: Date.now(),
        contentViewed: 0,
        engagements: 0
      });

      // Set up event forwarding from orchestrator
      this.setupOrchestratorEventHandlers(sessionId, socket);
      
      // Set up status monitoring
      this.setupStatusMonitoring(sessionId, socket);

      // Emit session started event
      socket.emit('bot-started', { sessionId });

      return sessionId;
      
    } catch (error) {
      console.error('❌ Error starting bot-engine session:', error);
      socket.emit('bot-error', { error: error.message });
      throw error;
    }
  }

  setupOrchestratorEventHandlers(sessionId, socket) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    // Handle real content discovery from bots
    const contentHandler = async (data) => {
      if (data.sessionId !== session.orchestratorSessionId) return;
      
      session.contentViewed++;
      
      // Record in database
      await this.dataRecorder.recordContentImpression(sessionId, data.content);
      
      // Emit to frontend
      socket.emit('content-discovered', {
        sessionId,
        content: data.content,
        stats: {
          contentViewed: session.contentViewed,
          engagements: session.engagements,
          trendsFound: this.getTrendCount(session)
        }
      });
    };

    // Handle engagement events
    const engagementHandler = async (data) => {
      if (data.sessionId !== session.orchestratorSessionId) return;
      
      session.engagements++;
      
      socket.emit('bot-engagement', {
        sessionId,
        engagement: data.engagement
      });
    };

    // Handle status updates
    const statusHandler = (data) => {
      if (data.sessionId !== session.orchestratorSessionId) return;
      
      // Map internal status to client expected format
      const statusMap = {
        'starting': 'started',
        'navigating': 'started',
        'logged_in': 'logged_in',
        'feed_loaded': 'scrolling',
        'scrolling': 'scrolling',
        'captcha_detected': 'captcha_detected',
        'captcha_solved': 'scrolling',
        'session_complete': 'complete'
      };
      
      const clientStatus = statusMap[data.status] || data.status;
      
      socket.emit('bot-status', {
        sessionId,
        status: clientStatus,
        message: data.message,
        platform: session.platform
      });
    };

    // Handle errors
    const errorHandler = (data) => {
      if (data.sessionId !== session.orchestratorSessionId) return;
      
      socket.emit('bot-error', {
        sessionId,
        ...data
      });
    };

    // Handle session completion
    const completeHandler = async (data) => {
      if (data.sessionId !== session.orchestratorSessionId) return;
      
      await this.stopSession(sessionId);
    };

    // Register handlers
    this.orchestrator.on('bot-content-discovered', contentHandler);
    this.orchestrator.on('bot-engagement', engagementHandler);
    this.orchestrator.on('bot-status', statusHandler);
    this.orchestrator.on('bot-error', errorHandler);
    this.orchestrator.on('bot-session-complete', completeHandler);

    // Store handlers for cleanup
    session.eventHandlers = {
      contentHandler,
      engagementHandler,
      statusHandler,
      errorHandler,
      completeHandler
    };
  }

  setupStatusMonitoring(sessionId, socket) {
    // Monitor session status
    const sessionCheck = setInterval(async () => {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        clearInterval(sessionCheck);
        return;
      }

      // Check orchestrator status
      const orchestratorStatus = this.orchestrator.getStatus();
      
      // Emit status updates
      socket.emit('bot-status', {
        status: orchestratorStatus.isRunning ? 'running' : 'idle',
        activeBots: orchestratorStatus.activeBots,
        metrics: orchestratorStatus.metrics
      });

      // Check if session should end based on duration
      const elapsed = Date.now() - session.startTime;
      if (elapsed > (session.duration || 300000)) {
        await this.stopSession(sessionId);
        clearInterval(sessionCheck);
      }
    }, 3000);

    // Store interval for cleanup
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.statusInterval = sessionCheck;
    }
  }

  getTrendCount(session) {
    // TODO: Implement trend detection logic
    return 0;
  }

  async stopSession(sessionId) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        console.warn(`⚠️ Session ${sessionId} not found for stopping`);
        return;
      }

      console.log(`🛑 Stopping bot-engine session: ${sessionId}`);

      // Stop the actual bot if it exists
      if (session.orchestratorSessionId && this.orchestrator && this.orchestrator.activeBots) {
        console.log(`🔍 Looking for bot with orchestrator session ID: ${session.orchestratorSessionId}`);
        console.log(`📊 Active bots in orchestrator: ${this.orchestrator.activeBots.size}`);
        
        // The orchestrator uses session ID as the key
        const botInfo = this.orchestrator.activeBots.get(session.orchestratorSessionId);
        
        if (botInfo && botInfo.bot) {
          console.log(`🤖 Found bot to stop: ${session.orchestratorSessionId}`);
          
          // Stop the bot
          if (botInfo.bot.isActive) {
            botInfo.bot.isActive = false;
          }
          
          // Clean up browser and resources
          if (botInfo.bot.cleanup && typeof botInfo.bot.cleanup === 'function') {
            console.log(`🧹 Cleaning up bot resources and closing browser...`);
            await botInfo.bot.cleanup();
          }
          
          // Remove from active bots
          this.orchestrator.activeBots.delete(session.orchestratorSessionId);
          console.log(`✅ Bot stopped and browser closed`);
        } else {
          console.warn(`⚠️ Bot not found in orchestrator active bots`);
          
          // Try to find by iterating through all bots as fallback
          for (const [id, info] of this.orchestrator.activeBots) {
            console.log(`Checking bot ${id}...`);
            if (info.session && info.session.sessionId === session.orchestratorSessionId) {
              console.log(`🤖 Found bot by iteration: ${id}`);
              if (info.bot && info.bot.cleanup) {
                await info.bot.cleanup();
              }
              this.orchestrator.activeBots.delete(id);
              break;
            }
          }
        }
      }

      // Update session in database
      await this.supabase
        .from('bot_sessions')
        .update({
          end_time: new Date().toISOString(),
          content_viewed: session.contentViewed,
          engagements: session.engagements,
          status: 'completed'
        })
        .eq('session_id', sessionId);

      // Get socket and emit completion
      const socketId = session.socket;
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit('session-complete', {
          sessionId,
          stats: {
            contentViewed: session.contentViewed,
            engagements: session.engagements,
            trendsFound: 0
          }
        });
      }

      // Clean up event handlers
      if (session.eventHandlers) {
        this.orchestrator.off('bot-content-discovered', session.eventHandlers.contentHandler);
        this.orchestrator.off('bot-engagement', session.eventHandlers.engagementHandler);
        this.orchestrator.off('bot-status', session.eventHandlers.statusHandler);
        this.orchestrator.off('bot-error', session.eventHandlers.errorHandler);
        this.orchestrator.off('bot-session-complete', session.eventHandlers.completeHandler);
      }

      // Clear status interval
      if (session.statusInterval) {
        clearInterval(session.statusInterval);
      }

      // Remove from active sessions
      this.activeSessions.delete(sessionId);

    } catch (error) {
      console.error('❌ Error stopping bot-engine session:', error);
    }
  }

  async getStatus() {
    if (!this.isInitialized || !this.orchestrator) {
      return {
        isRunning: false,
        activeBots: 0,
        queuedSessions: 0,
        error: 'Not initialized'
      };
    }

    const orchestratorStatus = this.orchestrator.getStatus();
    return {
      ...orchestratorStatus,
      activeDashboardSessions: this.activeSessions.size,
      dashboardSessions: Array.from(this.activeSessions.entries()).map(([id, session]) => ({
        id,
        platform: session.platform,
        profileType: session.profileType,
        contentViewed: session.contentViewed,
        engagements: session.engagements,
        elapsed: Date.now() - session.startTime
      }))
    };
  }

  getCredentialsForPlatform(platform) {
    const credentials = {
      instagram: {
        username: process.env.INSTAGRAM_USERNAME || 'mindmatterlife',
        password: process.env.INSTAGRAM_PASSWORD || 'L0ngStr@ngeTr!p'
      },
      tiktok: {
        email: process.env.TIKTOK_EMAIL || 'mindmattermarket@gmail.com',
        password: process.env.TIKTOK_PASSWORD || 'L0ngStr@ngeTr!p'
      }
    };

    return credentials[platform] || null;
  }

  async cleanup() {
    console.log('🧹 Cleaning up Bot Engine Connector...');
    
    // Stop all active sessions
    for (const sessionId of this.activeSessions.keys()) {
      await this.stopSession(sessionId);
    }

    // Stop orchestrator
    if (this.orchestrator) {
      await this.orchestrator.stop();
    }

    this.isInitialized = false;
    console.log('✅ Bot Engine Connector cleaned up');
  }
}

module.exports = BotEngineConnector;