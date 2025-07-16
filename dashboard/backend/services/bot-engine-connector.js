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

      // Start manual session through orchestrator
      const orchestratorSessionId = await this.orchestrator.runManualSession({
        profileType,
        platform,
        duration: duration || 300000
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

      // Set up event forwarding
      this.setupEventForwarding(sessionId, socket);

      // Emit session started event
      socket.emit('bot-started', { sessionId });

      return sessionId;
      
    } catch (error) {
      console.error('❌ Error starting bot-engine session:', error);
      socket.emit('bot-error', { error: error.message });
      throw error;
    }
  }

  setupEventForwarding(sessionId, socket) {
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

      // Simulate content discovery events for now
      // In a full implementation, we'd need to modify the bot-engine to emit these events
      if (orchestratorStatus.isRunning && Math.random() < 0.3) {
        session.contentViewed++;
        
        // Simulate discovered content
        const simulatedContent = {
          platform: session.platform,
          contentType: 'reel',
          contentId: `${session.platform}_${Date.now()}`,
          creator: `creator_${Math.floor(Math.random() * 1000)}`,
          music: 'Original audio',
          url: `https://www.${session.platform}.com/content/${Date.now()}`,
          likes: Math.floor(Math.random() * 10000),
          comments: Math.floor(Math.random() * 500),
          timestamp: new Date().toISOString(),
          dwellTime: Math.floor(Math.random() * 10) + 3
        };

        // Record in database
        await this.dataRecorder.recordContentImpression(sessionId, simulatedContent);

        // Emit to frontend
        socket.emit('content-discovered', {
          sessionId,
          content: simulatedContent,
          stats: {
            contentViewed: session.contentViewed,
            engagements: session.engagements,
            trendsFound: 0
          }
        });
      }

      // Check if session should end
      const elapsed = Date.now() - session.startTime;
      if (elapsed > (session.duration || 300000)) {
        await this.stopSession(sessionId);
        clearInterval(sessionCheck);
      }
    }, 3000);
  }

  async stopSession(sessionId) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        console.warn(`⚠️ Session ${sessionId} not found for stopping`);
        return;
      }

      console.log(`🛑 Stopping bot-engine session: ${sessionId}`);

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