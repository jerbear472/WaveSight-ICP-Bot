/**
 * Dashboard Server
 * Express server for the ICPScope client-facing dashboard
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const winston = require('winston');
const BotOrchestrator = require('../bot-engine/orchestrator');
const TrendProcessor = require('../analytics/trend-processor');
const SupabaseLogger = require('../data-logger/supabase-logger');

class DashboardServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || process.env.DASHBOARD_PORT || 3000;
    
    // Initialize services
    this.orchestrator = new BotOrchestrator();
    this.trendProcessor = new TrendProcessor();
    this.dataLogger = new SupabaseLogger();
    
    // Set up logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'dashboard-server' },
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ 
          filename: 'logs/dashboard-server.log' 
        })
      ]
    });
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Set up Express middleware
   */
  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://api.supabase.co"]
        }
      }
    }));

    // CORS
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://icpscope.com', 'https://www.icpscope.com']
        : ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Static files
    this.app.use(express.static(path.join(__dirname, 'public')));

    // Request logging
    this.app.use((req, res, next) => {
      this.logger.info('Request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });
  }

  /**
   * Set up API routes
   */
  setupRoutes() {
    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });

    // Engagement Feed API
    try {
      const engagementFeedRouter = require('./api/engagement-feed');
      this.app.use('/api/engagement-feed', engagementFeedRouter);
      this.logger.info('Engagement Feed API routes loaded');
    } catch (error) {
      this.logger.warn('Engagement Feed API not available', { error: error.message });
    }

    // System status
    this.app.get('/api/status', async (req, res) => {
      try {
        const status = {
          orchestrator: this.orchestrator.getStatus(),
          database: await this.checkDatabaseHealth(),
          timestamp: new Date().toISOString()
        };
        res.json(status);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // ICP Profiles
    this.app.get('/api/icp-profiles', async (req, res) => {
      try {
        const profiles = await this.dataLogger.getActiveICPProfiles();
        res.json(profiles);
      } catch (error) {
        this.logger.error('Failed to get ICP profiles', { error: error.message });
        res.status(500).json({ error: error.message });
      }
    });

    // Trend analytics
    this.app.get('/api/trends', async (req, res) => {
      try {
        const {
          timeRange = '24h',
          platform = null,
          icpProfile = null
        } = req.query;

        const trends = await this.dataLogger.generateTrendReport({
          timeRange,
          platform,
          icpProfileId: icpProfile
        });

        res.json(trends);
      } catch (error) {
        this.logger.error('Failed to get trends', { error: error.message });
        res.status(500).json({ error: error.message });
      }
    });

    // Viral content
    this.app.get('/api/viral-content', async (req, res) => {
      try {
        const { timeRange = '24h' } = req.query;
        const viralContent = await this.trendProcessor.detectViralContent(timeRange);
        res.json(viralContent);
      } catch (error) {
        this.logger.error('Failed to get viral content', { error: error.message });
        res.status(500).json({ error: error.message });
      }
    });

    // Breakout creators
    this.app.get('/api/breakout-creators', async (req, res) => {
      try {
        const { timeRange = '7d' } = req.query;
        const creators = await this.trendProcessor.identifyBreakoutCreators(timeRange);
        res.json(creators);
      } catch (error) {
        this.logger.error('Failed to get breakout creators', { error: error.message });
        res.status(500).json({ error: error.message });
      }
    });

    // Hashtag trends
    this.app.get('/api/hashtag-trends', async (req, res) => {
      try {
        const { timeRange = '24h' } = req.query;
        const hashtags = await this.trendProcessor.analyzeHashtagTrends(timeRange);
        res.json(hashtags);
      } catch (error) {
        this.logger.error('Failed to get hashtag trends', { error: error.message });
        res.status(500).json({ error: error.message });
      }
    });

    // Anomaly detection
    this.app.get('/api/anomalies', async (req, res) => {
      try {
        const { timeRange = '24h' } = req.query;
        const anomalies = await this.trendProcessor.performAnomalyDetection(timeRange);
        res.json(anomalies);
      } catch (error) {
        this.logger.error('Failed to get anomalies', { error: error.message });
        res.status(500).json({ error: error.message });
      }
    });

    // Forecasts
    this.app.get('/api/forecasts', async (req, res) => {
      try {
        const { timeRange = '7d' } = req.query;
        const forecasts = await this.trendProcessor.generateContentForecasts(timeRange);
        res.json(forecasts);
      } catch (error) {
        this.logger.error('Failed to get forecasts', { error: error.message });
        res.status(500).json({ error: error.message });
      }
    });

    // ICP behavior analysis
    this.app.get('/api/icp-behavior', async (req, res) => {
      try {
        const { timeRange = '7d' } = req.query;
        const behavior = await this.trendProcessor.analyzeICPBehaviorPatterns(timeRange);
        res.json(behavior);
      } catch (error) {
        this.logger.error('Failed to get ICP behavior', { error: error.message });
        res.status(500).json({ error: error.message });
      }
    });

    // Competitor activity
    this.app.get('/api/competitors', async (req, res) => {
      try {
        const { timeRange = '24h' } = req.query;
        const activity = await this.trendProcessor.detectCompetitorActivity(timeRange);
        res.json(activity);
      } catch (error) {
        this.logger.error('Failed to get competitor activity', { error: error.message });
        res.status(500).json({ error: error.message });
      }
    });

    // Bot management
    this.app.post('/api/bot/start', async (req, res) => {
      try {
        const {
          profileType = 'gen_z_tech_enthusiast',
          platform = 'instagram',
          duration = 300000
        } = req.body;

        const sessionId = await this.orchestrator.runManualSession({
          profileType,
          platform,
          duration
        });

        res.json({
          sessionId,
          message: 'Bot session started successfully'
        });
      } catch (error) {
        this.logger.error('Failed to start bot session', { error: error.message });
        res.status(500).json({ error: error.message });
      }
    });

    // Analytics dashboard data
    this.app.get('/api/dashboard-data', async (req, res) => {
      try {
        const { timeRange = '24h' } = req.query;

        const [
          trends,
          viralContent,
          breakoutCreators,
          hashtags,
          anomalies,
          icpBehavior
        ] = await Promise.all([
          this.dataLogger.generateTrendReport({ timeRange }),
          this.trendProcessor.detectViralContent(timeRange),
          this.trendProcessor.identifyBreakoutCreators(timeRange),
          this.trendProcessor.analyzeHashtagTrends(timeRange),
          this.trendProcessor.performAnomalyDetection(timeRange),
          this.trendProcessor.analyzeICPBehaviorPatterns(timeRange)
        ]);

        const dashboardData = {
          timestamp: new Date().toISOString(),
          timeRange,
          summary: {
            totalImpressions: trends.totalImpressions,
            totalEngagements: trends.totalEngagements,
            viralContentCount: viralContent.organic?.length || 0,
            breakoutCreatorsCount: breakoutCreators.length,
            anomaliesCount: anomalies.length
          },
          trends,
          viralContent,
          breakoutCreators: breakoutCreators.slice(0, 10),
          hashtags: hashtags.slice(0, 20),
          anomalies,
          icpBehavior
        };

        res.json(dashboardData);
      } catch (error) {
        this.logger.error('Failed to get dashboard data', { error: error.message });
        res.status(500).json({ error: error.message });
      }
    });

    // Export data
    this.app.get('/api/export', async (req, res) => {
      try {
        const {
          format = 'json',
          timeRange = '24h',
          dataType = 'trends'
        } = req.query;

        let data;
        
        switch (dataType) {
          case 'trends':
            data = await this.dataLogger.generateTrendReport({ timeRange });
            break;
          case 'viral':
            data = await this.trendProcessor.detectViralContent(timeRange);
            break;
          case 'creators':
            data = await this.trendProcessor.identifyBreakoutCreators(timeRange);
            break;
          case 'hashtags':
            data = await this.trendProcessor.analyzeHashtagTrends(timeRange);
            break;
          default:
            data = await this.dataLogger.generateTrendReport({ timeRange });
        }

        if (format === 'csv') {
          const csv = this.convertToCSV(data);
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="${dataType}-${timeRange}.csv"`);
          res.send(csv);
        } else {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename="${dataType}-${timeRange}.json"`);
          res.json(data);
        }
      } catch (error) {
        this.logger.error('Failed to export data', { error: error.message });
        res.status(500).json({ error: error.message });
      }
    });

    // Serve dashboard HTML
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // Error handling
    this.app.use((error, req, res, next) => {
      this.logger.error('Server error', { error: error.message });
      res.status(500).json({ error: 'Internal server error' });
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Not found' });
    });
  }

  /**
   * Check database health
   */
  async checkDatabaseHealth() {
    try {
      const { data, error } = await this.dataLogger.supabase
        .from('icp_profiles')
        .select('count')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return { status: 'healthy', connected: true };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  /**
   * Convert data to CSV format
   */
  convertToCSV(data) {
    if (!Array.isArray(data)) {
      data = [data];
    }

    if (data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'object') {
            return JSON.stringify(value);
          }
          return String(value).replace(/"/g, '""');
        }).join(',')
      )
    ].join('\n');

    return csvContent;
  }

  /**
   * Start the server
   */
  async start() {
    try {
      // Initialize services
      await this.dataLogger.initialize();
      await this.orchestrator.initialize();
      await this.trendProcessor.initialize();

      // Start server
      this.server = this.app.listen(this.port, () => {
        this.logger.info(`Dashboard server started on port ${this.port}`);
        console.log(`🚀 ICPScope Dashboard running at http://localhost:${this.port}`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.stop());
      process.on('SIGINT', () => this.stop());

    } catch (error) {
      this.logger.error('Failed to start server', { error: error.message });
      throw error;
    }
  }

  /**
   * Stop the server
   */
  async stop() {
    this.logger.info('Stopping dashboard server...');
    
    if (this.server) {
      this.server.close(() => {
        this.logger.info('Dashboard server stopped');
      });
    }

    await this.orchestrator.stop();
    process.exit(0);
  }
}

// Start server if run directly
if (require.main === module) {
  const server = new DashboardServer();
  server.start().catch(console.error);
}

module.exports = DashboardServer;