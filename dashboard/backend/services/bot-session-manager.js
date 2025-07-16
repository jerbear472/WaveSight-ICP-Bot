/**
 * Bot Session Manager
 * Manages active bot sessions and handles lifecycle
 */

class BotSessionManager {
    constructor(supabase, io) {
        this.supabase = supabase;
        this.io = io;
        this.activeSessions = new Map();
    }

    async createSession(config) {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            // Create session in database
            const { data, error } = await this.supabase
                .from('bot_sessions')
                .insert({
                    session_id: sessionId,
                    bot_type: 'surfer_bot',
                    platform: config.platform,
                    profile_type: config.profileType,
                    start_time: new Date().toISOString(),
                    status: 'active'
                })
                .select()
                .single();

            if (error) throw error;

            // Store session info
            this.activeSessions.set(sessionId, {
                id: sessionId,
                bot: null,
                socketId: config.socketId,
                platform: config.platform,
                profileType: config.profileType,
                startTime: Date.now(),
                duration: config.duration || 300000 // Default 5 minutes
            });

            // Set auto-stop timer
            setTimeout(() => {
                this.stopSession(sessionId);
            }, config.duration || 300000);

            return data;
            
        } catch (error) {
            console.error('Error creating session:', error);
            throw error;
        }
    }

    async stopSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        
        if (!session) {
            console.log('Session not found:', sessionId);
            return;
        }

        try {
            // Stop the bot if it exists
            if (session.bot && session.bot.stop) {
                await session.bot.stop();
            }

            // Update session status
            const { error } = await this.supabase
                .from('bot_sessions')
                .update({
                    status: 'completed',
                    end_time: new Date().toISOString()
                })
                .eq('session_id', sessionId);

            if (error) throw error;

            // Remove from active sessions
            this.activeSessions.delete(sessionId);

            // Notify client
            if (session.socketId) {
                this.io.to(session.socketId).emit('session-stopped', { sessionId });
            }

        } catch (error) {
            console.error('Error stopping session:', error);
            throw error;
        }
    }

    setSessionBot(sessionId, bot) {
        const session = this.activeSessions.get(sessionId);
        if (session) {
            session.bot = bot;
        }
    }

    cleanupSocketSessions(socketId) {
        // Find and stop all sessions for this socket
        for (const [sessionId, session] of this.activeSessions) {
            if (session.socketId === socketId) {
                this.stopSession(sessionId);
            }
        }
    }

    getActiveSessionCount() {
        return this.activeSessions.size;
    }

    getSessionInfo(sessionId) {
        return this.activeSessions.get(sessionId);
    }
}

module.exports = BotSessionManager;