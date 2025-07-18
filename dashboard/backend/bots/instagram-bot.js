/**
 * Instagram Bot Implementation
 * Uses the working bot-engine Instagram bot
 */

const InstagramBotSimple = require('../../../bot-engine/instagram-bot-simple');
const DataRecorder = require('../services/data-recorder');

class InstagramBot {
    constructor(session, supabase, socket) {
        this.session = session;
        this.supabase = supabase;
        this.socket = socket;
        this.dataRecorder = new DataRecorder(supabase);
        this.bot = null;
        this.isRunning = false;
        this.contentViewed = 0;
        this.engagements = 0;
        this.trendsFound = 0;
    }

    async start() {
        try {
            this.isRunning = true;
            
            // Create bot session in database first
            await this.createSession();
            
            // Create bot instance with config
            const config = {
                username: process.env.INSTAGRAM_USERNAME,
                password: process.env.INSTAGRAM_PASSWORD,
                browser: this.session.browser || 'chrome',
                headless: process.env.NODE_ENV === 'production'
            };
            
            // Create instance of the working Instagram bot
            this.bot = new InstagramBotSimple(this.session.profileType || 'gen-z-tech-enthusiast', config);
            
            // Set up event handlers
            this.setupEventHandlers();
            
            // Start bot (initialize is called inside start)
            await this.bot.start({
                duration: this.session.duration,
                scrollFeed: true
            });
            
        } catch (error) {
            console.error('Instagram bot error:', error);
            this.socket.emit('bot-error', { 
                platform: 'instagram',
                error: error.message,
                sessionId: this.session.id
            });
            await this.cleanup();
        }
    }

    setupEventHandlers() {
        // Forward bot events to socket
        this.bot.on('status', (data) => {
            this.socket.emit('bot-status', {
                ...data,
                platform: 'instagram',
                sessionId: this.session.id
            });
        });

        this.bot.on('content-discovered', async (content) => {
            this.contentViewed++;
            
            // Store in database
            await this.dataRecorder.recordContentImpression(
                this.session.session_id || this.session.id,
                content
            );
            
            // Forward to socket with session info
            this.socket.emit('content-discovered', {
                sessionId: this.session.id,
                content: content,
                stats: {
                    contentViewed: this.contentViewed,
                    engagements: this.engagements,
                    trendsFound: this.trendsFound
                }
            });
        });

        this.bot.on('engagement', async (data) => {
            this.engagements++;
            
            // Record engagement
            await this.dataRecorder.recordEngagement(
                this.session.session_id || this.session.id,
                data.contentId,
                data.engagement_type,
                data.creator_username
            );
            
            // Forward to socket
            this.socket.emit('bot-engagement', {
                platform: 'instagram',
                sessionId: this.session.id,
                engagement: data
            });
        });

        this.bot.on('error', (error) => {
            this.socket.emit('bot-error', {
                platform: 'instagram',
                sessionId: this.session.id,
                error: error.message || error
            });
        });

        this.bot.on('session-complete', async (data) => {
            await this.endSession();
        });
    }

    async createSession() {
        try {
            const { error } = await this.supabase
                .from('bot_sessions')
                .insert({
                    session_id: this.session.session_id || this.session.id,
                    platform: this.session.platform,
                    profile_type: this.session.profileType,
                    duration_ms: this.session.duration,
                    status: 'running'
                });
            
            if (error) {
                console.error('Error creating session:', error);
            } else {
                console.log('✅ Bot session created in database');
            }
        } catch (error) {
            console.error('Error creating bot session:', error);
        }
    }

    async endSession() {
        try {
            // Update session in database
            const { error } = await this.supabase
                .from('bot_sessions')
                .update({
                    end_time: new Date().toISOString(),
                    content_viewed: this.contentViewed,
                    engagements: this.engagements,
                    trends_found: this.trendsFound,
                    status: 'completed'
                })
                .eq('session_id', this.session.session_id || this.session.id);
                
            if (error) throw error;
            
            this.socket.emit('session-complete', {
                platform: 'instagram',
                sessionId: this.session.id,
                stats: {
                    contentViewed: this.contentViewed,
                    engagements: this.engagements,
                    trendsFound: this.trendsFound
                },
                duration: Date.now() - this.session.startTime,
                itemsViewed: this.contentViewed
            });
            
        } catch (error) {
            console.error('Error ending session:', error);
        } finally {
            await this.cleanup();
        }
    }

    async cleanup() {
        this.isRunning = false;
        
        if (this.bot) {
            await this.bot.stop();
        }
    }

    async stop() {
        this.isRunning = false;
        if (this.bot) {
            await this.bot.stop();
        }
        await this.endSession();
    }
}

module.exports = InstagramBot;