/**
 * ICPScope Demo Server
 * Dashboard server running in demo mode without database dependencies
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const winston = require('winston');

class DemoDashboardServer {
  constructor() {
    this.app = express();
    this.port = process.env.DASHBOARD_PORT || 3000;
    
    // Set up logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.simple()
      ),
      transports: [
        new winston.transports.Console()
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
          connectSrc: ["'self'"]
        }
      }
    }));

    // CORS
    this.app.use(cors());

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Static files
    this.app.use(express.static(path.join(__dirname, 'public')));

    // Request logging
    this.app.use((req, res, next) => {
      this.logger.info(`${req.method} ${req.url}`);
      next();
    });
  }

  /**
   * Set up API routes with demo data
   */
  setupRoutes() {
    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        mode: 'demo'
      });
    });

    // System status
    this.app.get('/api/status', (req, res) => {
      res.json({
        orchestrator: {
          isRunning: false,
          activeBots: 0,
          queuedSessions: 0,
          metrics: {
            totalSessions: 0,
            successfulSessions: 0,
            failedSessions: 0
          }
        },
        database: { status: 'demo', connected: false },
        timestamp: new Date().toISOString()
      });
    });

    // Demo dashboard data
    this.app.get('/api/dashboard-data', (req, res) => {
      const { timeRange = '24h' } = req.query;
      
      const dashboardData = {
        timestamp: new Date().toISOString(),
        timeRange,
        summary: {
          totalImpressions: 12547,
          totalEngagements: 3891,
          viralContentCount: 8,
          breakoutCreatorsCount: 5,
          anomaliesCount: 2
        },
        trends: {
          totalImpressions: 12547,
          totalEngagements: 3891,
          platforms: {
            instagram: { impressions: 7892, engagements: 2341 },
            tiktok: { impressions: 4655, engagements: 1550 }
          }
        },
        viralContent: {
          organic: [
            {
              contentId: 'demo_1',
              creator: 'techinfluencer',
              platform: 'instagram',
              caption: 'Amazing new AI tool that everyone is talking about! 🤖',
              viralityScore: 87,
              metrics: { engagementRate: 0.15, likes: 45000 },
              timestamp: new Date().toISOString()
            },
            {
              contentId: 'demo_2',
              creator: 'trendsetter',
              platform: 'tiktok',
              caption: 'This trend is about to explode! Get ready 🔥',
              viralityScore: 92,
              metrics: { engagementRate: 0.23, likes: 120000 },
              timestamp: new Date().toISOString()
            }
          ]
        },
        breakoutCreators: [
          {
            creator: 'risingstar',
            platform: 'instagram',
            growthRate: 0.85,
            engagementRate: 0.12,
            growthMomentum: 0.78,
            isBreakout: true
          },
          {
            creator: 'newvoice',
            platform: 'tiktok',
            growthRate: 0.67,
            engagementRate: 0.18,
            growthMomentum: 0.65,
            isBreakout: true
          }
        ],
        hashtags: [
          {
            hashtag: '#aitrends',
            totalMentions: 1247,
            totalEngagements: 8934,
            trendingScore: 85.2,
            momentum: 0.45
          },
          {
            hashtag: '#viral',
            totalMentions: 2891,
            totalEngagements: 15678,
            trendingScore: 78.9,
            momentum: 0.23
          }
        ],
        anomalies: [
          {
            type: 'engagement_anomaly',
            severity: 'high',
            timestamp: new Date().toISOString(),
            data: {
              description: 'Unusually high engagement rate detected'
            }
          },
          {
            type: 'content_anomaly',
            severity: 'medium',
            timestamp: new Date().toISOString(),
            data: {
              description: 'High sponsored content rate detected'
            }
          }
        ]
      };

      res.json(dashboardData);
    });

    // Bot start endpoint (demo)
    this.app.post('/api/bot/start', (req, res) => {
      const { profileType, platform, duration } = req.body;
      
      // Simulate bot starting
      setTimeout(() => {
        this.logger.info(`Demo bot started: ${profileType} on ${platform}`);
      }, 1000);

      res.json({
        sessionId: 'demo_session_' + Date.now(),
        message: 'Demo bot session started (simulation only)'
      });
    });

    // Engagement Feed API (demo)
    this.app.get('/api/engagement-feed', (req, res) => {
      const mockData = [
        {
          id: 'demo_1',
          platform: 'instagram',
          contentType: 'video',
          creator: 'techguru22',
          caption: 'This AI tool just changed everything for entrepreneurs! 🤖',
          hashtags: ['#AI', '#startup', '#productivity'],
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          likes: 45200,
          dwellTimeMs: 12000,
          watchCompletionPercent: 85,
          interactions: ['liked', 'commented'],
          isTrending: true,
          isBranded: false,
          isSponsored: false,
          engagementScore: 87,
          viralityScore: 73,
          mediaUrl: 'https://via.placeholder.com/400x300/1a1e2e/00d4ff?text=AI+Tool',
          thumbnailUrl: 'https://via.placeholder.com/80x80/1a1e2e/00d4ff?text=I',
          scrollDepth: 75,
          detectedBrands: []
        },
        {
          id: 'demo_2',
          platform: 'instagram',
          contentType: 'image',
          creator: 'beautifulkoas',
          caption: 'Authentic Coach 1941 bag for sale! #coach #luxury #forsale',
          hashtags: ['#coach', '#luxury', '#forsale'],
          timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          likes: 1850,
          dwellTimeMs: 8500,
          watchCompletionPercent: null,
          interactions: ['liked'],
          isTrending: false,
          isBranded: true,
          isSponsored: false,
          engagementScore: 62,
          viralityScore: 34,
          mediaUrl: 'https://via.placeholder.com/400x300/8B4513/FFFFFF?text=Coach+Bag',
          thumbnailUrl: 'https://via.placeholder.com/80x80/1a1e2e/00d4ff?text=I',
          scrollDepth: 60,
          detectedBrands: ['coach']
        },
        {
          id: 'demo_3',
          platform: 'tiktok',
          contentType: 'video',
          creator: 'google',
          caption: 'Discover Google Cloud AI for your business 🚀',
          hashtags: ['#GoogleCloud', '#AI', '#sponsored'],
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          likes: 127000,
          dwellTimeMs: 15000,
          watchCompletionPercent: 92,
          interactions: ['liked', 'shared'],
          isTrending: true,
          isBranded: true,
          isSponsored: true,
          engagementScore: 95,
          viralityScore: 88,
          mediaUrl: 'https://via.placeholder.com/400x300/4285F4/FFFFFF?text=Google+AI',
          thumbnailUrl: 'https://via.placeholder.com/80x80/1a1e2e/00d4ff?text=T',
          scrollDepth: 90,
          detectedBrands: ['google']
        }
      ];

      res.json({
        success: true,
        data: mockData,
        stats: {
          totalItems: mockData.length,
          avgDwellTime: 11833,
          engagementRate: 100,
          trendingCount: 2,
          brandedCount: 2,
          avgEngagementScore: 81
        },
        count: mockData.length,
        timestamp: new Date().toISOString()
      });
    });

    // Export endpoint (demo)
    this.app.get('/api/export', (req, res) => {
      const { format = 'json', dataType = 'trends' } = req.query;
      
      const demoData = [
        { content: 'Demo content 1', creator: 'demo_creator', score: 85 },
        { content: 'Demo content 2', creator: 'demo_creator_2', score: 78 }
      ];

      if (format === 'csv') {
        const csv = 'content,creator,score\n' + 
                   demoData.map(row => `"${row.content}","${row.creator}",${row.score}`).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="demo-${dataType}.csv"`);
        res.send(csv);
      } else {
        res.json(demoData);
      }
    });

    // Serve dashboard HTML
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // Error handling
    this.app.use((error, req, res, next) => {
      this.logger.error('Server error:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Not found' });
    });
  }

  /**
   * Start the server
   */
  async start() {
    try {
      this.server = this.app.listen(this.port, () => {
        this.logger.info(`🚀 ICPScope Demo Dashboard running at http://localhost:${this.port}`);
        console.log(`\n🎉 ICPScope Dashboard is now running!`);
        console.log(`🔗 Open: http://localhost:${this.port}`);
        console.log(`📊 Demo Mode: No database required`);
        console.log(`🛑 Press Ctrl+C to stop\n`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.stop());
      process.on('SIGINT', () => this.stop());

    } catch (error) {
      this.logger.error('Failed to start server:', error.message);
      throw error;
    }
  }

  /**
   * Stop the server
   */
  async stop() {
    console.log('\n🛑 Stopping ICPScope Dashboard...');
    
    if (this.server) {
      this.server.close(() => {
        this.logger.info('Dashboard server stopped');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  }
}

// Start demo server if run directly
if (require.main === module) {
  const server = new DemoDashboardServer();
  server.start().catch(console.error);
}

module.exports = DemoDashboardServer;