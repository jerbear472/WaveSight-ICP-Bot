/**
 * Real Bot Controller - Handles actual bot sessions with Chrome
 */

class RealBotController {
    constructor() {
        this.currentSession = null;
        this.isRunning = false;
        this.botClient = window.botClient;
        
        // Ensure bot client is connected
        if (this.botClient) {
            this.botClient.connect();
            this.setupEventHandlers();
        }
    }

    setupEventHandlers() {
        // Handle status updates
        this.botClient.onStatusUpdate((status, data) => {
            console.log('Bot status:', status, data);
            this.updateUI(status, data);
        });

        // Handle content discovery
        this.botClient.onContentDiscovered((data) => {
            console.log('Content discovered:', data);
            this.addContentToFeed(data);
        });

        // Handle session completion
        this.botClient.onSessionComplete((data) => {
            console.log('Session complete:', data);
            this.handleSessionComplete(data);
        });

        // Handle errors
        this.botClient.onError((error) => {
            console.error('Bot error:', error);
            this.showError(error);
        });
    }

    async startRealBot(platform, profileType, duration) {
        if (this.isRunning) {
            alert('A bot session is already running!');
            return;
        }

        try {
            console.log(`Starting REAL bot: ${platform} with ${profileType} for ${duration}ms`);
            
            // Show starting message
            this.showStatus('Starting bot...', 'info');
            
            // Start the real bot
            const result = await this.botClient.startBot(platform, profileType, duration);
            
            this.currentSession = result.sessionId;
            this.isRunning = true;
            
            // Update UI
            this.showStatus(`Bot running! Check Chrome window for ${platform}`, 'success');
            this.updateStartButton(false);
            
            console.log('Bot started successfully:', result);
            
        } catch (error) {
            console.error('Failed to start bot:', error);
            this.showError(error.message);
            this.isRunning = false;
            this.updateStartButton(true);
        }
    }

    async stopBot() {
        if (!this.isRunning) return;
        
        try {
            this.botClient.stopBot(this.currentSession);
            this.isRunning = false;
            this.currentSession = null;
            this.updateStartButton(true);
            this.showStatus('Bot stopped', 'info');
        } catch (error) {
            console.error('Failed to stop bot:', error);
            this.showError(error.message);
        }
    }

    updateUI(status, data) {
        const statusElement = document.querySelector('.bot-status');
        const activityElement = document.querySelector('.bot-activity');
        
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.className = `bot-status ${status}`;
        }
        
        if (activityElement && data.message) {
            activityElement.textContent = data.message;
        }

        // Update status indicators
        if (status === 'logged_in') {
            this.showStatus('✅ Logged in successfully!', 'success');
        } else if (status === 'scrolling') {
            this.showStatus('📱 Bot is scrolling and collecting data...', 'info');
        }
    }

    addContentToFeed(data) {
        const feedElement = document.querySelector('.content-feed');
        if (!feedElement) return;
        
        const contentItem = document.createElement('div');
        contentItem.className = 'content-item';
        contentItem.innerHTML = `
            <div class="content-header">
                <span class="platform">${data.content.platform}</span>
                <span class="creator">@${data.content.creator}</span>
                <span class="time">${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="content-body">
                <p>${data.content.caption || 'No caption'}</p>
                <div class="metrics">
                    <span>👍 ${data.content.likes}</span>
                    <span>💬 ${data.content.comments}</span>
                    <span>⏱️ ${data.content.dwellTime}s</span>
                </div>
            </div>
        `;
        
        feedElement.insertBefore(contentItem, feedElement.firstChild);
        
        // Keep only last 20 items
        while (feedElement.children.length > 20) {
            feedElement.removeChild(feedElement.lastChild);
        }
        
        // Update stats
        this.updateStats(data);
    }

    updateStats(data) {
        const statsElement = document.querySelector('.session-stats');
        if (!statsElement) return;
        
        const contentViewed = parseInt(statsElement.querySelector('.content-viewed')?.textContent || 0) + 1;
        const engagements = parseInt(statsElement.querySelector('.engagements')?.textContent || 0);
        
        statsElement.innerHTML = `
            <div class="stat">
                <span class="stat-label">Content Viewed:</span>
                <span class="stat-value content-viewed">${contentViewed}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Engagements:</span>
                <span class="stat-value engagements">${engagements}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Trends Found:</span>
                <span class="stat-value trends">${data.stats?.trendsFound || 0}</span>
            </div>
        `;
    }

    handleSessionComplete(data) {
        this.isRunning = false;
        this.currentSession = null;
        this.updateStartButton(true);
        
        this.showStatus(
            `Session complete! Viewed ${data.impressions} items, ${data.engagements} engagements`,
            'success'
        );
    }

    showStatus(message, type = 'info') {
        const statusBar = document.querySelector('.status-bar') || this.createStatusBar();
        statusBar.className = `status-bar ${type}`;
        statusBar.textContent = message;
        
        // Auto-hide after 5 seconds for non-error messages
        if (type !== 'error') {
            setTimeout(() => {
                statusBar.classList.add('fade-out');
            }, 5000);
        }
    }

    showError(message) {
        this.showStatus(`Error: ${message}`, 'error');
    }

    createStatusBar() {
        const statusBar = document.createElement('div');
        statusBar.className = 'status-bar';
        document.body.appendChild(statusBar);
        return statusBar;
    }

    updateStartButton(enabled) {
        const startButtons = document.querySelectorAll('.start-btn, .start-bot-btn, #startBotBtn');
        const stopButtons = document.querySelectorAll('.stop-btn, .stop-bot-btn, #stopBotBtn');
        
        startButtons.forEach(btn => {
            btn.disabled = !enabled;
            if (enabled) {
                btn.textContent = btn.textContent.replace('Running...', 'Start Bot Session');
            } else {
                btn.textContent = btn.textContent.replace('Start Bot Session', 'Running...');
            }
        });
        
        stopButtons.forEach(btn => {
            btn.disabled = enabled;
            btn.style.display = enabled ? 'none' : 'inline-block';
        });
    }
}

// Create global instance
window.realBotController = new RealBotController();

// Override global functions to use real bot
window.startBot = function(platform) {
    // Get values from UI or use defaults
    const profileType = document.getElementById('profileType')?.value || 
                       document.getElementById('personaSelect')?.value || 
                       'gen_z_tech_enthusiast';
    const duration = parseInt(document.getElementById('duration')?.value || 
                            document.getElementById('durationSelect')?.value || 
                            300000);
    
    // If platform not provided, get from UI
    if (!platform) {
        platform = document.getElementById('platform')?.value || 
                  document.getElementById('platformSelect')?.value || 
                  'instagram';
    }
    
    console.log('Starting REAL bot with:', { platform, profileType, duration });
    window.realBotController.startRealBot(platform, profileType, duration);
};

window.stopBot = function() {
    window.realBotController.stopBot();
};

// Add styles for status bar
const style = document.createElement('style');
style.textContent = `
.status-bar {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 15px 30px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transition: all 0.3s ease;
}

.status-bar.info {
    background: #3b82f6;
}

.status-bar.success {
    background: #10b981;
}

.status-bar.error {
    background: #ef4444;
}

.status-bar.fade-out {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
}

.content-feed {
    max-height: 400px;
    overflow-y: auto;
    padding: 10px;
}

.content-item {
    background: #f3f4f6;
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 10px;
    border: 1px solid #e5e7eb;
}

.content-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
    font-size: 14px;
}

.platform {
    background: #6366f1;
    color: white;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
}

.creator {
    font-weight: 600;
    color: #4b5563;
}

.time {
    color: #9ca3af;
}

.metrics {
    display: flex;
    gap: 15px;
    margin-top: 10px;
    font-size: 14px;
    color: #6b7280;
}

.session-stats {
    display: flex;
    gap: 30px;
    padding: 20px;
    background: #f9fafb;
    border-radius: 8px;
    margin: 20px 0;
}

.stat {
    text-align: center;
}

.stat-label {
    display: block;
    font-size: 14px;
    color: #6b7280;
    margin-bottom: 5px;
}

.stat-value {
    display: block;
    font-size: 24px;
    font-weight: 700;
    color: #1f2937;
}
`;
document.head.appendChild(style);

console.log('🚀 Real Bot Controller initialized - Chrome will open when you start a bot!');