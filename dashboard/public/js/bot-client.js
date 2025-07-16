/**
 * Bot Client - Connects frontend to backend bot service
 */

class BotClient {
    constructor() {
        this.socket = null;
        this.backendUrl = 'http://localhost:3001'; // Update this to your backend URL
        this.currentSession = null;
        this.dataService = new BotDataService();
        this.callbacks = {
            onStatusUpdate: null,
            onContentDiscovered: null,
            onSessionComplete: null,
            onError: null
        };
    }

    connect() {
        if (this.socket) return;

        this.socket = io(this.backendUrl, {
            transports: ['websocket', 'polling']
        });

        this.socket.on('connect', () => {
            console.log('Connected to bot backend');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from bot backend');
        });

        this.socket.on('bot-started', (data) => {
            this.currentSession = data.sessionId;
            if (this.callbacks.onStatusUpdate) {
                this.callbacks.onStatusUpdate('started', data);
            }
        });

        this.socket.on('bot-status', (data) => {
            if (this.callbacks.onStatusUpdate) {
                this.callbacks.onStatusUpdate(data.status, data);
            }
        });

        this.socket.on('content-discovered', (data) => {
            if (this.callbacks.onContentDiscovered) {
                this.callbacks.onContentDiscovered(data);
            }
        });

        this.socket.on('session-complete', (data) => {
            this.currentSession = null;
            if (this.callbacks.onSessionComplete) {
                this.callbacks.onSessionComplete(data);
            }
        });

        this.socket.on('bot-error', (data) => {
            if (this.callbacks.onError) {
                this.callbacks.onError(data.error);
            }
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    startBot(platform, profileType, duration) {
        if (!this.socket) {
            this.connect();
        }

        return new Promise((resolve, reject) => {
            this.socket.emit('start-bot', {
                platform,
                profileType,
                duration
            });

            // Set up one-time listeners for response
            const handleStarted = (data) => {
                this.socket.off('bot-started', handleStarted);
                this.socket.off('bot-error', handleError);
                resolve(data);
            };

            const handleError = (data) => {
                this.socket.off('bot-started', handleStarted);
                this.socket.off('bot-error', handleError);
                reject(new Error(data.error));
            };

            this.socket.once('bot-started', handleStarted);
            this.socket.once('bot-error', handleError);

            // Timeout after 10 seconds
            setTimeout(() => {
                this.socket.off('bot-started', handleStarted);
                this.socket.off('bot-error', handleError);
                reject(new Error('Bot start timeout'));
            }, 10000);
        });
    }

    stopBot(sessionId = null) {
        if (!this.socket) return;

        this.socket.emit('stop-bot', {
            sessionId: sessionId || this.currentSession
        });
    }

    // Set callback handlers
    onStatusUpdate(callback) {
        this.callbacks.onStatusUpdate = callback;
    }

    onContentDiscovered(callback) {
        this.callbacks.onContentDiscovered = callback;
    }

    onSessionComplete(callback) {
        this.callbacks.onSessionComplete = callback;
    }

    onError(callback) {
        this.callbacks.onError = callback;
    }

    // API methods for fetching data
    async fetchSessions() {
        try {
            const response = await fetch(`${this.backendUrl}/api/sessions`);
            const data = await response.json();
            return data.success ? data.data : [];
        } catch (error) {
            console.error('Error fetching sessions:', error);
            return [];
        }
    }

    async fetchContent(filters = {}) {
        try {
            const params = new URLSearchParams(filters);
            const response = await fetch(`${this.backendUrl}/api/content?${params}`);
            const data = await response.json();
            return data.success ? data.data : [];
        } catch (error) {
            console.error('Error fetching content:', error);
            return [];
        }
    }

    async fetchTrends(filters = {}) {
        try {
            const params = new URLSearchParams(filters);
            const response = await fetch(`${this.backendUrl}/api/trends?${params}`);
            const data = await response.json();
            return data.success ? data.data : [];
        } catch (error) {
            console.error('Error fetching trends:', error);
            return [];
        }
    }

    async fetchStats(filters = {}) {
        try {
            const params = new URLSearchParams(filters);
            const response = await fetch(`${this.backendUrl}/api/stats?${params}`);
            const data = await response.json();
            return data.success ? data.data : {};
        } catch (error) {
            console.error('Error fetching stats:', error);
            return {};
        }
    }
}

// Create global instance
window.botClient = new BotClient();