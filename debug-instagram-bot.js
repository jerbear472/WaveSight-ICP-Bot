/**
 * Debug Instagram Bot Runner
 * Shows exactly what the bot sees and records with detailed logging
 */

require('dotenv').config();
const InstagramBot = require('./bot-engine/instagram-bot');
const ICPProfileGenerator = require('./bot-engine/icp-profile-generator');
const SupabaseLogger = require('./data-logger/supabase-logger');

class DebugInstagramRunner {
    constructor() {
        this.dataLogger = new SupabaseLogger();
        this.profileGenerator = new ICPProfileGenerator();
        this.isRunning = false;
        this.discoveries = [];
    }

    async initialize() {
        console.log('🔍 INSTAGRAM BOT DEBUGGER');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('This will show you EXACTLY what the bot sees and records');
        console.log('');

        try {
            await this.dataLogger.initialize();
            console.log('✅ Connected to Supabase database');
        } catch (error) {
            console.log('⚠️ Database connection failed:', error.message);
            console.log('📊 Bot will still run but data won\'t be saved');
        }
    }

    createDebugProfile() {
        const profile = this.profileGenerator.generateProfile('gen_z_tech_enthusiast', {
            profileName: 'DebugBot_MindMatterLife',
            interests: ['mindfulness', 'AI', 'productivity', 'wellness', 'startups'],
            behaviorPatterns: {
                scrollSpeed: 'normal',
                engagementRate: 'medium',
                contentPreference: ['educational', 'motivational', 'tech_trends'],
                trendSensitivity: 'high'
            }
        });

        console.log('👤 DEBUG PROFILE CREATED:');
        console.log(`   Name: ${profile.profileName}`);
        console.log(`   Interests: ${profile.interests.join(', ')}`);
        console.log(`   Age Range: ${profile.ageRange}`);
        console.log(`   Device: ${profile.deviceType}`);
        console.log('');

        return profile;
    }

    async runDebugSession() {
        const profile = this.createDebugProfile();
        
        // Create bot with debug settings
        const bot = new InstagramBot(profile, {
            headless: false, // Show browser for debugging
            slowMo: 1000,   // Slow down for visibility
            timeout: 60000   // 1 minute for testing
        });

        console.log('🚀 STARTING DEBUG SESSION');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        try {
            // Initialize the bot
            console.log('🔧 Step 1: Initializing browser...');
            await bot.initialize();
            console.log('✅ Browser initialized');

            // Navigate to Instagram
            console.log('🌐 Step 2: Navigating to Instagram...');
            await this.debugNavigation(bot);

            // Check authentication
            console.log('🔐 Step 3: Checking authentication...');
            await this.debugAuthentication(bot);

            // Analyze the feed
            console.log('📱 Step 4: Analyzing Instagram feed...');
            await this.debugFeedAnalysis(bot);

            // Show what was discovered
            console.log('📊 Step 5: Showing discoveries...');
            this.showDiscoveries();

        } catch (error) {
            console.error('❌ Debug session failed:', error.message);
            await bot.screenshot('debug-error');
            console.log('📸 Error screenshot saved');
        } finally {
            console.log('🧹 Cleaning up...');
            await bot.cleanup();
        }
    }

    async debugNavigation(bot) {
        try {
            await bot.page.goto('https://www.instagram.com', { 
                waitUntil: 'networkidle',
                timeout: 30000 
            });

            // Check what page we landed on
            const currentUrl = bot.page.url();
            const title = await bot.page.title();
            
            console.log(`   🎯 Landed on: ${currentUrl}`);
            console.log(`   📄 Page title: ${title}`);

            // Check for various page elements
            const elements = await this.checkPageElements(bot.page);
            console.log('   🔍 Page elements found:');
            Object.entries(elements).forEach(([key, found]) => {
                console.log(`      ${found ? '✅' : '❌'} ${key}`);
            });

        } catch (error) {
            console.log(`   ❌ Navigation failed: ${error.message}`);
            throw error;
        }
    }

    async checkPageElements(page) {
        const elements = {};
        
        const checks = {
            'Login form': 'input[name="username"]',
            'Feed posts': 'article[role="presentation"]',
            'Alternative feed': 'article',
            'Stories': 'div[role="button"] canvas',
            'Cookie banner': 'button:has-text("Allow")',
            'Profile icon': 'img[alt*="profile picture"]',
            'Instagram logo': 'img[alt="Instagram"]',
            'Search box': 'input[placeholder*="Search"]'
        };

        for (const [name, selector] of Object.entries(checks)) {
            try {
                const count = await page.locator(selector).count();
                elements[name] = count > 0;
            } catch (error) {
                elements[name] = false;
            }
        }

        return elements;
    }

    async debugAuthentication(bot) {
        // Check if we're logged in
        const isLoggedIn = await this.checkLoginStatus(bot.page);
        
        if (isLoggedIn.loggedIn) {
            console.log('   ✅ Authenticated successfully');
            console.log(`   👤 Logged in as: ${isLoggedIn.username || 'Unknown'}`);
        } else {
            console.log('   ❌ Not authenticated');
            console.log('   🔑 Reason:', isLoggedIn.reason);
            
            if (isLoggedIn.needsSessionId) {
                console.log('   💡 Solution: Set INSTAGRAM_SESSION_ID in .env file');
                console.log('   📝 How to get session ID:');
                console.log('      1. Login to Instagram in your browser');
                console.log('      2. Open Developer Tools (F12)');
                console.log('      3. Go to Application/Storage > Cookies');
                console.log('      4. Find "sessionid" cookie and copy its value');
            }
        }
    }

    async checkLoginStatus(page) {
        try {
            // Check for username input (not logged in)
            const usernameInput = await page.locator('input[name="username"]').count();
            if (usernameInput > 0) {
                return {
                    loggedIn: false,
                    reason: 'Login form detected',
                    needsSessionId: true
                };
            }

            // Check for main feed content (logged in)
            const feedContent = await page.locator('article, main').count();
            if (feedContent > 0) {
                // Try to get username from profile link
                let username = 'Unknown';
                try {
                    const profileLink = await page.locator('a[href*="/"]').first().getAttribute('href');
                    if (profileLink) {
                        username = profileLink.replace('/', '');
                    }
                } catch (e) {
                    // Username detection failed, but still logged in
                }

                return {
                    loggedIn: true,
                    username: username
                };
            }

            return {
                loggedIn: false,
                reason: 'No feed content detected'
            };

        } catch (error) {
            return {
                loggedIn: false,
                reason: `Error checking status: ${error.message}`
            };
        }
    }

    async debugFeedAnalysis(bot) {
        try {
            // Find all possible content selectors
            const contentSelectors = [
                'article[role="presentation"]',
                'article',
                'div[role="main"] article',
                'main article',
                'div[role="main"] > div > div'
            ];

            let foundContent = false;
            let posts = [];

            for (const selector of contentSelectors) {
                const count = await bot.page.locator(selector).count();
                console.log(`   🔍 Selector "${selector}": ${count} elements`);
                
                if (count > 0 && !foundContent) {
                    posts = await bot.page.locator(selector).all();
                    foundContent = true;
                    console.log(`   ✅ Using selector: ${selector}`);
                }
            }

            if (!foundContent) {
                console.log('   ❌ No content found with any selector');
                console.log('   📸 Taking screenshot for manual inspection...');
                await bot.screenshot('no-content-found');
                return;
            }

            console.log(`   📊 Found ${posts.length} content items`);
            console.log('');

            // Analyze first few posts in detail
            const postsToAnalyze = Math.min(3, posts.length);
            console.log(`   🔬 ANALYZING FIRST ${postsToAnalyze} POSTS:`);
            console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

            for (let i = 0; i < postsToAnalyze; i++) {
                console.log(`   📱 POST #${i + 1}:`);
                await this.analyzePost(bot, posts[i], i + 1);
                console.log('');
            }

        } catch (error) {
            console.log(`   ❌ Feed analysis failed: ${error.message}`);
            await bot.screenshot('feed-analysis-error');
        }
    }

    async analyzePost(bot, postElement, postNumber) {
        try {
            // Extract all possible data from the post using a safer approach
            const postData = await postElement.evaluate((element) => {
                const data = {
                    html: element.outerHTML.substring(0, 500) + '...',
                    textContent: element.textContent.substring(0, 200) + '...',
                    hasImages: element.querySelectorAll('img').length,
                    hasVideos: element.querySelectorAll('video').length,
                    hasLinks: element.querySelectorAll('a').length,
                    hasButtons: element.querySelectorAll('button').length
                };

                // Try to extract specific data
                const usernameEl = element.querySelector('a[role="link"]');
                data.username = usernameEl ? usernameEl.textContent : 'Not found';

                const captionEl = element.querySelector('span[dir="auto"]');
                data.caption = captionEl ? captionEl.textContent.substring(0, 100) : 'Not found';

                const likeEl = element.querySelector('button span');
                data.likes = likeEl ? likeEl.textContent : 'Not found';

                return data;
            });

            console.log(`      👤 Username: ${postData.username}`);
            console.log(`      💬 Caption: ${postData.caption}${postData.caption.length > 100 ? '...' : ''}`);
            console.log(`      💯 Likes: ${postData.likes}`);
            console.log(`      🖼️ Images: ${postData.hasImages}, 🎥 Videos: ${postData.hasVideos}`);
            console.log(`      🔗 Links: ${postData.hasLinks}, 🔘 Buttons: ${postData.hasButtons}`);

            // Detect if this is trending content
            const isTrending = this.detectTrending(postData);
            if (isTrending) {
                console.log(`      🔥 TRENDING DETECTED!`);
            }

            // Save discovery
            this.discoveries.push({
                postNumber,
                username: postData.username,
                caption: postData.caption,
                likes: postData.likes,
                isTrending,
                timestamp: new Date().toISOString()
            });

            // Try to save to database
            if (this.dataLogger) {
                try {
                    await this.saveToDatabase(postData, isTrending);
                    console.log(`      💾 Saved to database`);
                } catch (error) {
                    console.log(`      ⚠️ Database save failed: ${error.message}`);
                }
            }

        } catch (error) {
            console.log(`      ❌ Error analyzing post: ${error.message}`);
        }
    }

    detectTrending(postData) {
        // Simple trending detection
        const likesText = postData.likes.toString().toLowerCase();
        const hasHighLikes = likesText.includes('k') || likesText.includes('m');
        const hasTrendingWords = postData.caption.toLowerCase().includes('viral') || 
                                postData.caption.toLowerCase().includes('trending') ||
                                postData.caption.toLowerCase().includes('ai');
        
        return hasHighLikes || hasTrendingWords;
    }

    async saveToDatabase(postData, isTrending) {
        const impressionData = {
            sessionId: require('uuid').v4(),
            platform: 'instagram',
            contentId: `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            contentType: 'post',
            creatorUsername: postData.username,
            viewDurationMs: 5000,
            caption: postData.caption,
            hashtags: this.extractHashtags(postData.caption),
            engagementMetrics: {
                likes: this.parseNumber(postData.likes),
                isTrending: isTrending
            }
        };

        await this.dataLogger.saveImpression(impressionData);

        if (isTrending) {
            await this.dataLogger.createAlert({
                alertType: 'trending_content',
                severity: 'medium',
                alertData: {
                    platform: 'instagram',
                    creator: postData.username,
                    content: postData.caption.substring(0, 100),
                    metrics: impressionData.engagementMetrics
                }
            });
        }
    }

    extractHashtags(text) {
        const hashtagRegex = /#[a-zA-Z0-9_]+/g;
        const matches = text.match(hashtagRegex);
        return matches ? matches.map(tag => tag.toLowerCase()) : [];
    }

    parseNumber(str) {
        if (!str) return 0;
        const numStr = str.replace(/[^\d.kmb]/gi, '');
        const multiplier = str.toLowerCase().includes('k') ? 1000 : 
                         str.toLowerCase().includes('m') ? 1000000 : 1;
        return parseFloat(numStr) * multiplier || 0;
    }

    showDiscoveries() {
        console.log('🎯 DISCOVERY SUMMARY:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        if (this.discoveries.length === 0) {
            console.log('❌ No content discovered');
            console.log('💡 This could mean:');
            console.log('   • Not logged in to Instagram');
            console.log('   • Page selectors have changed');
            console.log('   • Network/loading issues');
            return;
        }

        console.log(`📊 Total discoveries: ${this.discoveries.length}`);
        const trendingCount = this.discoveries.filter(d => d.isTrending).length;
        console.log(`🔥 Trending content: ${trendingCount}`);
        console.log('');

        this.discoveries.forEach((discovery, i) => {
            console.log(`${i + 1}. ${discovery.isTrending ? '🔥' : '📱'} @${discovery.username}`);
            console.log(`   💬 "${discovery.caption}"`);
            console.log(`   💯 ${discovery.likes} likes`);
            console.log(`   ⏰ ${new Date(discovery.timestamp).toLocaleTimeString()}`);
            console.log('');
        });

        console.log('🎯 NEXT STEPS:');
        console.log('• Run "node run-tech-savvy-bot.js" for full monitoring');
        console.log('• Check your Supabase dashboard for saved data');
        console.log('• Visit /bot-dashboard.html for real-time monitoring');
    }
}

async function runDebugSession() {
    const runner = new DebugInstagramRunner();
    
    try {
        await runner.initialize();
        await runner.runDebugSession();
        
        console.log('✅ DEBUG SESSION COMPLETE!');
        
    } catch (error) {
        console.error('❌ Debug session error:', error.message);
    }
}

runDebugSession().catch(console.error);