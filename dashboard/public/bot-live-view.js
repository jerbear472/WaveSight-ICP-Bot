/**
 * Bot Live View JavaScript
 * Real-time bot activity viewer and simulator
 */

class BotLiveViewer {
    constructor() {
        this.isRunning = false;
        this.sessionId = null;
        this.startTime = null;
        this.duration = 300000; // 5 minutes default
        this.timer = null;
        this.progressTimer = null;
        this.activityCount = 0;
        this.sessionData = [];
        
        // Bot behavior simulation
        this.currentPersona = 'gen_z_tech_enthusiast';
        this.currentPlatform = 'instagram';
        this.scrollPosition = 0;
        this.contentItems = [];
        this.currentContentIndex = 0;
        
        // Persona configurations
        this.personas = {
            gen_z_tech_enthusiast: {
                name: '👩‍💻 Gen Z Tech Enthusiast',
                traits: ['Tech-savvy', 'AI-interested', 'Startup-focused', 'Fast scroller'],
                scrollSpeed: 85,
                engagementRate: 75,
                interestKeywords: ['AI', 'tech', 'startup', 'crypto', 'NFT', 'Web3'],
                avgDwellTime: 8000,
                likeChance: 0.3,
                commentChance: 0.1,
                shareChance: 0.05
            },
            millennial_entrepreneur: {
                name: '🚀 Millennial Entrepreneur',
                traits: ['Business-minded', 'Growth-focused', 'Leadership', 'Strategic'],
                scrollSpeed: 60,
                engagementRate: 85,
                interestKeywords: ['business', 'entrepreneur', 'growth', 'leadership', 'productivity'],
                avgDwellTime: 12000,
                likeChance: 0.4,
                commentChance: 0.15,
                shareChance: 0.08
            },
            crypto_investor: {
                name: '₿ Crypto Investor',
                traits: ['Investment-focused', 'Risk-aware', 'Market-savvy', 'Detail-oriented'],
                scrollSpeed: 45,
                engagementRate: 90,
                interestKeywords: ['crypto', 'bitcoin', 'ethereum', 'DeFi', 'trading', 'investment'],
                avgDwellTime: 15000,
                likeChance: 0.5,
                commentChance: 0.2,
                shareChance: 0.1
            },
            mindfulness_seeker: {
                name: '🧘 Mindfulness Seeker',
                traits: ['Wellness-focused', 'Thoughtful', 'Mindful', 'Balanced'],
                scrollSpeed: 35,
                engagementRate: 70,
                interestKeywords: ['mindfulness', 'wellness', 'meditation', 'health', 'balance'],
                avgDwellTime: 18000,
                likeChance: 0.6,
                commentChance: 0.25,
                shareChance: 0.12
            }
        };
        
        this.initialize();
    }

    initialize() {
        console.log('🤖 Initializing Bot Live Viewer...');
        this.setupEventListeners();
        this.generateMockContent();
        this.updatePersonaDisplay();
    }

    setupEventListeners() {
        // Update persona display when selection changes
        document.getElementById('personaSelect').addEventListener('change', (e) => {
            this.currentPersona = e.target.value;
            this.updatePersonaDisplay();
        });

        document.getElementById('platformSelect').addEventListener('change', (e) => {
            this.currentPlatform = e.target.value;
            this.generateMockContent();
        });

        document.getElementById('durationSelect').addEventListener('change', (e) => {
            this.duration = parseInt(e.target.value);
        });
    }

    generateMockContent() {
        const platforms = {
            instagram: {
                icon: '📱',
                creators: ['techguru22', 'mindmatterlife', 'startuplife', 'aiexplorer', 'cryptokid'],
                contentTypes: ['image', 'video', 'carousel', 'story']
            },
            tiktok: {
                icon: '🎵',
                creators: ['genztechie', 'trendsetter', 'cryptoking', 'mindfulvibes', 'techtalks'],
                contentTypes: ['video', 'live']
            }
        };

        const captions = [
            'This AI tool just revolutionized my entire workflow! Game changer 🤖',
            'POV: You started investing in crypto at 22 and now understand money better',
            'Daily meditation practice that actually changed my life ✨',
            'Building my first startup at 25 - here\'s what I learned',
            'Why Gen Z is obsessed with productivity apps (and you should be too)',
            'The mindfulness hack that reduces anxiety in 60 seconds',
            'Crypto market analysis for beginners - simplified',
            'Web3 development crash course - follow for more tips!',
            'Tech trends that will dominate 2024 🚀',
            'Mindful investing strategies for the digital generation'
        ];

        this.contentItems = [];
        const platform = platforms[this.currentPlatform];

        for (let i = 0; i < 20; i++) {
            const creator = platform.creators[Math.floor(Math.random() * platform.creators.length)];
            const contentType = platform.contentTypes[Math.floor(Math.random() * platform.contentTypes.length)];
            const caption = captions[Math.floor(Math.random() * captions.length)];
            
            this.contentItems.push({
                id: `content_${i}`,
                platform: this.currentPlatform,
                contentType,
                creator,
                caption,
                hashtags: this.extractHashtags(caption),
                likes: Math.floor(Math.random() * 50000) + 100,
                timestamp: new Date(Date.now() - i * 60000).toISOString()
            });
        }
    }

    extractHashtags(text) {
        const matches = text.match(/#[a-zA-Z0-9_]+/g);
        return matches ? matches.map(tag => tag.toLowerCase()) : [];
    }

    updatePersonaDisplay() {
        const persona = this.personas[this.currentPersona];
        const traitsContainer = document.getElementById('personaTraits');
        
        if (traitsContainer) {
            traitsContainer.innerHTML = persona.traits.map(trait => 
                `<span class="trait-tag">${trait}</span>`
            ).join('');
        }

        // Update behavior stats
        this.updateBehaviorStats();
    }

    updateBehaviorStats() {
        const persona = this.personas[this.currentPersona];
        
        document.getElementById('interestLevel').style.width = `${persona.engagementRate}%`;
        document.getElementById('engagementRate').style.width = `${persona.engagementRate}%`;
        document.getElementById('scrollSpeed').style.width = `${persona.scrollSpeed}%`;
    }

    async startBot() {
        if (this.isRunning) return;

        console.log('🚀 Starting bot session...');
        
        this.isRunning = true;
        this.sessionId = 'session_' + Date.now();
        this.startTime = Date.now();
        this.activityCount = 0;
        this.sessionData = [];
        this.currentContentIndex = 0;

        // Update UI
        this.updateStatus('running', 'Bot Running');
        this.showSessionProgress();
        this.hideConfigPanel();
        this.showBehaviorPanel();
        
        // Start timers
        this.startSessionTimer();
        this.startProgressTimer();
        
        // Start bot simulation
        this.simulateBotActivity();

        // Log start
        this.addActivityLog('🚀', 'Bot session started', `${this.personas[this.currentPersona].name} on ${this.currentPlatform}`);

        // Auto-stop after duration
        setTimeout(() => {
            if (this.isRunning) {
                this.stopBot();
            }
        }, this.duration);
    }

    stopBot() {
        if (!this.isRunning) return;

        console.log('⏹️ Stopping bot session...');
        
        this.isRunning = false;
        
        // Stop timers
        if (this.timer) clearInterval(this.timer);
        if (this.progressTimer) clearInterval(this.progressTimer);
        
        // Update UI
        this.updateStatus('offline', 'Bot Offline');
        this.hideSessionProgress();
        this.showConfigPanel();
        this.hideBehaviorPanel();
        
        // Log stop
        this.addActivityLog('⏹️', 'Bot session ended', `Total actions: ${this.activityCount}`);
        
        // Show session summary
        setTimeout(() => {
            this.showSessionSummary();
        }, 1000);
    }

    updateStatus(status, text) {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');
        const startBtn = document.getElementById('startBotBtn');
        const stopBtn = document.getElementById('stopBotBtn');

        statusDot.className = `status-dot ${status}`;
        statusText.textContent = text;

        if (status === 'running') {
            startBtn.style.display = 'none';
            stopBtn.style.display = 'inline-flex';
        } else {
            startBtn.style.display = 'inline-flex';
            stopBtn.style.display = 'none';
        }
    }

    showSessionProgress() {
        const sessionProgress = document.getElementById('sessionProgress');
        const sessionIdSpan = document.getElementById('sessionId');
        
        sessionProgress.style.display = 'block';
        sessionIdSpan.textContent = this.sessionId;
    }

    hideSessionProgress() {
        document.getElementById('sessionProgress').style.display = 'none';
    }

    showConfigPanel() {
        document.getElementById('configPanel').style.display = 'block';
    }

    hideConfigPanel() {
        document.getElementById('configPanel').style.display = 'none';
    }

    showBehaviorPanel() {
        document.getElementById('behaviorPanel').style.display = 'block';
    }

    hideBehaviorPanel() {
        document.getElementById('behaviorPanel').style.display = 'none';
    }

    startSessionTimer() {
        this.timer = setInterval(() => {
            if (!this.isRunning) return;
            
            const elapsed = Date.now() - this.startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            
            document.getElementById('sessionTimer').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    startProgressTimer() {
        this.progressTimer = setInterval(() => {
            if (!this.isRunning) return;
            
            const elapsed = Date.now() - this.startTime;
            const progress = Math.min((elapsed / this.duration) * 100, 100);
            
            document.getElementById('progressFill').style.width = `${progress}%`;
        }, 1000);
    }

    simulateBotActivity() {
        if (!this.isRunning) return;

        const persona = this.personas[this.currentPersona];
        
        // Simulate scrolling through content
        this.simulateContentViewing();
        
        // Schedule next activity based on persona scroll speed
        const delay = Math.random() * 3000 + (100 - persona.scrollSpeed) * 50;
        
        setTimeout(() => {
            this.simulateBotActivity();
        }, delay);
    }

    simulateContentViewing() {
        if (!this.isRunning || this.currentContentIndex >= this.contentItems.length) {
            this.currentContentIndex = 0; // Reset to beginning
            return;
        }

        const content = this.contentItems[this.currentContentIndex];
        const persona = this.personas[this.currentPersona];

        // Display content on bot screen
        this.displayContentOnScreen(content);

        // Calculate interest level based on keywords
        const isInteresting = this.calculateInterest(content, persona);
        const dwellTime = isInteresting ? 
            persona.avgDwellTime + Math.random() * 5000 : 
            Math.random() * 3000 + 1000;

        // Log viewing activity
        this.addActivityLog('👀', 'Viewing content', `@${content.creator} - ${content.contentType}`);

        // Simulate interactions based on interest and persona
        setTimeout(() => {
            this.simulateInteractions(content, persona, isInteresting);
        }, dwellTime);

        this.currentContentIndex++;
    }

    calculateInterest(content, persona) {
        const text = (content.caption + ' ' + content.hashtags.join(' ')).toLowerCase();
        const matchingKeywords = persona.interestKeywords.filter(keyword => 
            text.includes(keyword.toLowerCase())
        );
        
        return matchingKeywords.length > 0;
    }

    displayContentOnScreen(content) {
        const screenContent = document.getElementById('screenContent');
        const platformIcon = content.platform === 'instagram' ? '📱' : '🎵';
        
        screenContent.innerHTML = `
            <div class="content-item viewing">
                <div class="content-header">
                    <span class="platform-badge">${platformIcon} ${content.platform}</span>
                    <span class="creator-name">@${content.creator}</span>
                </div>
                <div class="content-text">${content.caption}</div>
                <div class="content-actions">
                    <div class="action-indicator" id="likeAction">
                        ❤️ ${this.formatNumber(content.likes)}
                    </div>
                    <div class="action-indicator" id="viewAction">
                        👀 Viewing...
                    </div>
                </div>
            </div>
        `;
    }

    simulateInteractions(content, persona, isInteresting) {
        if (!this.isRunning) return;

        const interactions = [];
        
        // Determine interactions based on persona and interest
        const likeChance = isInteresting ? persona.likeChance * 1.5 : persona.likeChance;
        const commentChance = isInteresting ? persona.commentChance * 1.2 : persona.commentChance * 0.5;
        const shareChance = isInteresting ? persona.shareChance * 2 : persona.shareChance * 0.3;

        if (Math.random() < likeChance) {
            interactions.push('liked');
            this.animateLike();
        }

        if (Math.random() < commentChance) {
            interactions.push('commented');
        }

        if (Math.random() < shareChance) {
            interactions.push('shared');
        }

        // Log interactions
        if (interactions.length > 0) {
            interactions.forEach(interaction => {
                this.addActivityLog('💫', `${interaction} content`, `@${content.creator}`);
                this.activityCount++;
            });

            // Save to session data
            this.sessionData.push({
                content: content,
                interactions: interactions,
                timestamp: Date.now(),
                dwellTime: Date.now() - this.startTime
            });
        } else {
            this.addActivityLog('⏭️', 'Scrolled past', `@${content.creator}`);
        }

        // Update activity count
        document.querySelector('.activity-count').textContent = `${this.activityCount} actions`;
    }

    animateLike() {
        const contentItem = document.querySelector('.content-item');
        const likeAction = document.getElementById('likeAction');
        
        if (contentItem) {
            contentItem.classList.add('liked');
            setTimeout(() => {
                contentItem.classList.remove('liked');
            }, 500);
        }

        if (likeAction) {
            likeAction.classList.add('active');
            setTimeout(() => {
                likeAction.classList.remove('active');
            }, 1000);
        }
    }

    addActivityLog(icon, action, details) {
        const feedContent = document.getElementById('feedContent');
        const placeholder = feedContent.querySelector('.feed-placeholder');
        
        if (placeholder) {
            placeholder.remove();
        }

        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.innerHTML = `
            <div class="activity-icon">${icon}</div>
            <div class="activity-details">
                <div class="activity-text">${action}</div>
                <div class="activity-time">${details} • ${this.formatTime(new Date())}</div>
            </div>
        `;

        feedContent.insertBefore(activityItem, feedContent.firstChild);

        // Limit to 50 items
        while (feedContent.children.length > 50) {
            feedContent.removeChild(feedContent.lastChild);
        }

        // Auto-scroll to top
        feedContent.scrollTop = 0;
    }

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    formatTime(date) {
        return date.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
    }

    showSessionSummary() {
        const modal = document.getElementById('summaryModal');
        const summaryContent = document.getElementById('summaryContent');
        
        const totalTime = this.duration / 1000;
        const engagementRate = this.sessionData.length > 0 ? 
            (this.sessionData.filter(item => item.interactions.length > 0).length / this.sessionData.length * 100).toFixed(1) : 0;
        
        const likedContent = this.sessionData.filter(item => item.interactions.includes('liked')).length;
        const commentedContent = this.sessionData.filter(item => item.interactions.includes('commented')).length;
        const sharedContent = this.sessionData.filter(item => item.interactions.includes('shared')).length;

        summaryContent.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                <div>
                    <h4>📊 Session Statistics</h4>
                    <p><strong>Duration:</strong> ${Math.floor(totalTime / 60)}m ${totalTime % 60}s</p>
                    <p><strong>Content Viewed:</strong> ${this.currentContentIndex}</p>
                    <p><strong>Total Interactions:</strong> ${this.activityCount}</p>
                    <p><strong>Engagement Rate:</strong> ${engagementRate}%</p>
                </div>
                <div>
                    <h4>💫 Interaction Breakdown</h4>
                    <p><strong>❤️ Liked:</strong> ${likedContent}</p>
                    <p><strong>💬 Commented:</strong> ${commentedContent}</p>
                    <p><strong>📤 Shared:</strong> ${sharedContent}</p>
                    <p><strong>🤖 Persona:</strong> ${this.personas[this.currentPersona].name}</p>
                </div>
            </div>
            <div style="margin-top: 1.5rem;">
                <h4>🎯 Key Insights</h4>
                <p>Your ${this.personas[this.currentPersona].name} bot discovered ${this.currentContentIndex} pieces of content and engaged with ${Math.round(engagementRate)}% of them, demonstrating typical behavior patterns for this persona.</p>
            </div>
        `;

        modal.classList.add('show');
    }

    closeSummaryModal() {
        document.getElementById('summaryModal').classList.remove('show');
    }

    viewEngagementFeed() {
        window.open('/engagement-feed.html', '_blank');
    }
}

// Global functions
let botViewer;

function startBot() {
    if (botViewer) botViewer.startBot();
}

function stopBot() {
    if (botViewer) botViewer.stopBot();
}

function closeSummaryModal() {
    if (botViewer) botViewer.closeSummaryModal();
}

function viewEngagementFeed() {
    if (botViewer) botViewer.viewEngagementFeed();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    botViewer = new BotLiveViewer();
    
    // Close modal when clicking outside
    document.getElementById('summaryModal').addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            closeSummaryModal();
        }
    });
});