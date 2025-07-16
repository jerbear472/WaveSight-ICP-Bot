/**
 * Instagram Bot Implementation
 * Uses Puppeteer to automate Instagram browsing and data collection
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

class InstagramBot {
    constructor(session, supabase, socket) {
        this.session = session;
        this.supabase = supabase;
        this.socket = socket;
        this.browser = null;
        this.page = null;
        this.isRunning = false;
        this.contentViewed = 0;
        this.engagements = 0;
        this.trendsFound = 0;
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
            
            // Set viewport to mobile size
            await this.page.setViewport({ width: 375, height: 812 });
            
            // Set user agent
            await this.page.setUserAgent(
                'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
            );

            // Navigate to Instagram
            await this.page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });
            
            // Login if needed
            await this.login();
            
            // Start browsing session
            await this.startBrowsing();
            
        } catch (error) {
            console.error('Instagram bot error:', error);
            this.socket.emit('bot-error', { error: error.message });
            await this.cleanup();
        }
    }

    async login() {
        try {
            // Check if login is required
            const loginButton = await this.page.$('button[type="submit"]');
            if (!loginButton) {
                console.log('Already logged in or no login required');
                return;
            }

            // Fill login form
            await this.page.type('input[name="username"]', process.env.INSTAGRAM_USERNAME);
            await this.page.type('input[name="password"]', process.env.INSTAGRAM_PASSWORD);
            
            // Click login
            await this.page.click('button[type="submit"]');
            
            // Wait for navigation
            await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
            
            // Handle any popups
            await this.handlePopups();
            
            this.socket.emit('bot-status', { status: 'logged_in' });
            
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async handlePopups() {
        try {
            // Handle "Save Your Login Info?" popup
            const saveLoginButton = await this.page.$x("//button[contains(text(), 'Not Now')]");
            if (saveLoginButton.length > 0) {
                await saveLoginButton[0].click();
                await this.page.waitForTimeout(2000);
            }

            // Handle "Turn on Notifications" popup
            const notificationButton = await this.page.$x("//button[contains(text(), 'Not Now')]");
            if (notificationButton.length > 0) {
                await notificationButton[0].click();
                await this.page.waitForTimeout(2000);
            }
        } catch (error) {
            console.log('No popups to handle');
        }
    }

    async startBrowsing() {
        // Navigate to explore/reels for content discovery
        await this.page.goto('https://www.instagram.com/reels/', { waitUntil: 'networkidle2' });
        
        let scrollCount = 0;
        const maxScrolls = 50; // Limit for session
        
        while (this.isRunning && scrollCount < maxScrolls) {
            try {
                // Get current reel data
                const reelData = await this.extractReelData();
                
                if (reelData) {
                    // Save to database
                    await this.saveContent(reelData);
                    
                    // Emit progress
                    this.socket.emit('content-discovered', {
                        sessionId: this.session.id,
                        content: reelData,
                        stats: {
                            contentViewed: this.contentViewed,
                            engagements: this.engagements,
                            trendsFound: this.trendsFound
                        }
                    });
                    
                    // Simulate human-like dwell time
                    const dwellTime = this.calculateDwellTime(reelData);
                    await this.page.waitForTimeout(dwellTime);
                    
                    // Randomly engage based on profile
                    await this.maybeEngage(reelData);
                }
                
                // Scroll to next reel
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

    async extractReelData() {
        try {
            // Wait for reel to load
            await this.page.waitForSelector('video', { timeout: 5000 });
            
            const reelData = await this.page.evaluate(() => {
                // Extract reel information
                const video = document.querySelector('video');
                if (!video) return null;
                
                // Get creator info
                const creatorElement = document.querySelector('a[role="link"] span');
                const creator = creatorElement ? creatorElement.innerText : 'unknown';
                
                // Get caption
                const captionElement = document.querySelector('h1');
                const caption = captionElement ? captionElement.innerText : '';
                
                // Extract hashtags
                const hashtagRegex = /#[a-zA-Z0-9_]+/g;
                const hashtags = caption.match(hashtagRegex) || [];
                
                // Get metrics (these might need adjustment based on Instagram's current layout)
                const getLikeCount = () => {
                    const likeElement = document.querySelector('section span');
                    if (!likeElement) return 0;
                    const text = likeElement.innerText;
                    return parseInt(text.replace(/[^0-9]/g, '')) || 0;
                };
                
                const getCommentCount = () => {
                    const elements = document.querySelectorAll('section span');
                    for (let el of elements) {
                        if (el.innerText.includes('comment')) {
                            return parseInt(el.innerText.replace(/[^0-9]/g, '')) || 0;
                        }
                    }
                    return 0;
                };
                
                return {
                    platform: 'instagram',
                    contentType: 'reel',
                    creator: creator,
                    caption: caption,
                    hashtags: hashtags,
                    url: window.location.href,
                    thumbnailUrl: video.poster || '',
                    likes: getLikeCount(),
                    comments: getCommentCount(),
                    timestamp: new Date().toISOString()
                };
            });
            
            return reelData;
            
        } catch (error) {
            console.error('Error extracting reel data:', error);
            return null;
        }
    }

    calculateDwellTime(content) {
        // Calculate dwell time based on profile and content
        const baseTime = 3000; // 3 seconds minimum
        const maxTime = 15000; // 15 seconds maximum
        
        // Adjust based on engagement metrics
        const engagementFactor = content.likes > 10000 ? 2 : 1;
        
        // Random variation
        const randomFactor = 0.5 + Math.random();
        
        return Math.min(baseTime * engagementFactor * randomFactor, maxTime);
    }

    async maybeEngage(content) {
        // Determine if bot should engage based on profile
        const profile = this.getProfileSettings();
        
        // Like decision
        if (Math.random() < profile.likeChance) {
            await this.likeContent();
            this.engagements++;
        }
        
        // Follow decision (less frequent)
        if (Math.random() < profile.followChance && content.likes > 50000) {
            await this.followCreator(content.creator);
            this.engagements++;
        }
    }

    async likeContent() {
        try {
            // Find and click like button
            const likeButton = await this.page.$('[aria-label*="Like"]');
            if (likeButton) {
                await likeButton.click();
                await this.page.waitForTimeout(500 + Math.random() * 1000);
            }
        } catch (error) {
            console.error('Error liking content:', error);
        }
    }

    async followCreator(creator) {
        try {
            // Click on creator profile
            const creatorLink = await this.page.$(`a[href*="/${creator}/"]`);
            if (creatorLink) {
                await creatorLink.click();
                await this.page.waitForTimeout(2000);
                
                // Click follow button
                const followButton = await this.page.$('button:has-text("Follow")');
                if (followButton) {
                    await followButton.click();
                    await this.page.waitForTimeout(1000);
                }
                
                // Go back
                await this.page.goBack();
            }
        } catch (error) {
            console.error('Error following creator:', error);
        }
    }

    async saveContent(content) {
        try {
            // Calculate engagement rate
            const engagementRate = content.likes > 0 ? 
                ((content.likes + content.comments * 2) / content.likes) * 100 : 0;
            
            // Detect if viral
            const isViral = content.likes > 100000 || engagementRate > 10;
            
            // Save to Supabase
            const { data, error } = await this.supabase
                .from('discovered_content')
                .insert({
                    content_id: `ig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    session_id: this.session.id,
                    platform: 'instagram',
                    content_type: content.contentType,
                    creator_username: content.creator,
                    caption: content.caption,
                    hashtags: content.hashtags,
                    url: content.url,
                    thumbnail_url: content.thumbnailUrl,
                    likes: content.likes,
                    comments: content.comments,
                    engagement_rate: engagementRate,
                    is_viral: isViral,
                    discovered_at: content.timestamp,
                    dwell_time: this.calculateDwellTime(content),
                    bot_engaged: false
                });
                
            if (error) throw error;
            
            this.contentViewed++;
            if (isViral) this.trendsFound++;
            
        } catch (error) {
            console.error('Error saving content:', error);
        }
    }

    getProfileSettings() {
        // Return engagement settings based on profile type
        const profiles = {
            gen_z_tech_enthusiast: { likeChance: 0.3, followChance: 0.05 },
            millennial_entrepreneur: { likeChance: 0.4, followChance: 0.08 },
            crypto_investor: { likeChance: 0.5, followChance: 0.1 },
            mindfulness_seeker: { likeChance: 0.6, followChance: 0.12 },
            fashion_beauty_enthusiast: { likeChance: 0.7, followChance: 0.15 },
            fitness_health_focused: { likeChance: 0.5, followChance: 0.1 },
            parent_family_oriented: { likeChance: 0.4, followChance: 0.08 }
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

module.exports = InstagramBot;