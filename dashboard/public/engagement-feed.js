/**
 * Engagement Feed Viewer JavaScript
 * Live stream of bot content discovery with rich engagement metrics
 */

class EngagementFeedViewer {
    constructor() {
        this.contentItems = [];
        this.filteredItems = [];
        this.currentView = 'grid';
        this.isStreamPaused = false;
        this.refreshInterval = null;
        this.brandDetectionActive = false;
        
        this.filters = {
            platform: 'all',
            contentType: 'all',
            engagement: 'all',
            timeRange: 'live'
        };
        
        this.brandKeywords = [
            'nike', 'adidas', 'apple', 'samsung', 'coca-cola', 'pepsi', 
            'amazon', 'google', 'meta', 'facebook', 'instagram', 'tiktok',
            'microsoft', 'tesla', 'netflix', 'spotify', 'uber', 'airbnb',
            'mindmatter', 'mindmatterlife', 'coach', 'gucci', 'prada'
        ];
        
        this.initialize();
    }

    async initialize() {
        console.log('🔴 Initializing Engagement Feed Viewer...');
        
        // Load initial data
        await this.loadContentData();
        
        // Start refresh interval
        this.startRefreshInterval();
        
        // Initialize view
        this.renderContent();
        this.updateStats();
        
        console.log('✅ Engagement Feed Viewer ready');
    }

    async loadContentData() {
        try {
            // Load real engagement data from API
            const params = new URLSearchParams({
                platform: this.filters.platform,
                contentType: this.filters.contentType,
                timeRange: this.filters.timeRange,
                limit: '50'
            });

            const response = await fetch(`/api/engagement-feed?${params}`);
            
            if (response.ok) {
                const result = await response.json();
                this.contentItems = result.data || [];
                console.log(`📊 Loaded ${this.contentItems.length} real engagement items`);
            } else {
                console.warn('API not available, using mock data');
                const mockData = await this.generateMockEngagementData();
                this.contentItems = mockData;
            }
            
            this.applyFilters();
        } catch (error) {
            console.warn('Failed to load real data, using mock data:', error.message);
            const mockData = await this.generateMockEngagementData();
            this.contentItems = mockData;
            this.applyFilters();
        }
    }

    async generateMockEngagementData() {
        // Generate realistic engagement data based on the working bot results
        const platforms = ['instagram', 'tiktok'];
        const contentTypes = ['image', 'video', 'carousel'];
        const creators = [
            'pisspoorandfancy', 'google', 'beautifulkoas', 'mindmatterlife',
            'techguru22', 'aiexplorer', 'cryptokid', 'startuplife', 
            'genztechie', 'mindfultech'
        ];
        
        const captions = [
            'This AI tool just changed everything for entrepreneurs! 🤖',
            'Crypto market analysis for beginners - what I wish I knew',
            'Building my first startup at 22 - here\'s what I learned',
            'ABLE leather tote bag for sale - gently used condition',
            '#forsale #coachbag #whatnot #coach1941 luxury designer',
            'Mindful investing strategies for the digital generation',
            'Web3 development crash course - follow for more tips!',
            'Daily meditation changed my perspective on success ✨',
            'POV: You bought crypto at 18 and understand money better'
        ];

        const data = [];
        const now = Date.now();

        for (let i = 0; i < 25; i++) {
            const platform = platforms[Math.floor(Math.random() * platforms.length)];
            const contentType = contentTypes[Math.floor(Math.random() * contentTypes.length)];
            const creator = creators[Math.floor(Math.random() * creators.length)];
            const caption = captions[Math.floor(Math.random() * captions.length)];
            
            const likes = Math.floor(Math.random() * 50000) + 100;
            const dwellTime = Math.floor(Math.random() * 15000) + 2000; // 2-17 seconds
            const watchCompletion = contentType === 'video' ? Math.random() * 100 : null;
            
            const hashtags = this.extractHashtags(caption);
            const isBranded = this.detectBrandContent(caption, creator);
            const isSponsored = Math.random() < 0.15; // 15% sponsored
            const isTrending = likes > 10000 || hashtags.some(tag => 
                ['#viral', '#trending', '#fyp'].includes(tag)
            );

            // Generate engagement interactions
            const interactions = [];
            if (Math.random() < 0.3) interactions.push('liked');
            if (Math.random() < 0.1) interactions.push('commented');
            if (Math.random() < 0.05) interactions.push('shared');
            if (Math.random() < 0.02) interactions.push('followed');

            const item = {
                id: `content_${now}_${i}`,
                platform: platform,
                contentType: contentType,
                creator: creator,
                caption: caption,
                hashtags: hashtags,
                timestamp: new Date(now - (i * 30000)).toISOString(), // 30 seconds apart
                
                // Engagement metrics
                likes: likes,
                dwellTimeMs: dwellTime,
                watchCompletionPercent: watchCompletion,
                interactions: interactions,
                
                // Classification
                isTrending: isTrending,
                isBranded: isBranded,
                isSponsored: isSponsored,
                
                // Media info
                mediaUrl: this.generateMediaUrl(contentType, platform),
                thumbnailUrl: this.generateThumbnailUrl(contentType, platform),
                
                // Bot behavior data
                viewDuration: dwellTime,
                scrollDepth: Math.random() * 100,
                engagementScore: this.calculateEngagementScore(likes, dwellTime, interactions.length)
            };

            data.push(item);
        }

        return data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    extractHashtags(text) {
        const matches = text.match(/#[a-zA-Z0-9_]+/g);
        return matches ? matches.map(tag => tag.toLowerCase()) : [];
    }

    detectBrandContent(caption, creator) {
        const text = (caption + ' ' + creator).toLowerCase();
        return this.brandKeywords.some(brand => text.includes(brand));
    }

    calculateEngagementScore(likes, dwellTime, interactions) {
        const likeScore = Math.min(likes / 1000, 50);
        const dwellScore = Math.min(dwellTime / 1000, 15);
        const interactionScore = interactions * 10;
        
        return Math.round(likeScore + dwellScore + interactionScore);
    }

    generateMediaUrl(contentType, platform) {
        // In real implementation, these would be actual URLs from the bot's discoveries
        const baseUrl = 'https://via.placeholder.com';
        if (contentType === 'video') {
            return `${baseUrl}/400x300/1a1e2e/00d4ff?text=${platform}+Video`;
        }
        return `${baseUrl}/400x300/1a1e2e/00d4ff?text=${platform}+${contentType}`;
    }

    generateThumbnailUrl(contentType, platform) {
        const baseUrl = 'https://via.placeholder.com';
        return `${baseUrl}/80x80/1a1e2e/00d4ff?text=${platform.charAt(0).toUpperCase()}`;
    }

    // View Management
    switchView(view) {
        this.currentView = view;
        
        // Update button states
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        
        // Show/hide views
        document.getElementById('gridView').style.display = view === 'grid' ? 'block' : 'none';
        document.getElementById('streamView').style.display = view === 'stream' ? 'block' : 'none';
        
        this.renderContent();
    }

    // Filter Management
    applyFilters() {
        const { platform, contentType, engagement, timeRange } = this.filters;
        
        let filtered = [...this.contentItems];
        
        // Platform filter
        if (platform !== 'all') {
            filtered = filtered.filter(item => item.platform === platform);
        }
        
        // Content type filter
        if (contentType !== 'all') {
            filtered = filtered.filter(item => item.contentType === contentType);
        }
        
        // Engagement filter
        if (engagement === 'high') {
            filtered = filtered.filter(item => item.isTrending);
        } else if (engagement === 'branded') {
            filtered = filtered.filter(item => item.isBranded);
        } else if (engagement === 'sponsored') {
            filtered = filtered.filter(item => item.isSponsored);
        }
        
        // Time range filter
        const now = Date.now();
        const timeRanges = {
            'live': 5 * 60 * 1000,      // 5 minutes
            'hour': 60 * 60 * 1000,     // 1 hour
            'day': 24 * 60 * 60 * 1000  // 24 hours
        };
        
        if (timeRanges[timeRange]) {
            const cutoff = now - timeRanges[timeRange];
            filtered = filtered.filter(item => 
                new Date(item.timestamp).getTime() > cutoff
            );
        }
        
        this.filteredItems = filtered;
        this.renderContent();
        this.updateStats();
    }

    clearFilters() {
        this.filters = {
            platform: 'all',
            contentType: 'all',
            engagement: 'all',
            timeRange: 'live'
        };
        
        // Reset filter controls
        document.getElementById('platformFilter').value = 'all';
        document.getElementById('contentTypeFilter').value = 'all';
        document.getElementById('engagementFilter').value = 'all';
        document.getElementById('timeFilter').value = 'live';
        
        this.applyFilters();
    }

    // Rendering
    renderContent() {
        if (this.currentView === 'grid') {
            this.renderGridView();
        } else {
            this.renderStreamView();
        }
    }

    renderGridView() {
        const container = document.getElementById('contentGrid');
        const itemCount = document.getElementById('itemCount');
        
        itemCount.textContent = this.filteredItems.length;
        
        if (this.filteredItems.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>📭 No content found</h3>
                    <p>Try adjusting your filters or wait for new content to be discovered.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.filteredItems.map(item => this.createContentCard(item)).join('');
    }

    renderStreamView() {
        const container = document.getElementById('streamContainer');
        
        if (this.filteredItems.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 3rem; text-align: center;">
                    <h3>📭 No content in stream</h3>
                    <p>Wait for your bots to discover new content...</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.filteredItems.map(item => this.createStreamItem(item)).join('');
    }

    createContentCard(item) {
        const cardClass = this.getCardClass(item);
        const brandTags = item.isBranded ? this.createBrandTags(item) : '';
        const interactions = this.createInteractionIndicators(item.interactions);
        
        return `
            <div class="content-card ${cardClass}" onclick="showContentDetails('${item.id}')">
                ${brandTags}
                <div class="content-preview">
                    <div class="platform-badge">${this.getPlatformIcon(item.platform)} ${item.platform}</div>
                    <div class="media-overlay">${this.getContentTypeIcon(item.contentType)} ${item.contentType}</div>
                    ${item.contentType === 'video' ? 
                        `<video src="${item.mediaUrl}" muted></video>` :
                        `<img src="${item.mediaUrl}" alt="Content preview" loading="lazy">`
                    }
                </div>
                
                <div class="content-info">
                    <div class="content-header">
                        <div class="creator-info">
                            <div class="creator-avatar">${item.creator.charAt(0).toUpperCase()}</div>
                            <span class="creator-name">@${item.creator}</span>
                        </div>
                        <span class="timestamp">${this.formatTimestamp(item.timestamp)}</span>
                    </div>
                    
                    <div class="content-caption">${item.caption}</div>
                    
                    ${item.hashtags.length > 0 ? `
                        <div class="content-hashtags">
                            ${item.hashtags.map(tag => `<span class="hashtag">${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                    
                    <div class="engagement-metrics">
                        <div class="metric">
                            <span class="metric-label">Likes</span>
                            <span class="metric-value">${this.formatNumber(item.likes)}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Dwell Time</span>
                            <span class="metric-value">${this.formatDuration(item.dwellTimeMs)}</span>
                        </div>
                        ${item.watchCompletionPercent ? `
                            <div class="metric">
                                <span class="metric-label">Watch %</span>
                                <span class="metric-value">${Math.round(item.watchCompletionPercent)}%</span>
                            </div>
                        ` : ''}
                        <div class="metric">
                            <span class="metric-label">Engagement</span>
                            <span class="metric-value">${item.engagementScore}</span>
                        </div>
                    </div>
                    
                    <div class="dwell-time-bar">
                        <div class="dwell-progress" style="width: ${Math.min(item.dwellTimeMs / 150, 100)}%"></div>
                    </div>
                    
                    <div class="interaction-indicators">
                        ${interactions}
                    </div>
                </div>
            </div>
        `;
    }

    createStreamItem(item) {
        const platformIcon = this.getPlatformIcon(item.platform);
        const contentIcon = this.getContentTypeIcon(item.contentType);
        
        return `
            <div class="stream-item ${item.isNew ? 'new' : ''}" onclick="showContentDetails('${item.id}')">
                <div class="stream-thumbnail">
                    ${item.contentType === 'video' ? 
                        `<video src="${item.mediaUrl}" muted></video>` :
                        `<img src="${item.mediaUrl}" alt="Content thumbnail" loading="lazy">`
                    }
                </div>
                
                <div class="stream-content">
                    <div class="stream-header-info">
                        <span class="stream-creator">${platformIcon} @${item.creator}</span>
                        <span class="stream-timestamp">${this.formatTimestamp(item.timestamp)}</span>
                    </div>
                    
                    <div class="stream-caption">${item.caption}</div>
                    
                    <div class="stream-metrics">
                        <div class="stream-metric">
                            <span>💯</span>
                            <span>${this.formatNumber(item.likes)} likes</span>
                        </div>
                        <div class="stream-metric">
                            <span>⏱️</span>
                            <span>${this.formatDuration(item.dwellTimeMs)} dwell</span>
                        </div>
                        <div class="stream-metric">
                            <span>${contentIcon}</span>
                            <span>${item.contentType}</span>
                        </div>
                        ${item.isTrending ? '<div class="stream-metric"><span>🔥</span><span>Trending</span></div>' : ''}
                        ${item.isBranded ? '<div class="stream-metric"><span>🏷️</span><span>Branded</span></div>' : ''}
                    </div>
                </div>
            </div>
        `;
    }

    // Helper functions
    getCardClass(item) {
        if (item.isTrending) return 'trending';
        if (item.isBranded) return 'branded';
        if (item.isSponsored) return 'sponsored';
        return '';
    }

    createBrandTags(item) {
        const detectedBrands = this.brandKeywords.filter(brand => 
            (item.caption + ' ' + item.creator).toLowerCase().includes(brand)
        );
        
        if (detectedBrands.length === 0) return '';
        
        return `
            <div class="brand-tags">
                ${detectedBrands.slice(0, 2).map(brand => 
                    `<span class="brand-tag">${brand}</span>`
                ).join('')}
            </div>
        `;
    }

    createInteractionIndicators(interactions) {
        const icons = {
            liked: '❤️',
            commented: '💬',
            shared: '📤',
            followed: '👤'
        };
        
        return interactions.map(interaction => 
            `<div class="interaction-icon ${interaction}" title="${interaction}">${icons[interaction]}</div>`
        ).join('');
    }

    getPlatformIcon(platform) {
        const icons = {
            instagram: '📱',
            tiktok: '🎵',
            youtube: '📺',
            twitter: '🐦'
        };
        return icons[platform] || '📱';
    }

    getContentTypeIcon(contentType) {
        const icons = {
            image: '🖼️',
            video: '🎥',
            carousel: '🎠',
            story: '📚'
        };
        return icons[contentType] || '📄';
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    }

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    formatDuration(ms) {
        if (ms >= 60000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
        return `${Math.floor(ms / 1000)}s`;
    }

    // Stats and updates
    updateStats() {
        const liveViews = this.filteredItems.length;
        const avgDwell = this.filteredItems.length > 0 ? 
            Math.round(this.filteredItems.reduce((sum, item) => sum + item.dwellTimeMs, 0) / this.filteredItems.length) : 0;
        const engagementRate = this.filteredItems.length > 0 ?
            Math.round((this.filteredItems.filter(item => item.interactions.length > 0).length / this.filteredItems.length) * 100) : 0;
        
        document.getElementById('liveViews').textContent = liveViews;
        document.getElementById('avgDwell').textContent = `${avgDwell}ms`;
        document.getElementById('engagementRate').textContent = `${engagementRate}%`;
    }

    // Auto-refresh
    startRefreshInterval() {
        this.refreshInterval = setInterval(() => {
            if (!this.isStreamPaused) {
                this.refreshFeed();
            }
        }, 10000); // Refresh every 10 seconds
    }

    refreshFeed() {
        console.log('🔄 Refreshing engagement feed...');
        this.loadContentData();
    }

    toggleStream() {
        this.isStreamPaused = !this.isStreamPaused;
        const button = document.getElementById('streamToggle');
        const status = document.getElementById('streamStatus');
        
        if (this.isStreamPaused) {
            button.textContent = '▶️ Resume Stream';
            status.textContent = '⏸️ Paused';
            status.style.color = 'var(--warning-color)';
        } else {
            button.textContent = '⏸️ Pause Stream';
            status.textContent = '🔴 Live';
            status.style.color = 'var(--success-color)';
        }
    }

    // Brand detection
    showBrandDetection(brands) {
        const overlay = document.getElementById('brandOverlay');
        const container = document.getElementById('detectedBrands');
        
        container.innerHTML = brands.map(brand => 
            `<span class="detected-brand">${brand}</span>`
        ).join('');
        
        overlay.classList.add('show');
        
        setTimeout(() => {
            overlay.classList.remove('show');
        }, 5000);
    }
}

// Global functions
let feedViewer;

function applyFilters() {
    if (!feedViewer) return;
    
    feedViewer.filters.platform = document.getElementById('platformFilter').value;
    feedViewer.filters.contentType = document.getElementById('contentTypeFilter').value;
    feedViewer.filters.engagement = document.getElementById('engagementFilter').value;
    feedViewer.filters.timeRange = document.getElementById('timeFilter').value;
    
    feedViewer.applyFilters();
}

function clearFilters() {
    if (feedViewer) feedViewer.clearFilters();
}

function switchView(view) {
    if (feedViewer) feedViewer.switchView(view);
}

function refreshFeed() {
    if (feedViewer) feedViewer.refreshFeed();
}

function toggleStream() {
    if (feedViewer) feedViewer.toggleStream();
}

function showContentDetails(contentId) {
    const item = feedViewer.contentItems.find(item => item.id === contentId);
    if (!item) return;
    
    const modal = document.getElementById('contentModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    
    title.textContent = `@${item.creator} - ${item.platform}`;
    
    body.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
            <div>
                <h4>Content Details</h4>
                <p><strong>Platform:</strong> ${item.platform}</p>
                <p><strong>Type:</strong> ${item.contentType}</p>
                <p><strong>Creator:</strong> @${item.creator}</p>
                <p><strong>Timestamp:</strong> ${new Date(item.timestamp).toLocaleString()}</p>
                <p><strong>Caption:</strong> ${item.caption}</p>
                <p><strong>Hashtags:</strong> ${item.hashtags.join(', ') || 'None'}</p>
            </div>
            <div>
                <h4>Engagement Metrics</h4>
                <p><strong>Likes:</strong> ${feedViewer.formatNumber(item.likes)}</p>
                <p><strong>Dwell Time:</strong> ${feedViewer.formatDuration(item.dwellTimeMs)}</p>
                <p><strong>Engagement Score:</strong> ${item.engagementScore}</p>
                <p><strong>Interactions:</strong> ${item.interactions.join(', ') || 'None'}</p>
                <p><strong>Trending:</strong> ${item.isTrending ? 'Yes' : 'No'}</p>
                <p><strong>Branded:</strong> ${item.isBranded ? 'Yes' : 'No'}</p>
                <p><strong>Sponsored:</strong> ${item.isSponsored ? 'Yes' : 'No'}</p>
            </div>
        </div>
    `;
    
    modal.classList.add('show');
}

function closeContentModal() {
    document.getElementById('contentModal').classList.remove('show');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    feedViewer = new EngagementFeedViewer();
    
    // Close modal when clicking outside
    document.getElementById('contentModal').addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            closeContentModal();
        }
    });
});