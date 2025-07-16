/**
 * TikTok Bot Implementation
 * Uses Puppeteer to automate TikTok browsing and data collection
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const DataRecorder = require('../services/data-recorder');

class TikTokBot {
    constructor(session, supabase, socket) {
        this.session = session;
        this.supabase = supabase;
        this.socket = socket;
        this.dataRecorder = new DataRecorder(supabase);
        this.browser = null;
        this.page = null;
        this.isRunning = false;
        this.contentViewed = 0;
        this.engagements = 0;
        this.trendsFound = 0;
        this.currentContentId = null;
        this.currentContent = null;
    }

    async start() {
        try {
            this.isRunning = true;
            
            // Launch browser
            this.browser = await puppeteer.launch({
                headless: false, // Set to true in production
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            });

            this.page = await this.browser.newPage();
            
            // Set viewport
            await this.page.setViewport({ width: 1366, height: 768 });
            
            // Set user agent
            await this.page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            );

            // Navigate to TikTok
            await this.page.goto('https://www.tiktok.com/', { waitUntil: 'networkidle2' });
            
            // Start browsing session
            await this.startBrowsing();
            
        } catch (error) {
            console.error('TikTok bot error:', error);
            this.socket.emit('bot-error', { error: error.message });
            await this.cleanup();
        }
    }

    async startBrowsing() {
        // Navigate to For You page
        await this.page.goto('https://www.tiktok.com/foryou', { waitUntil: 'networkidle2' });
        
        // Wait for videos to load
        await this.page.waitForSelector('video', { timeout: 10000 });
        
        let scrollCount = 0;
        const maxScrolls = 50; // Limit for session
        
        while (this.isRunning && scrollCount < maxScrolls) {
            try {
                // Get current video data
                const videoData = await this.extractVideoData();
                
                if (videoData) {
                    // Calculate watch time
                    const watchTime = this.calculateWatchTime(videoData);
                    videoData.dwellTime = Math.floor(watchTime / 1000); // Convert to seconds
                    
                    // Save to database using data recorder
                    await this.dataRecorder.recordContentImpression(
                        this.session.session_id || this.session.id,
                        videoData
                    );
                    
                    // Store current content reference
                    this.currentContent = videoData;
                    this.currentContentId = videoData.contentId;
                    this.contentViewed++;
                    
                    // Emit progress
                    this.socket.emit('content-discovered', {
                        sessionId: this.session.session_id || this.session.id,
                        content: videoData,
                        stats: {
                            contentViewed: this.contentViewed,
                            engagements: this.engagements,
                            trendsFound: this.trendsFound
                        }
                    });
                    
                    // Simulate human-like watching
                    await this.page.waitForTimeout(watchTime);
                    
                    // Randomly engage based on profile
                    await this.maybeEngage(videoData);
                }
                
                // Scroll to next video
                await this.page.keyboard.press('ArrowDown');
                await this.page.waitForTimeout(1000 + Math.random() * 2000);
                
                scrollCount++;
                
            } catch (error) {
                console.error('Error during browsing:', error);
                // Continue browsing despite errors
            }
        }
        
        await this.endSession();
    }

    async extractVideoData() {
        try {
            const videoData = await this.page.evaluate(() => {
                // Extract video information
                const video = document.querySelector('video');
                if (!video) return null;
                
                // Get current video container
                const videoContainer = video.closest('[class*="DivItemContainer"]') || 
                                     video.closest('[class*="video-feed-item"]');
                if (!videoContainer) return null;
                
                // Extract creator info
                const getCreatorInfo = () => {
                    const creatorLink = videoContainer.querySelector('a[href*="/@"]');
                    const profilePic = videoContainer.querySelector('img[class*="Avatar"]');
                    const verifiedBadge = videoContainer.querySelector('[data-e2e="verified-badge"]');
                    
                    let username = 'unknown';
                    let displayName = '';
                    
                    if (creatorLink) {
                        const href = creatorLink.getAttribute('href');
                        const match = href.match(/@([^/?]+)/);
                        username = match ? match[1] : 'unknown';
                        
                        // Try to get display name
                        const nameElement = creatorLink.querySelector('span') || creatorLink;
                        displayName = nameElement.innerText || username;
                    }
                    
                    return {
                        username: username,
                        displayName: displayName,
                        profilePicUrl: profilePic ? profilePic.src : null,
                        isVerified: !!verifiedBadge
                    };
                };
                
                const creator = getCreatorInfo();
                
                // Extract caption and hashtags
                const getCaption = () => {
                    const captionElement = videoContainer.querySelector('[class*="DivContainer"] span') ||
                                         videoContainer.querySelector('[data-e2e="browse-video-desc"]');
                    return captionElement ? captionElement.innerText : '';
                };
                
                const caption = getCaption();
                const hashtagRegex = /#[a-zA-Z0-9_]+/g;
                const mentionRegex = /@[a-zA-Z0-9_]+/g;
                const hashtags = caption.match(hashtagRegex) || [];
                const mentions = caption.match(mentionRegex) || [];
                
                // Extract music/sound
                const getMusicInfo = () => {
                    const musicElement = videoContainer.querySelector('[class*="music"]') ||
                                       videoContainer.querySelector('a[href*="/music/"]');
                    return musicElement ? musicElement.innerText : null;
                };
                
                // Extract metrics
                const getMetricValue = (element) => {
                    if (!element) return 0;
                    const text = element.innerText;
                    let num = parseFloat(text);
                    if (text.includes('K')) num *= 1000;
                    if (text.includes('M')) num *= 1000000;
                    return Math.floor(num);
                };
                
                const getMetrics = () => {
                    const metrics = {
                        likes: 0,
                        comments: 0,
                        shares: 0,
                        saves: 0,
                        views: 0
                    };
                    
                    // Likes
                    const likeButton = videoContainer.querySelector('[data-e2e="like-icon"]');
                    if (likeButton) {
                        const span = likeButton.nextElementSibling;
                        metrics.likes = getMetricValue(span);
                    }
                    
                    // Comments
                    const commentButton = videoContainer.querySelector('[data-e2e="comment-icon"]');
                    if (commentButton) {
                        const span = commentButton.nextElementSibling;
                        metrics.comments = getMetricValue(span);
                    }
                    
                    // Shares
                    const shareButton = videoContainer.querySelector('[data-e2e="share-icon"]');
                    if (shareButton) {
                        const span = shareButton.nextElementSibling;
                        metrics.shares = getMetricValue(span);
                    }
                    
                    // Views - usually shown near the bottom
                    const viewsElement = videoContainer.querySelector('[class*="views"]') ||
                                       videoContainer.querySelector('strong:contains("views")');
                    if (viewsElement) {
                        metrics.views = getMetricValue(viewsElement);
                    }
                    
                    return metrics;
                };
                
                const metrics = getMetrics();
                const music = getMusicInfo();
                
                return {
                    platform: 'tiktok',
                    contentType: 'video',
                    contentId: `tiktok_${Date.now()}`,
                    creator: creator.username,
                    creatorDisplayName: creator.displayName,
                    creatorProfilePic: creator.profilePicUrl,
                    creatorVerified: creator.isVerified,
                    caption: caption,
                    hashtags: hashtags,
                    mentions: mentions,
                    music: music,
                    url: window.location.href,
                    thumbnailUrl: video.poster || '',
                    likes: metrics.likes,
                    comments: metrics.comments,
                    shares: metrics.shares,
                    saves: metrics.saves,
                    views: metrics.views,
                    timestamp: new Date().toISOString()
                };
            });
            
            return videoData;
            
        } catch (error) {
            console.error('Error extracting video data:', error);
            return null;
        }
    }

    calculateWatchTime(content) {
        // Calculate watch time based on profile and content
        const baseTime = 5000; // 5 seconds minimum
        const maxTime = 30000; // 30 seconds maximum
        
        // Adjust based on engagement metrics
        const engagementFactor = content.likes > 100000 ? 2 : 1;
        
        // Profile-based adjustment
        const profile = this.getProfileSettings();
        const profileFactor = profile.avgWatchTime / 10000;
        
        // Random variation
        const randomFactor = 0.5 + Math.random();
        
        return Math.min(baseTime * engagementFactor * profileFactor * randomFactor, maxTime);
    }

    async maybeEngage(content) {
        // Determine if bot should engage based on profile
        const profile = this.getProfileSettings();
        
        // Like decision
        if (Math.random() < profile.likeChance) {
            await this.likeContent();
            this.engagements++;
            
            // Save interaction
            await this.saveInteraction('like', content);
        }
        
        // Share decision (less frequent)
        if (Math.random() < profile.shareChance && content.likes > 100000) {
            this.engagements++;
            await this.saveInteraction('share', content);
        }
        
        // Follow decision
        if (Math.random() < profile.followChance && content.likes > 500000) {
            await this.followCreator();
            this.engagements++;
            await this.saveInteraction('follow', content);
        }
    }

    async likeContent() {
        try {
            // Find and click like button
            const likeButton = await this.page.$('[data-e2e="like-icon"]');
            if (likeButton) {
                await likeButton.click();
                await this.page.waitForTimeout(500 + Math.random() * 1000);
                
                // Record engagement
                if (this.currentContent) {
                    await this.dataRecorder.recordEngagement(
                        this.session.session_id || this.session.id,
                        this.currentContentId,
                        'like',
                        this.currentContent.creator
                    );
                    this.engagements++;
                }
            }
        } catch (error) {
            console.error('Error liking content:', error);
        }
    }

    async followCreator() {
        try {
            // Find and click follow button
            const followButton = await this.page.$('[data-e2e="follow-button"]');
            if (followButton) {
                const buttonText = await this.page.evaluate(el => el.innerText, followButton);
                if (buttonText.toLowerCase().includes('follow')) {
                    await followButton.click();
                    await this.page.waitForTimeout(1000);
                }
            }
        } catch (error) {
            console.error('Error following creator:', error);
        }
    }

    async saveContent(content) {
        try {
            // Calculate metrics
            const totalEngagements = content.likes + content.comments + content.shares;
            const engagementRate = content.likes > 0 ? 
                (totalEngagements / content.likes) * 100 : 0;
            
            // Detect if viral
            const isViral = content.likes > 1000000 || 
                           content.shares > 10000 || 
                           engagementRate > 15;
            
            // Detect if trending
            const isTrending = content.likes > 500000 || content.shares > 5000;
            
            // Save to Supabase
            const { data, error } = await this.supabase
                .from('discovered_content')
                .insert({
                    content_id: `tt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    session_id: this.session.session_id || this.session.id,
                    platform: 'tiktok',
                    content_type: content.contentType,
                    creator_username: content.creator,
                    caption: content.caption,
                    hashtags: content.hashtags,
                    url: content.url,
                    likes: content.likes,
                    comments: content.comments,
                    shares: content.shares,
                    engagement_rate: engagementRate,
                    is_viral: isViral,
                    is_trending: isTrending,
                    audio_name: content.audio?.name,
                    audio_id: content.audio?.id,
                    discovered_at: content.timestamp,
                    dwell_time: this.calculateWatchTime(content),
                    bot_engaged: false
                });
                
            if (error) throw error;
            
            this.contentViewed++;
            if (isViral) this.trendsFound++;
            
            // Check for trending audio
            if (content.audio && totalEngagements > 100000) {
                await this.saveTrendDetection({
                    type: 'audio',
                    name: content.audio.name,
                    id: content.audio.id,
                    viralScore: Math.min((totalEngagements / 1000000) * 100, 100)
                });
            }
            
            // Check for trending hashtags
            for (const hashtag of content.hashtags) {
                if (totalEngagements > 50000) {
                    await this.saveTrendDetection({
                        type: 'hashtag',
                        name: hashtag,
                        id: hashtag,
                        viralScore: Math.min((totalEngagements / 500000) * 100, 100)
                    });
                }
            }
            
        } catch (error) {
            console.error('Error saving content:', error);
        }
    }

    async saveInteraction(type, content) {
        try {
            const { error } = await this.supabase
                .from('bot_interactions')
                .insert({
                    session_id: this.session.session_id || this.session.id,
                    content_id: content.url,
                    interaction_type: type,
                    interaction_time: new Date().toISOString(),
                    dwell_time_ms: this.calculateWatchTime(content)
                });
                
            if (error) throw error;
            
        } catch (error) {
            console.error('Error saving interaction:', error);
        }
    }

    async saveTrendDetection(trend) {
        try {
            const { error } = await this.supabase
                .from('detected_trends')
                .insert({
                    trend_id: `${trend.type}_${trend.id}`,
                    session_id: this.session.session_id || this.session.id,
                    trend_type: trend.type,
                    trend_name: trend.name,
                    platform: 'tiktok',
                    viral_score: trend.viralScore,
                    detected_at: new Date().toISOString()
                });
                
            if (error && !error.message.includes('duplicate')) {
                throw error;
            }
            
        } catch (error) {
            console.error('Error saving trend:', error);
        }
    }

    getProfileSettings() {
        // Return engagement settings based on profile type
        const profiles = {
            gen_z_tech_enthusiast: { 
                likeChance: 0.3, 
                shareChance: 0.05, 
                followChance: 0.05,
                avgWatchTime: 8000 
            },
            millennial_entrepreneur: { 
                likeChance: 0.4, 
                shareChance: 0.08, 
                followChance: 0.08,
                avgWatchTime: 12000 
            },
            crypto_investor: { 
                likeChance: 0.5, 
                shareChance: 0.1, 
                followChance: 0.1,
                avgWatchTime: 15000 
            },
            mindfulness_seeker: { 
                likeChance: 0.6, 
                shareChance: 0.12, 
                followChance: 0.12,
                avgWatchTime: 18000 
            },
            fashion_beauty_enthusiast: { 
                likeChance: 0.7, 
                shareChance: 0.15, 
                followChance: 0.15,
                avgWatchTime: 10000 
            },
            fitness_health_focused: { 
                likeChance: 0.5, 
                shareChance: 0.1, 
                followChance: 0.1,
                avgWatchTime: 11000 
            },
            parent_family_oriented: { 
                likeChance: 0.4, 
                shareChance: 0.2, 
                followChance: 0.08,
                avgWatchTime: 14000 
            }
        };
        
        return profiles[this.session.profileType] || profiles.gen_z_tech_enthusiast;
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
                .eq('session_id', this.session.id);
                
            if (error) throw error;
            
            this.socket.emit('session-complete', {
                sessionId: this.session.id,
                stats: {
                    contentViewed: this.contentViewed,
                    engagements: this.engagements,
                    trendsFound: this.trendsFound
                }
            });
            
        } catch (error) {
            console.error('Error ending session:', error);
        } finally {
            await this.cleanup();
        }
    }

    async cleanup() {
        this.isRunning = false;
        
        if (this.page) {
            await this.page.close();
        }
        
        if (this.browser) {
            await this.browser.close();
        }
    }

    async stop() {
        this.isRunning = false;
        await this.endSession();
    }
}

module.exports = TikTokBot;