/**
 * Bot Orchestrator
 * Manages multiple bot instances and coordinates their activities
 */

const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');
const ICPProfileGenerator = require('./icp-profile-generator');
const InstagramBot = require('./instagram-bot');
const TikTokBot = require('./tiktok-bot');
const DataLogger = require('../data-logger/supabase-logger');
const EventEmitter = require('events');

class BotOrchestrator extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      maxConcurrentBots: parseInt(process.env.MAX_CONCURRENT_BOTS) || 5,
      sessionDuration: 300000, // 5 minutes per session
      restPeriod: 60000, // 1 minute between sessions
      platforms: ['instagram', 'tiktok'],
      ...config
    };

    this.activeBots = new Map();
    this.sessionQueue = [];
    this.isRunning = false;
    this.profileGenerator = new ICPProfileGenerator();
    this.dataLogger = new DataLogger();

    // Set up logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'orchestrator' },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple()
        }),
        new winston.transports.File({ 
          filename: 'logs/orchestrator.log' 
        })
      ]
    });

    // Bot performance metrics
    this.metrics = {
      totalSessions: 0,
      successfulSessions: 0,
      failedSessions: 0,
      totalImpressions: 0,
      totalEngagements: 0,
      platformMetrics: {}
    };
  }

  /**
   * Initialize orchestrator and data connections
   */
  async initialize() {
    try {
      this.logger.info('Initializing Bot Orchestrator...');
      
      // Initialize data logger
      await this.dataLogger.initialize();
      
      // Load or create ICP profiles
      await this.loadICPProfiles();
      
      // Set up scheduled tasks
      this.setupScheduledTasks();
      
      this.logger.info('Orchestrator initialized successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize orchestrator', { error: error.message });
      throw error;
    }
  }

  /**
   * Load ICP profiles from database or generate new ones
   */
  async loadICPProfiles() {
    try {
      // Try to load existing profiles
      const existingProfiles = await this.dataLogger.getActiveICPProfiles();
      
      if (existingProfiles.length === 0) {
        this.logger.info('No existing profiles found, generating new ones...');
        
        // Generate initial batch of profiles
        const newProfiles = this.profileGenerator.generateBatch(10);
        
        // Save to database
        for (const profile of newProfiles) {
          await this.dataLogger.saveICPProfile(profile);
        }
        
        this.icpProfiles = newProfiles;
      } else {
        this.icpProfiles = existingProfiles;
      }
      
      this.logger.info(`Loaded ${this.icpProfiles.length} ICP profiles`);
    } catch (error) {
      this.logger.error('Error loading ICP profiles', { error: error.message });
      // Generate temporary profiles as fallback
      this.icpProfiles = this.profileGenerator.generateBatch(5);
    }
  }

  /**
   * Set up scheduled tasks
   */
  setupScheduledTasks() {
    // Run bot sessions every 15 minutes
    cron.schedule('*/15 * * * *', () => {
      if (!this.isRunning) {
        this.runScheduledSessions();
      }
    });

    // Generate trend reports every hour
    cron.schedule('0 * * * *', () => {
      this.generateHourlyReport();
    });

    // Clean up old data daily
    cron.schedule('0 0 * * *', () => {
      this.performDailyMaintenance();
    });

    this.logger.info('Scheduled tasks configured');
  }

  /**
   * Run scheduled bot sessions
   */
  async runScheduledSessions() {
    this.logger.info('Starting scheduled bot sessions...');
    
    // Create sessions for each platform and profile combination
    const sessions = [];
    
    for (const profile of this.icpProfiles) {
      for (const platform of this.config.platforms) {
        sessions.push({
          id: uuidv4(),
          profile,
          platform,
          scheduledTime: new Date()
        });
      }
    }
    
    // Add to queue
    this.sessionQueue.push(...sessions);
    
    // Start processing
    this.startProcessing();
  }

  /**
   * Start processing bot sessions
   */
  async startProcessing() {
    if (this.isRunning) {
      this.logger.warn('Processing already in progress');
      return;
    }

    this.isRunning = true;
    this.logger.info('Starting session processing...');

    while (this.sessionQueue.length > 0 && this.isRunning) {
      // Check if we can start more bots
      if (this.activeBots.size < this.config.maxConcurrentBots) {
        const session = this.sessionQueue.shift();
        this.startBotSession(session);
      }

      // Wait before checking again
      await this.sleep(5000);
    }

    // Wait for all active bots to complete
    while (this.activeBots.size > 0) {
      await this.sleep(10000);
    }

    this.isRunning = false;
    this.logger.info('Session processing completed');
  }

  /**
   * Start individual bot session
   */
  async startBotSession(session) {
    const { id, profile, platform } = session;
    
    this.logger.info('Starting bot session', { 
      sessionId: id, 
      profile: profile.profileName, 
      platform 
    });

    try {
      let bot;
      
      // Create appropriate bot instance
      const botConfig = {
        headless: false, // Show browser window
        proxyUrl: this.getProxyUrl(),
        credentials: session.credentials
      };

      switch (platform) {
        case 'instagram':
          bot = new InstagramBot(profile, botConfig);
          break;
          
        case 'tiktok':
          bot = new TikTokBot(profile, botConfig);
          break;
          
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      // Set up event forwarding from bot to orchestrator
      bot.on('content-discovered', (data) => {
        // Forward to orchestrator listeners with session info
        this.emit('bot-content-discovered', {
          sessionId: id,
          ...data
        });
      });

      bot.on('engagement', (data) => {
        this.emit('bot-engagement', {
          sessionId: id,
          ...data
        });
      });

      bot.on('status', (data) => {
        this.emit('bot-status', {
          sessionId: id,
          ...data
        });
      });

      bot.on('error', (data) => {
        this.emit('bot-error', {
          sessionId: id,
          ...data
        });
      });

      bot.on('session-complete', (data) => {
        this.emit('bot-session-complete', {
          sessionId: id,
          ...data
        });
      });

      // Track active bot
      this.activeBots.set(id, {
        bot,
        session,
        startTime: new Date()
      });

      // Start bot session
      const sessionPromise = this.runBot(bot, session);
      
      // Don't await here - let it run in background
      sessionPromise
        .then(result => this.handleSessionComplete(id, result))
        .catch(error => this.handleSessionError(id, error));

    } catch (error) {
      this.logger.error('Failed to start bot session', { 
        sessionId: id, 
        error: error.message 
      });
      this.metrics.failedSessions++;
    }
  }

  /**
   * Run bot and collect data
   */
  async runBot(bot, session) {
    const startTime = Date.now();
    
    try {
      // Run bot session
      const result = await bot.start({
        duration: this.config.sessionDuration
      });

      // Log session data
      const sessionData = {
        id: session.id,
        icpProfileId: session.profile.id,
        platform: session.platform,
        startTime: new Date(startTime),
        endTime: new Date(),
        status: 'completed',
        metrics: result
      };

      await this.dataLogger.saveBotSession(sessionData);

      // Save impressions and engagements
      for (const impression of bot.impressions) {
        await this.dataLogger.saveImpression(impression);
      }

      for (const engagement of bot.engagements) {
        await this.dataLogger.saveEngagement(engagement);
      }

      // Update metrics
      this.metrics.totalSessions++;
      this.metrics.successfulSessions++;
      this.metrics.totalImpressions += bot.impressions.length;
      this.metrics.totalEngagements += bot.engagements.length;

      return result;
    } catch (error) {
      this.logger.error('Bot session error', { 
        sessionId: session.id,
        error: error.message 
      });
      
      // Log failed session
      await this.dataLogger.saveBotSession({
        id: session.id,
        icpProfileId: session.profile.id,
        platform: session.platform,
        startTime: new Date(startTime),
        endTime: new Date(),
        status: 'failed',
        errorLog: error.message
      });

      throw error;
    }
  }

  /**
   * Handle successful session completion
   */
  handleSessionComplete(sessionId, result) {
    this.logger.info('Bot session completed', { 
      sessionId, 
      impressions: result.impressions,
      engagements: result.engagements 
    });

    // Remove from active bots
    this.activeBots.delete(sessionId);

    // Schedule rest period before next session for this profile
    const { session } = this.activeBots.get(sessionId) || {};
    if (session) {
      setTimeout(() => {
        // Re-queue the profile for another session
        this.sessionQueue.push({
          ...session,
          id: uuidv4(),
          scheduledTime: new Date()
        });
      }, this.config.restPeriod);
    }
  }

  /**
   * Handle session error
   */
  handleSessionError(sessionId, error) {
    this.logger.error('Bot session failed', { 
      sessionId, 
      error: error.message 
    });

    this.metrics.failedSessions++;
    this.activeBots.delete(sessionId);
  }

  /**
   * Get proxy URL for bot
   */
  getProxyUrl() {
    // Implement proxy rotation logic here
    if (process.env.PROXY_ENDPOINT) {
      // Could implement round-robin or random selection from proxy pool
      return process.env.PROXY_ENDPOINT;
    }
    return null;
  }

  /**
   * Generate hourly trend report
   */
  async generateHourlyReport() {
    try {
      this.logger.info('Generating hourly trend report...');
      
      const report = await this.dataLogger.generateTrendReport({
        timeRange: '1h',
        groupBy: 'platform'
      });

      // Log key metrics
      this.logger.info('Hourly Report', {
        totalImpressions: report.totalImpressions,
        totalEngagements: report.totalEngagements,
        topCreators: report.topCreators.slice(0, 5),
        trendingHashtags: report.trendingHashtags.slice(0, 10)
      });

      // Check for alerts
      await this.checkForAlerts(report);

    } catch (error) {
      this.logger.error('Failed to generate hourly report', { 
        error: error.message 
      });
    }
  }

  /**
   * Check for alert conditions
   */
  async checkForAlerts(report) {
    // Check for viral content
    for (const content of report.viralContent || []) {
      if (content.viralityScore > 80) {
        await this.dataLogger.createAlert({
          alertType: 'virality_spike',
          severity: 'high',
          alertData: {
            content,
            message: `Viral content detected: ${content.caption?.substring(0, 50)}...`
          }
        });
      }
    }

    // Check for competitor activity
    // Add more alert conditions as needed
  }

  /**
   * Perform daily maintenance
   */
  async performDailyMaintenance() {
    try {
      this.logger.info('Performing daily maintenance...');
      
      // Clean up old sessions
      await this.dataLogger.cleanupOldSessions(30); // 30 days retention
      
      // Aggregate daily metrics
      await this.dataLogger.aggregateDailyMetrics();
      
      // Reset daily counters
      this.metrics.totalSessions = 0;
      this.metrics.successfulSessions = 0;
      this.metrics.failedSessions = 0;
      
      this.logger.info('Daily maintenance completed');
    } catch (error) {
      this.logger.error('Daily maintenance failed', { 
        error: error.message 
      });
    }
  }

  /**
   * Manual session trigger
   */
  async runManualSession(options = {}) {
    const {
      profileType = 'gen_z_tech_enthusiast',
      platform = 'instagram',
      duration = this.config.sessionDuration,
      credentials
    } = options;

    this.logger.info('Starting manual bot session', options);

    // Generate specific profile
    const profile = this.profileGenerator.generateProfile(profileType);
    
    // Create session
    const session = {
      id: uuidv4(),
      profile,
      platform,
      scheduledTime: new Date(),
      manual: true,
      credentials
    };

    // Run immediately
    await this.startBotSession(session);
    
    return session.id;
  }

  /**
   * Get orchestrator status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeBots: this.activeBots.size,
      queuedSessions: this.sessionQueue.length,
      metrics: this.metrics,
      profiles: this.icpProfiles.map(p => ({
        id: p.id,
        name: p.profileName,
        type: p.interests[0]
      }))
    };
  }

  /**
   * Stop orchestrator
   */
  async stop() {
    this.logger.info('Stopping orchestrator...');
    this.isRunning = false;
    
    // Wait for active bots to complete
    const timeout = setTimeout(() => {
      this.logger.warn('Force stopping active bots...');
      for (const [id, botInfo] of this.activeBots) {
        botInfo.bot.cleanup();
      }
    }, 30000);

    while (this.activeBots.size > 0) {
      await this.sleep(1000);
    }

    clearTimeout(timeout);
    this.logger.info('Orchestrator stopped');
  }

  /**
   * Utility sleep function
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Start orchestrator if run directly
if (require.main === module) {
  const orchestrator = new BotOrchestrator();
  
  orchestrator.initialize()
    .then(() => {
      console.log('Bot Orchestrator started successfully');
      
      // Start initial sessions
      orchestrator.runScheduledSessions();
    })
    .catch(error => {
      console.error('Failed to start orchestrator:', error);
      process.exit(1);
    });

  // Handle shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down orchestrator...');
    await orchestrator.stop();
    process.exit(0);
  });
}

module.exports = BotOrchestrator;