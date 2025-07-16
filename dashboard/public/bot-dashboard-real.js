/**
 * Real Bot Dashboard JavaScript
 * Connects to actual bot backend for real Chrome automation
 */

class RealBotDashboard {
    constructor() {
        this.bots = {
            instagram: {
                status: 'idle',
                sessionTime: 0,
                contentCount: 0,
                engagements: 0,
                trends: 0,
                activity: 'Waiting to start',
                progress: 0,
                sessionId: null,
                startTime: null,
                isRunning: false
            },
            tiktok: {
                status: 'idle',
                sessionTime: 0,
                contentCount: 0,
                engagements: 0,
                trends: 0,
                activity: 'Waiting to start',
                progress: 0,
                sessionId: null,
                startTime: null,
                isRunning: false
            }
        };
        
        this.activityFeed = [];
        this.sessionLogs = [];
        this.botClient = window.botClient;
        this.currentProfileType = 'gen_z_tech_enthusiast'; // Default profile
        this.sessionDuration = 300000; // 5 minutes default
        
        this.initialize();
    }

    initialize() {
        console.log('🤖 Real Bot Dashboard initializing...');
        
        // Connect to backend
        if (this.botClient) {
            this.botClient.connect();
            this.setupBotClientCallbacks();
        } else {
            console.error('Bot client not found! Make sure bot-client.js is loaded');
            this.addActivityFeedItem('system', '❌ Bot client not loaded - check script includes', 'error');
        }
        
        // Start timers
        this.startSessionTimers();
        
        // Initialize UI
        this.addActivityFeedItem('system', '🚀 Real Bot Dashboard initialized. Ready to control actual bots!', 'welcome');
        console.log('✅ Real Bot Dashboard ready');
    }

    setupBotClientCallbacks() {
        // Connection status
        this.botClient.onStatusUpdate = (status, data) => {
            console.log('Bot status update:', status, data);
            
            // Determine which platform from the session data
            const platform = data.platform || this.getCurrentPlatform(data.sessionId);
            if (!platform) return;
            
            const bot = this.bots[platform];
            
            switch(status) {
                case 'started':
                    bot.status = 'starting';
                    bot.activity = 'Bot starting...';
                    bot.sessionId = data.sessionId;
                    this.updateBotCard(platform);
                    break;
                    
                case 'logged_in':
                    bot.status = 'scrolling';
                    bot.activity = '✅ Logged in! Starting to scroll...';
                    this.addActivityFeedItem(platform, 'Successfully logged into ' + platform, 'success');
                    this.updateBotCard(platform);
                    break;
                    
                case 'scrolling':
                    bot.status = 'scrolling';
                    bot.activity = '📱 Scrolling through feed...';
                    this.updateBotCard(platform);
                    break;
                    
                case 'captcha_detected':
                    bot.status = 'paused';
                    bot.activity = '⚠️ CAPTCHA detected - human help needed!';
                    this.showCaptchaAlert(platform);
                    break;
                    
                default:
                    if (data.message) {
                        bot.activity = data.message;
                        this.updateBotCard(platform);
                    }
            }
        };

        // Content discovered
        this.botClient.onContentDiscovered = (data) => {
            console.log('Content discovered:', data);
            
            const platform = data.content.platform;
            const bot = this.bots[platform];
            
            if (bot) {
                bot.contentCount++;
                
                // Check if it's trending
                if (data.content.metrics && data.content.metrics.likes > 10000) {
                    bot.trends++;
                }
                
                // Add to activity feed
                const creator = data.content.creatorUsername || data.content.creator || 'unknown';
                const caption = data.content.caption || 'No caption';
                this.addActivityFeedItem(
                    platform, 
                    `Viewed: @${creator} - ${caption.substring(0, 50)}...`, 
                    'content'
                );
                
                // Add to session logs
                this.addSessionLog(
                    platform,
                    'Content View',
                    data.content.contentId,
                    creator,
                    `${data.content.metrics?.likes || 0} likes`,
                    'viewed'
                );
                
                this.updateBotCard(platform);
            }
        };

        // Session complete
        this.botClient.onSessionComplete = (data) => {
            console.log('Session complete:', data);
            const platform = this.getCurrentPlatform(data.sessionId);
            if (platform) {
                this.handleBotStopped(platform, data);
            }
        };

        // Errors
        this.botClient.onError = (error) => {
            console.error('Bot error:', error);
            this.addActivityFeedItem('system', `❌ Error: ${error}`, 'error');
            
            // Try to determine which bot failed
            Object.keys(this.bots).forEach(platform => {
                if (this.bots[platform].isRunning) {
                    this.bots[platform].status = 'error';
                    this.bots[platform].activity = 'Error: ' + error;
                    this.updateBotCard(platform);
                }
            });
        };
    }

    async startBot(platform) {
        const bot = this.bots[platform];
        
        if (bot.isRunning) {
            this.addActivityFeedItem(platform, `${platform} bot is already running`, 'error');
            return;
        }

        try {
            // Get configuration from modal
            const duration = parseInt(document.getElementById('sessionDuration').value || 5) * 60000;
            const profileType = this.currentProfileType;
            
            // Update UI immediately
            bot.status = 'starting';
            bot.activity = 'Connecting to backend...';
            bot.sessionId = null;
            bot.startTime = Date.now();
            bot.isRunning = true;
            bot.contentCount = 0;
            bot.engagements = 0;
            bot.trends = 0;
            
            this.updateBotCard(platform);
            this.addActivityFeedItem(platform, `🚀 Starting REAL ${platform} bot - Chrome will open!`, 'system');
            
            // Start the real bot
            const result = await this.botClient.startBot(platform, profileType, duration);
            
            bot.sessionId = result.sessionId;
            bot.activity = '🟢 Bot running - check Chrome window!';
            
            this.addActivityFeedItem(platform, `✅ ${platform} bot started successfully!`, 'success');
            this.addSessionLog(platform, 'Session Start', result.sessionId, '-', '-', 'running');
            
            this.updateBotCard(platform);
            
        } catch (error) {
            console.error(`Error starting ${platform} bot:`, error);
            bot.status = 'error';
            bot.activity = 'Failed to start: ' + error.message;
            bot.isRunning = false;
            this.updateBotCard(platform);
            this.addActivityFeedItem(platform, `Failed to start ${platform} bot: ${error.message}`, 'error');
        }
    }

    async stopBot(platform) {
        const bot = this.bots[platform];
        
        if (!bot.isRunning) {
            this.addActivityFeedItem(platform, `${platform} bot is not running`, 'error');
            return;
        }

        try {
            bot.status = 'stopping';
            bot.activity = 'Stopping bot...';
            this.updateBotCard(platform);
            
            if (bot.sessionId && this.botClient) {
                await this.botClient.stopBot(bot.sessionId);
            }
            
            this.handleBotStopped(platform);
            
        } catch (error) {
            console.error(`Error stopping ${platform} bot:`, error);
            this.addActivityFeedItem(platform, `Error stopping bot: ${error.message}`, 'error');
        }
    }

    handleBotStopped(platform, data = {}) {
        const bot = this.bots[platform];
        
        bot.status = 'idle';
        bot.activity = 'Session ended';
        bot.isRunning = false;
        
        // Log final stats
        const duration = bot.startTime ? Math.floor((Date.now() - bot.startTime) / 1000) : 0;
        this.addActivityFeedItem(
            platform, 
            `Session ended - ${bot.contentCount} posts viewed, ${bot.trends} trends found in ${this.formatSessionTime(duration)}`, 
            'system'
        );
        
        this.addSessionLog(platform, 'Session End', bot.sessionId || '-', '-', 
            `${bot.contentCount} views, ${bot.trends} trends`, 'completed');
        
        // Reset session data
        bot.sessionId = null;
        bot.startTime = null;
        bot.sessionTime = 0;
        bot.progress = 0;
        
        this.updateBotCard(platform);
    }

    showCaptchaAlert(platform) {
        // Show alert for captcha
        alert(`⚠️ CAPTCHA DETECTED on ${platform}!\n\nPlease complete the captcha in the Chrome window, then the bot will continue automatically.`);
        
        this.addActivityFeedItem(platform, '⚠️ CAPTCHA detected - waiting for human verification', 'warning');
    }

    emergencyStop() {
        console.log('🛑 Emergency stop activated!');
        
        Object.keys(this.bots).forEach(platform => {
            if (this.bots[platform].isRunning) {
                this.stopBot(platform);
            }
        });
        
        this.addActivityFeedItem('system', '🛑 Emergency stop - all bots halted', 'error');
    }

    configureBot(platform) {
        // Show configuration modal
        document.getElementById('configModal').style.display = 'flex';
        this.currentConfigPlatform = platform;
    }

    closeConfigModal() {
        document.getElementById('configModal').style.display = 'none';
    }

    saveConfiguration() {
        // Get configuration values
        const duration = document.getElementById('sessionDuration').value;
        const scrollSpeed = document.getElementById('scrollSpeed').value;
        const engagementRate = document.getElementById('engagementRate').value;
        
        // Map to profile types
        const profileMap = {
            'slow': 'mindfulness_seeker',
            'normal': 'gen_z_tech_enthusiast',
            'fast': 'crypto_investor'
        };
        
        this.currentProfileType = profileMap[scrollSpeed] || 'gen_z_tech_enthusiast';
        this.sessionDuration = parseInt(duration) * 60000;
        
        this.addActivityFeedItem('system', `Configuration updated: ${scrollSpeed} speed, ${engagementRate} engagement`, 'system');
        this.closeConfigModal();
    }

    // UI Update Methods
    updateBotCard(platform) {
        const bot = this.bots[platform];
        const prefix = platform === 'instagram' ? 'ig' : 'tt';
        
        // Update status indicator
        const statusDot = document.getElementById(`${prefix}StatusDot`);
        const statusText = document.getElementById(`${prefix}StatusText`);
        if (statusDot) {
            statusDot.className = `status-dot ${bot.status}`;
        }
        if (statusText) {
            statusText.textContent = bot.status.charAt(0).toUpperCase() + bot.status.slice(1);
        }
        
        // Update metrics
        document.getElementById(`${prefix}SessionTime`).textContent = this.formatSessionTime(bot.sessionTime);
        document.getElementById(`${prefix}ContentCount`).textContent = bot.contentCount;
        document.getElementById(`${prefix}Engagements`).textContent = bot.engagements;
        document.getElementById(`${prefix}Trends`).textContent = bot.trends;
        
        // Update activity
        document.getElementById(`${prefix}Activity`).textContent = bot.activity;
        
        // Update progress bar
        const progressBar = document.getElementById(`${prefix}Progress`);
        if (progressBar) {
            progressBar.style.width = `${bot.progress}%`;
        }
        
        // Update buttons
        const startBtn = document.getElementById(`${prefix}StartBtn`);
        const stopBtn = document.getElementById(`${prefix}StopBtn`);
        
        if (startBtn && stopBtn) {
            startBtn.disabled = bot.isRunning;
            stopBtn.disabled = !bot.isRunning;
        }
    }

    startSessionTimers() {
        setInterval(() => {
            Object.keys(this.bots).forEach(platform => {
                const bot = this.bots[platform];
                if (bot.isRunning && bot.startTime) {
                    bot.sessionTime = Math.floor((Date.now() - bot.startTime) / 1000);
                    
                    // Update progress based on duration
                    if (this.sessionDuration > 0) {
                        bot.progress = Math.min(100, 
                            Math.floor(((Date.now() - bot.startTime) / this.sessionDuration) * 100)
                        );
                    }
                    
                    // Update only the time and progress
                    const prefix = platform === 'instagram' ? 'ig' : 'tt';
                    document.getElementById(`${prefix}SessionTime`).textContent = this.formatSessionTime(bot.sessionTime);
                    document.getElementById(`${prefix}Progress`).style.width = `${bot.progress}%`;
                }
            });
        }, 1000);
    }

    addActivityFeedItem(platform, message, type) {
        const feedItem = {
            timestamp: new Date().toLocaleTimeString(),
            platform,
            message,
            type
        };
        
        this.activityFeed.unshift(feedItem);
        if (this.activityFeed.length > 100) {
            this.activityFeed.pop();
        }
        
        this.updateActivityFeed();
    }

    updateActivityFeed() {
        const feedContainer = document.getElementById('activityFeed');
        if (!feedContainer) return;
        
        const feedHTML = this.activityFeed.map(item => `
            <div class="feed-item ${item.type}">
                <div class="feed-timestamp">${item.timestamp}</div>
                <div class="feed-content">
                    <span class="feed-platform">${this.getPlatformIcon(item.platform)}</span>
                    <span class="feed-message">${item.message}</span>
                </div>
            </div>
        `).join('');
        
        feedContainer.innerHTML = feedHTML;
    }

    addSessionLog(platform, action, contentId, creator, metrics, status) {
        const log = {
            timestamp: new Date().toLocaleTimeString(),
            platform,
            action,
            contentId,
            creator,
            metrics,
            status
        };
        
        this.sessionLogs.unshift(log);
        if (this.sessionLogs.length > 500) {
            this.sessionLogs.pop();
        }
        
        this.updateSessionLogs();
    }

    updateSessionLogs() {
        const tbody = document.getElementById('logsTableBody');
        if (!tbody) return;
        
        const logsHTML = this.sessionLogs.map(log => `
            <tr class="log-entry ${log.status}">
                <td class="timestamp">${log.timestamp}</td>
                <td class="platform">${this.getPlatformIcon(log.platform)} ${log.platform}</td>
                <td class="action">${log.action}</td>
                <td class="content-id">${log.contentId}</td>
                <td class="creator">${log.creator}</td>
                <td class="metrics">${log.metrics}</td>
                <td class="status ${log.status}">${log.status}</td>
            </tr>
        `).join('');
        
        tbody.innerHTML = logsHTML;
    }

    // Utility Methods
    getCurrentPlatform(sessionId) {
        for (const [platform, bot] of Object.entries(this.bots)) {
            if (bot.sessionId === sessionId) {
                return platform;
            }
        }
        return null;
    }

    getPlatformIcon(platform) {
        const icons = {
            instagram: '📱',
            tiktok: '🎵',
            system: '⚙️'
        };
        return icons[platform] || '📱';
    }

    formatSessionTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    clearFeed() {
        this.activityFeed = [];
        this.updateActivityFeed();
        this.addActivityFeedItem('system', 'Activity feed cleared', 'system');
    }

    filterFeed(type) {
        // Implementation for filtering
        console.log('Filter feed by:', type);
    }

    exportLogs() {
        const csv = this.convertLogsToCSV(this.sessionLogs);
        this.downloadCSV(csv, `bot-logs-${new Date().toISOString().split('T')[0]}.csv`);
        this.addActivityFeedItem('system', `Exported ${this.sessionLogs.length} log entries`, 'system');
    }

    convertLogsToCSV(logs) {
        const headers = ['Timestamp', 'Platform', 'Action', 'Content ID', 'Creator', 'Metrics', 'Status'];
        const rows = logs.map(log => [
            log.timestamp, log.platform, log.action, log.contentId, log.creator, log.metrics, log.status
        ]);
        
        return [headers, ...rows].map(row => 
            row.map(field => `"${field}"`).join(',')
        ).join('\n');
    }

    downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }
}

// Global functions for HTML onclick handlers
let dashboard;

function startBot(platform) {
    dashboard.startBot(platform);
}

function stopBot(platform) {
    dashboard.stopBot(platform);
}

function emergencyStop() {
    dashboard.emergencyStop();
}

function configureBot(platform) {
    dashboard.configureBot(platform);
}

function closeConfigModal() {
    dashboard.closeConfigModal();
}

function saveConfiguration() {
    dashboard.saveConfiguration();
}

function filterFeed(type) {
    dashboard.filterFeed(type);
}

function clearFeed() {
    dashboard.clearFeed();
}

function exportLogs() {
    dashboard.exportLogs();
}

// Initialize Dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Real Bot Dashboard...');
    dashboard = new RealBotDashboard();
    
    // Set up event listeners
    const logPlatform = document.getElementById('logPlatform');
    if (logPlatform) {
        logPlatform.addEventListener('change', () => {
            dashboard.filterLogs();
        });
    }
    
    // Close modal when clicking outside
    const configModal = document.getElementById('configModal');
    if (configModal) {
        configModal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                dashboard.closeConfigModal();
            }
        });
    }
});