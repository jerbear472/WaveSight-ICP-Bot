/**
 * Bot Simulation Dashboard JavaScript
 * Real-time monitoring, controls, and session logging
 */

class BotDashboard {
    constructor() {
        this.bots = {
            instagram: {
                status: 'idle',
                sessionTime: 0,
                contentCount: 0,
                engagements: 0,
                trends: 0,
                activity: 'Waiting for command',
                progress: 0,
                sessionId: null,
                startTime: null
            },
            tiktok: {
                status: 'idle',
                sessionTime: 0,
                contentCount: 0,
                engagements: 0,
                trends: 0,
                activity: 'Waiting for command',
                progress: 0,
                sessionId: null,
                startTime: null
            }
        };
        
        this.activityFeed = [];
        this.sessionLogs = [];
        this.filters = {
            feed: 'all',
            logs: 'all'
        };
        
        this.initialize();
    }

    initialize() {
        console.log('🤖 Bot Dashboard initializing...');
        
        // Start update intervals
        this.startSessionTimers();
        this.startStatusUpdates();
        
        // Initialize activity feed
        this.addActivityFeedItem('system', 'Bot Simulation Dashboard initialized. Ready to monitor social media trends.', 'welcome');
        
        // Initialize system status
        this.updateGlobalStatus();
        
        console.log('✅ Bot Dashboard ready');
    }

    // Bot Control Functions
    async startBot(platform) {
        const bot = this.bots[platform];
        
        if (bot.status === 'scrolling') {
            this.addActivityFeedItem(platform, `${platform} bot is already running`, 'error');
            return;
        }

        try {
            // Update UI immediately
            this.updateBotStatus(platform, 'scrolling');
            bot.sessionId = this.generateSessionId();
            bot.startTime = Date.now();
            bot.activity = 'Initializing session...';
            
            // Add log entry
            this.addSessionLog(platform, 'Session Start', bot.sessionId, '-', '-', 'initializing');
            this.addActivityFeedItem(platform, `${platform} bot session started - hunting for trends`, 'trending');
            
            // Simulate bot startup sequence
            await this.simulateBotStartup(platform);
            
            // Start monitoring simulation
            this.startBotMonitoring(platform);
            
            this.updateUI();
            
        } catch (error) {
            console.error(`Error starting ${platform} bot:`, error);
            this.updateBotStatus(platform, 'error');
            this.addActivityFeedItem(platform, `Failed to start ${platform} bot: ${error.message}`, 'error');
        }
    }

    async stopBot(platform) {
        const bot = this.bots[platform];
        
        if (bot.status === 'idle') {
            this.addActivityFeedItem(platform, `${platform} bot is not running`, 'error');
            return;
        }

        try {
            // Stop monitoring
            if (bot.monitoringInterval) {
                clearInterval(bot.monitoringInterval);
                bot.monitoringInterval = null;
            }

            // Update status
            this.updateBotStatus(platform, 'idle');
            bot.activity = 'Session ended';
            bot.progress = 0;
            
            // Calculate session duration
            const sessionDuration = bot.startTime ? (Date.now() - bot.startTime) / 1000 : 0;
            
            // Add final log entry
            this.addSessionLog(platform, 'Session End', bot.sessionId, '-', 
                              `Duration: ${Math.floor(sessionDuration)}s, Content: ${bot.contentCount}`, 'success');
            
            this.addActivityFeedItem(platform, 
                `${platform} bot stopped. Analyzed ${bot.contentCount} items, found ${bot.trends} trends`, 'system');
            
            this.updateUI();
            
        } catch (error) {
            console.error(`Error stopping ${platform} bot:`, error);
            this.addActivityFeedItem(platform, `Error stopping ${platform} bot: ${error.message}`, 'error');
        }
    }

    emergencyStop() {
        console.log('🛑 Emergency stop triggered');
        
        Object.keys(this.bots).forEach(platform => {
            if (this.bots[platform].status === 'scrolling') {
                this.stopBot(platform);
            }
        });
        
        this.addActivityFeedItem('system', 'Emergency stop activated - all bots stopped', 'error');
        this.updateGlobalStatus();
    }

    // Bot Simulation Functions
    async simulateBotStartup(platform) {
        const bot = this.bots[platform];
        const steps = [
            'Loading browser...',
            'Navigating to platform...',
            'Authenticating session...',
            'Loading feed...',
            'Starting trend detection...'
        ];

        for (let i = 0; i < steps.length; i++) {
            bot.activity = steps[i];
            bot.progress = ((i + 1) / steps.length) * 100;
            this.updateUI();
            await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 500));
        }

        bot.activity = 'Monitoring feed';
        bot.progress = 0;
    }

    startBotMonitoring(platform) {
        const bot = this.bots[platform];
        
        // Simulate content discovery every 3-8 seconds
        bot.monitoringInterval = setInterval(() => {
            this.simulateContentDiscovery(platform);
        }, 3000 + Math.random() * 5000);
        
        // Update activity status every 2 seconds
        bot.activityInterval = setInterval(() => {
            this.updateBotActivity(platform);
        }, 2000);
    }

    simulateContentDiscovery(platform) {
        const bot = this.bots[platform];
        
        if (bot.status !== 'scrolling') return;

        // Generate realistic content
        const content = this.generateMockContent(platform);
        bot.contentCount++;
        
        // Simulate engagement
        if (Math.random() < 0.3) {
            bot.engagements++;
        }
        
        // Check if trending
        const isTrending = this.simulateTrendDetection(content);
        if (isTrending) {
            bot.trends++;
            this.addActivityFeedItem(platform, 
                `🔥 Trending content detected: @${content.username} - ${content.caption.substring(0, 60)}...`, 
                'trending');
            
            this.addSessionLog(platform, 'Trend Detected', content.id, content.username, 
                              `${content.likes} likes, ${content.hashtags.length} hashtags`, 'success');
        }
        
        // Add to activity feed
        this.addActivityFeedItem(platform, 
            `📱 Analyzed @${content.username}: ${content.caption.substring(0, 50)}...`);
        
        // Add to session logs
        this.addSessionLog(platform, 'Content Viewed', content.id, content.username, 
                          `${content.likes} likes`, 'processing');
        
        this.updateUI();
    }

    generateMockContent(platform) {
        // Diverse creator pool
        const creatorPools = {
            instagram: [
                'techguru22', 'aiexplorer', 'cryptokid', 'mindfultech', 'startuplife',
                'fashionista_x', 'healthyvibes', 'travel_stories', 'foodie_adventures', 'fitness_journey',
                'art_collective', 'photo_daily', 'nature_lover', 'city_explorer', 'lifestyle_blog',
                'beauty_tips', 'home_decor', 'diy_crafts', 'pet_lovers', 'music_vibes',
                'dance_life', 'comedy_central', 'motivation_daily', 'entrepreneur_hub', 'student_life',
                'gamer_zone', 'book_worm', 'movie_buff', 'sports_fan', 'car_enthusiast',
                'tech_reviews', 'gadget_geek', 'coding_ninja', 'design_inspiration', 'marketing_pro'
            ],
            tiktok: [
                'genztechie', 'trendsetter', 'cryptoking', 'mindfulvibes', 'techtalks',
                'dance_viral', 'comedy_gold', 'life_hacks', 'cooking_quick', 'fashion_trends',
                'workout_motivation', 'study_tips', 'art_process', 'music_covers', 'pet_tricks',
                'travel_vlogs', 'food_reviews', 'makeup_tutorials', 'skin_care', 'hair_styles',
                'diy_projects', 'home_organization', 'plant_parent', 'gaming_clips', 'anime_fan'
            ]
        };

        // Dynamic caption templates
        const captionTemplates = [
            // Tech/AI related
            'Just discovered {tool} and it\'s revolutionizing my {process}! 🤖',
            'AI is changing {industry} faster than we thought possible 🚀',
            'The future of {tech} is here and it\'s incredible',
            'How I automated {task} and saved 10 hours per week',
            
            // Trending content
            '#normcore aesthetic taking over - minimalism is the new luxury',
            'Started #homesteading and never looked back - here\'s why',
            'The #antipastaslad trend is actually genius - try this recipe!',
            'Why everyone\'s talking about #bugatti mindset in 2024',
            
            // Lifestyle
            'Morning routine that changed my entire life perspective ✨',
            'Thrift haul: found {item} for just ${price}!',
            'Plant parent tip: {tip} saved all my dying plants 🌿',
            'Home makeover on a budget - swipe to see transformation',
            
            // Business/Finance
            'From 0 to {number}k followers in 3 months - here\'s how',
            'Side hustle idea that\'s making people ${amount}/month',
            'Investment tip: {strategy} for beginners',
            'Why I quit my {salary}k job to pursue my passion',
            
            // Health/Wellness
            'Workout routine that actually fits into busy schedule 💪',
            '5-minute meditation changed my anxiety levels completely',
            'Meal prep Sunday: {number} meals for under ${price}',
            'Mental health reminder: it\'s okay to {action}',
            
            // Entertainment
            'POV: You\'re {scenario} and {outcome} happens',
            'Tell me you\'re {trait} without telling me',
            'Things that live rent-free in my head',
            'Rating {topic} but make it chaotic'
        ];

        const hashtagGroups = [
            ['#viral', '#trending', '#fyp', '#explore', '#contentcreator'],
            ['#normcore', '#aesthetic', '#minimalism', '#style', '#fashion'],
            ['#homesteading', '#sustainable', '#offgrid', '#selfsufficient', '#garden'],
            ['#antipastaslad', '#foodie', '#recipe', '#cooking', '#viral'],
            ['#bugatti', '#mindset', '#success', '#motivation', '#luxury'],
            ['#ai', '#tech', '#future', '#innovation', '#startup'],
            ['#crypto', '#bitcoin', '#ethereum', '#investing', '#web3'],
            ['#wellness', '#mindfulness', '#selfcare', '#mentalhealth', '#meditation'],
            ['#fitness', '#workout', '#gym', '#health', '#transformation'],
            ['#entrepreneur', '#business', '#hustle', '#success', '#growth']
        ];

        // Select random creator
        const creators = creatorPools[platform] || creatorPools.instagram;
        const creator = creators[Math.floor(Math.random() * creators.length)];
        
        // Generate dynamic caption
        let caption = captionTemplates[Math.floor(Math.random() * captionTemplates.length)];
        
        // Replace placeholders
        caption = caption.replace('{tool}', ['ChatGPT', 'Midjourney', 'Notion AI', 'GitHub Copilot'][Math.floor(Math.random() * 4)]);
        caption = caption.replace('{process}', ['workflow', 'content creation', 'coding', 'design process'][Math.floor(Math.random() * 4)]);
        caption = caption.replace('{industry}', ['marketing', 'education', 'healthcare', 'finance'][Math.floor(Math.random() * 4)]);
        caption = caption.replace('{tech}', ['AI', 'blockchain', 'quantum computing', 'AR/VR'][Math.floor(Math.random() * 4)]);
        caption = caption.replace('{task}', ['email responses', 'data analysis', 'content scheduling', 'invoicing'][Math.floor(Math.random() * 4)]);
        caption = caption.replace('{item}', ['vintage jacket', 'designer bag', 'rare vinyl', 'retro camera'][Math.floor(Math.random() * 4)]);
        caption = caption.replace('{price}', Math.floor(Math.random() * 50) + 5);
        caption = caption.replace('{tip}', ['misting daily', 'bottom watering', 'indirect sunlight', 'humidity trick'][Math.floor(Math.random() * 4)]);
        caption = caption.replace('{number}', Math.floor(Math.random() * 100) + 10);
        caption = caption.replace('{amount}', (Math.floor(Math.random() * 50) + 10) * 100);
        caption = caption.replace('{strategy}', ['dollar cost averaging', 'index funds', 'dividend investing', 'compound interest'][Math.floor(Math.random() * 4)]);
        caption = caption.replace('{salary}', Math.floor(Math.random() * 50) + 50);
        caption = caption.replace('{scenario}', ['at a party', 'on a first date', 'in a job interview', 'meeting your ex'][Math.floor(Math.random() * 4)]);
        caption = caption.replace('{outcome}', ['this happens', 'chaos ensues', 'everything changes', 'plot twist'][Math.floor(Math.random() * 4)]);
        caption = caption.replace('{trait}', ['Gen Z', 'millennial', 'introvert', 'coffee addict'][Math.floor(Math.random() * 4)]);
        caption = caption.replace('{topic}', ['movies', 'songs', 'foods', 'places'][Math.floor(Math.random() * 4)]);
        
        // Generate engagement metrics
        const isViral = Math.random() > 0.85;
        const isTrending = Math.random() > 0.7;
        const baseViews = isViral ? Math.floor(Math.random() * 1000000) + 100000 : 
                         isTrending ? Math.floor(Math.random() * 100000) + 10000 : 
                         Math.floor(Math.random() * 50000) + 1000;
        const engagementRate = isViral ? 0.12 : isTrending ? 0.08 : 0.05;
        const likes = Math.floor(baseViews * engagementRate);
        
        return {
            id: `${platform}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            username: creator,
            caption: caption,
            hashtags: hashtagGroups[Math.floor(Math.random() * hashtagGroups.length)],
            likes: this.formatNumber(likes),
            views: this.formatNumber(baseViews),
            comments: this.formatNumber(Math.floor(likes * 0.1)),
            shares: this.formatNumber(Math.floor(likes * 0.05)),
            platform: platform,
            isViral: isViral,
            isTrending: isTrending
        };
    }

    simulateTrendDetection(content) {
        // Check if already marked as viral or trending
        if (content.isViral || content.isTrending) return true;
        
        const likesNum = this.parseNumber(content.likes);
        const viewsNum = this.parseNumber(content.views || content.likes);
        
        // Check for trending hashtags
        const trendingHashtags = ['#normcore', '#homesteading', '#antipastaslad', '#bugatti'];
        const hasTrendingHashtag = content.hashtags.some(tag => 
            trendingHashtags.includes(tag.toLowerCase())
        );
        
        // Check for viral keywords
        const viralKeywords = ['viral', 'trending', 'breaking', 'revolutionary', 'game changer'];
        const hasViralKeywords = viralKeywords.some(keyword => 
            content.caption.toLowerCase().includes(keyword)
        );
        
        // Calculate trend score
        const engagementRate = viewsNum > 0 ? likesNum / viewsNum : 0;
        const isTrending = hasTrendingHashtag || hasViralKeywords || 
                          engagementRate > 0.1 || viewsNum > 100000 || 
                          Math.random() < 0.15;
        
        return isTrending;
    }

    updateBotActivity(platform) {
        const bot = this.bots[platform];
        
        if (bot.status !== 'scrolling') return;

        const activities = [
            'Scrolling through feed...',
            'Analyzing content...',
            'Detecting trends...',
            'Processing hashtags...',
            'Monitoring engagement...'
        ];
        
        bot.activity = activities[Math.floor(Math.random() * activities.length)];
        bot.progress = Math.min(100, bot.progress + Math.random() * 10);
        
        if (bot.progress >= 100) {
            bot.progress = 0;
        }
    }

    // Status Management
    updateBotStatus(platform, status) {
        this.bots[platform].status = status;
        
        const statusDot = document.getElementById(`${platform === 'instagram' ? 'ig' : 'tt'}StatusDot`);
        const statusText = document.getElementById(`${platform === 'instagram' ? 'ig' : 'tt'}StatusText`);
        const botCard = document.getElementById(`${platform}Bot`);
        const startBtn = document.getElementById(`${platform === 'instagram' ? 'ig' : 'tt'}StartBtn`);
        const stopBtn = document.getElementById(`${platform === 'instagram' ? 'ig' : 'tt'}StopBtn`);
        
        // Update status indicator
        statusDot.className = `status-dot ${status}`;
        statusText.textContent = this.getStatusText(status);
        
        // Update bot card styling
        botCard.className = `bot-card ${status === 'scrolling' ? 'active' : status === 'error' ? 'error' : ''}`;
        
        // Update button states
        startBtn.disabled = status === 'scrolling';
        stopBtn.disabled = status === 'idle';
        
        this.updateGlobalStatus();
    }

    getStatusText(status) {
        const statusMap = {
            'idle': 'Idle',
            'scrolling': 'Active',
            'error': 'Error'
        };
        return statusMap[status] || status;
    }

    updateGlobalStatus() {
        const globalStatus = document.getElementById('globalStatus');
        const anyActive = Object.values(this.bots).some(bot => bot.status === 'scrolling');
        const anyError = Object.values(this.bots).some(bot => bot.status === 'error');
        
        const statusDot = globalStatus.querySelector('.status-dot');
        const statusText = globalStatus.querySelector('.status-text');
        
        if (anyError) {
            statusDot.className = 'status-dot error';
            statusText.textContent = 'Error';
        } else if (anyActive) {
            statusDot.className = 'status-dot active';
            statusText.textContent = 'Active';
        } else {
            statusDot.className = 'status-dot idle';
            statusText.textContent = 'Idle';
        }
    }

    // UI Updates
    updateUI() {
        Object.keys(this.bots).forEach(platform => {
            const prefix = platform === 'instagram' ? 'ig' : 'tt';
            const bot = this.bots[platform];
            
            // Update metrics
            document.getElementById(`${prefix}SessionTime`).textContent = this.formatSessionTime(bot.sessionTime);
            document.getElementById(`${prefix}ContentCount`).textContent = bot.contentCount;
            document.getElementById(`${prefix}Engagements`).textContent = bot.engagements;
            document.getElementById(`${prefix}Trends`).textContent = bot.trends;
            
            // Update activity
            document.getElementById(`${prefix}Activity`).textContent = bot.activity;
            document.getElementById(`${prefix}Progress`).style.width = `${bot.progress}%`;
        });
        
        this.updateActivityFeed();
        this.updateSessionLogs();
    }

    // Session Timers
    startSessionTimers() {
        setInterval(() => {
            Object.keys(this.bots).forEach(platform => {
                const bot = this.bots[platform];
                if (bot.status === 'scrolling' && bot.startTime) {
                    bot.sessionTime = Math.floor((Date.now() - bot.startTime) / 1000);
                }
            });
            this.updateUI();
        }, 1000);
    }

    startStatusUpdates() {
        setInterval(() => {
            this.updateUI();
        }, 2000);
    }

    // Activity Feed Management
    addActivityFeedItem(platform, message, type = 'info') {
        const item = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toLocaleTimeString(),
            platform: platform,
            message: message,
            type: type
        };
        
        this.activityFeed.unshift(item);
        
        // Keep only last 50 items
        if (this.activityFeed.length > 50) {
            this.activityFeed = this.activityFeed.slice(0, 50);
        }
        
        this.updateActivityFeed();
    }

    updateActivityFeed() {
        const feedContainer = document.getElementById('activityFeed');
        const filteredItems = this.getFilteredFeedItems();
        
        feedContainer.innerHTML = filteredItems.map(item => {
            const icon = this.getFeedIcon(item.platform, item.type);
            return `
                <div class="feed-item ${item.type}">
                    <div class="feed-timestamp">${item.timestamp}</div>
                    <div class="feed-content">
                        <span class="feed-icon">${icon}</span>
                        <span class="feed-message">${item.message}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    getFilteredFeedItems() {
        if (this.filters.feed === 'all') return this.activityFeed;
        if (this.filters.feed === 'trending') return this.activityFeed.filter(item => item.type === 'trending');
        if (this.filters.feed === 'errors') return this.activityFeed.filter(item => item.type === 'error');
        return this.activityFeed;
    }

    getFeedIcon(platform, type) {
        if (type === 'trending') return '🔥';
        if (type === 'error') return '⚠️';
        if (type === 'system') return '🔧';
        if (type === 'welcome') return '🚀';
        if (platform === 'instagram') return '📱';
        if (platform === 'tiktok') return '🎵';
        return '💬';
    }

    // Session Logs Management
    addSessionLog(platform, action, contentId, creator, metrics, status = 'success') {
        const log = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toLocaleTimeString(),
            platform: platform,
            action: action,
            contentId: contentId,
            creator: creator,
            metrics: metrics,
            status: status
        };
        
        this.sessionLogs.unshift(log);
        
        // Keep only last 100 logs
        if (this.sessionLogs.length > 100) {
            this.sessionLogs = this.sessionLogs.slice(0, 100);
        }
        
        this.updateSessionLogs();
    }

    updateSessionLogs() {
        const tbody = document.getElementById('logsTableBody');
        const filteredLogs = this.getFilteredLogs();
        
        tbody.innerHTML = filteredLogs.map(log => `
            <tr class="log-entry ${log.status}">
                <td class="timestamp">${log.timestamp}</td>
                <td class="platform">${log.platform}</td>
                <td class="action">${log.action}</td>
                <td class="content-id">${log.contentId}</td>
                <td class="creator">${log.creator}</td>
                <td class="metrics">${log.metrics}</td>
                <td class="status ${log.status}">${log.status}</td>
            </tr>
        `).join('');
    }

    getFilteredLogs() {
        if (this.filters.logs === 'all') return this.sessionLogs;
        return this.sessionLogs.filter(log => log.platform === this.filters.logs);
    }

    // Configuration Modal
    configureBot(platform) {
        const modal = document.getElementById('configModal');
        modal.classList.add('show');
        
        // Store current platform for configuration
        modal.dataset.platform = platform;
    }

    closeConfigModal() {
        const modal = document.getElementById('configModal');
        modal.classList.remove('show');
    }

    saveConfiguration() {
        const modal = document.getElementById('configModal');
        const platform = modal.dataset.platform;
        
        // Get configuration values
        const duration = document.getElementById('sessionDuration').value;
        const scrollSpeed = document.getElementById('scrollSpeed').value;
        const engagementRate = document.getElementById('engagementRate').value;
        const trendSensitivity = document.getElementById('trendSensitivity').value;
        
        console.log(`Saved configuration for ${platform}:`, {
            duration, scrollSpeed, engagementRate, trendSensitivity
        });
        
        this.addActivityFeedItem(platform, `Configuration updated: ${scrollSpeed} speed, ${engagementRate} engagement`, 'system');
        
        this.closeConfigModal();
    }

    // Filter Functions
    filterFeed(type) {
        this.filters.feed = type;
        
        // Update button states
        document.querySelectorAll('.feed-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        this.updateActivityFeed();
    }

    filterLogs() {
        const select = document.getElementById('logPlatform');
        this.filters.logs = select.value;
        this.updateSessionLogs();
    }

    clearFeed() {
        this.activityFeed = [];
        this.updateActivityFeed();
        this.addActivityFeedItem('system', 'Activity feed cleared', 'system');
    }

    exportLogs() {
        const logs = this.getFilteredLogs();
        const csv = this.convertLogsToCSV(logs);
        this.downloadCSV(csv, `bot-logs-${new Date().toISOString().split('T')[0]}.csv`);
        
        this.addActivityFeedItem('system', `Exported ${logs.length} log entries`, 'system');
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

    // Utility Functions
    formatSessionTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    parseNumber(str) {
        if (!str) return 0;
        const numStr = str.replace(/[^\d.kmb]/gi, '');
        const multiplier = str.toLowerCase().includes('k') ? 1000 : 
                         str.toLowerCase().includes('m') ? 1000000 : 1;
        return parseFloat(numStr) * multiplier || 0;
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

// Global Functions (called from HTML)
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
    dashboard = new BotDashboard();
    
    // Set up event listeners
    document.getElementById('logPlatform').addEventListener('change', () => {
        dashboard.filterLogs();
    });
    
    // Close modal when clicking outside
    document.getElementById('configModal').addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            dashboard.closeConfigModal();
        }
    });
});