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
        
        // Wave Rider configurations
        this.personas = {
            gen_z_tech_enthusiast: {
                name: '👩‍💻 Tech Wave Rider',
                traits: ['Tech-savvy', 'AI-interested', 'Startup-focused', 'Fast surfer'],
                scrollSpeed: 85,
                engagementRate: 75,
                interestKeywords: ['AI', 'tech', 'startup', 'crypto', 'NFT', 'Web3'],
                avgDwellTime: 8000,
                likeChance: 0.3,
                commentChance: 0.1,
                shareChance: 0.05
            },
            millennial_entrepreneur: {
                name: '🚀 Business Wave Rider',
                traits: ['Business-minded', 'Growth-focused', 'Leadership', 'Strategic surfer'],
                scrollSpeed: 60,
                engagementRate: 85,
                interestKeywords: ['business', 'entrepreneur', 'growth', 'leadership', 'productivity'],
                avgDwellTime: 12000,
                likeChance: 0.4,
                commentChance: 0.15,
                shareChance: 0.08
            },
            crypto_investor: {
                name: '₿ Crypto Wave Rider',
                traits: ['Investment-focused', 'Risk-aware', 'Market-savvy', 'Detail-oriented surfer'],
                scrollSpeed: 45,
                engagementRate: 90,
                interestKeywords: ['crypto', 'bitcoin', 'ethereum', 'DeFi', 'trading', 'investment'],
                avgDwellTime: 15000,
                likeChance: 0.5,
                commentChance: 0.2,
                shareChance: 0.1
            },
            mindfulness_seeker: {
                name: '🧘 Mindful Wave Rider',
                traits: ['Wellness-focused', 'Thoughtful', 'Mindful', 'Balanced surfer'],
                scrollSpeed: 35,
                engagementRate: 70,
                interestKeywords: ['mindfulness', 'wellness', 'meditation', 'health', 'balance'],
                avgDwellTime: 18000,
                likeChance: 0.6,
                commentChance: 0.25,
                shareChance: 0.12
            },
            fashion_beauty_enthusiast: {
                name: '💄 Fashion Wave Rider',
                traits: ['Style-conscious', 'Trend-aware', 'Beauty-focused', 'Visual surfer'],
                scrollSpeed: 70,
                engagementRate: 80,
                interestKeywords: ['fashion', 'beauty', 'style', 'makeup', 'skincare', 'outfit'],
                avgDwellTime: 10000,
                likeChance: 0.7,
                commentChance: 0.3,
                shareChance: 0.15
            },
            fitness_health_focused: {
                name: '💪 Fitness Wave Rider',
                traits: ['Health-conscious', 'Active', 'Goal-oriented', 'Motivated surfer'],
                scrollSpeed: 65,
                engagementRate: 75,
                interestKeywords: ['fitness', 'workout', 'gym', 'health', 'nutrition', 'wellness'],
                avgDwellTime: 11000,
                likeChance: 0.5,
                commentChance: 0.2,
                shareChance: 0.1
            },
            parent_family_oriented: {
                name: '👨‍👩‍👧 Family Wave Rider',
                traits: ['Family-focused', 'Practical', 'Community-minded', 'Careful surfer'],
                scrollSpeed: 40,
                engagementRate: 65,
                interestKeywords: ['parenting', 'family', 'kids', 'education', 'home', 'recipes'],
                avgDwellTime: 14000,
                likeChance: 0.4,
                commentChance: 0.35,
                shareChance: 0.2
            }
        };
        
        this.initialize();
    }

    initialize() {
        console.log('🏄‍♀️ Initializing Surfer Bot Live Viewer...');
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
                creators: [
                    'techguru22', 'mindmatterlife', 'startuplife', 'aiexplorer', 'cryptokid',
                    'fashionista_x', 'healthyvibes', 'travel_stories', 'foodie_adventures', 'fitness_journey',
                    'art_collective', 'photo_daily', 'nature_lover', 'city_explorer', 'lifestyle_blog',
                    'beauty_tips', 'home_decor', 'diy_crafts', 'pet_lovers', 'music_vibes',
                    'dance_life', 'comedy_central', 'motivation_daily', 'entrepreneur_hub', 'student_life',
                    'gamer_zone', 'book_worm', 'movie_buff', 'sports_fan', 'car_enthusiast',
                    'tech_reviews', 'gadget_geek', 'coding_ninja', 'design_inspiration', 'marketing_pro',
                    'finance_tips', 'real_estate', 'stock_trader', 'crypto_news', 'nft_artist',
                    'yoga_practice', 'meditation_guru', 'wellness_coach', 'nutrition_facts', 'recipe_share',
                    'baking_love', 'coffee_addict', 'wine_tasting', 'street_food', 'restaurant_reviews'
                ],
                contentTypes: ['image', 'video', 'carousel', 'story', 'reel']
            },
            tiktok: {
                icon: '🎵',
                creators: [
                    'genztechie', 'trendsetter', 'cryptoking', 'mindfulvibes', 'techtalks',
                    'dance_viral', 'comedy_gold', 'life_hacks', 'cooking_quick', 'fashion_trends',
                    'workout_motivation', 'study_tips', 'art_process', 'music_covers', 'pet_tricks',
                    'travel_vlogs', 'food_reviews', 'makeup_tutorials', 'skin_care', 'hair_styles',
                    'diy_projects', 'home_organization', 'plant_parent', 'gaming_clips', 'anime_fan',
                    'movie_reviews', 'book_recommendations', 'language_learning', 'science_facts', 'history_lessons',
                    'math_tricks', 'physics_fun', 'chemistry_experiments', 'biology_basics', 'psychology_tips',
                    'relationship_advice', 'parenting_hacks', 'teacher_life', 'nurse_stories', 'doctor_diary',
                    'lawyer_talks', 'engineer_builds', 'artist_creates', 'musician_jams', 'dancer_moves',
                    'athlete_trains', 'chef_cooks', 'barista_brews', 'bartender_mixes', 'retail_reality'
                ],
                contentTypes: ['video', 'live', 'photo_slideshow']
            }
        };

        // Expanded captions with various themes
        const captionTemplates = [
            // Tech & AI
            'This AI tool just revolutionized my entire workflow! Game changer 🤖',
            'Finally tried ChatGPT for {task} and I\'m blown away 🤯',
            'New app alert: {appname} is changing how we {action} 📱',
            'Web3 is the future and here\'s why you should care 🌐',
            'Just discovered this {tech} hack that saves me 2 hours daily ⏰',
            
            // Crypto & Finance
            'POV: You started investing in crypto at 22 and now understand money better 💰',
            'Breaking down {crypto} for beginners - swipe for simple explanation →',
            'My portfolio is up {percent}% this month - here\'s my strategy 📈',
            'Financial freedom starts with these 3 simple habits 💳',
            'Why I\'m bullish on {token} for 2024 🚀',
            
            // Wellness & Mindfulness
            'Daily meditation practice that actually changed my life ✨',
            '5-minute morning routine for mental clarity 🧘‍♀️',
            'Your reminder to take a deep breath and reset 🌸',
            'Anxiety hack that actually works - try this now 🦋',
            'Self-care isn\'t selfish - normalize taking breaks 💚',
            
            // Business & Entrepreneurship
            'Building my first startup at 25 - here\'s what I learned 🎯',
            'From side hustle to 6 figures - the honest journey 💼',
            'Quit my 9-5 to pursue my passion - no regrets 🔥',
            'Business tip: {strategy} increased my sales by 300% 📊',
            'Entrepreneurship isn\'t glamorous but it\'s worth it 💪',
            
            // Lifestyle & Fashion
            'Outfit of the day - mixing high street with vintage finds 👗',
            'Minimalist wardrobe challenge day 30 - life changing! 🎽',
            'Thrift flip: $5 jacket transformed into designer look ✂️',
            'Sustainable fashion tips that don\'t break the bank 🌱',
            'Color theory changed how I dress - swipe to see how →',
            
            // Food & Cooking
            '15-minute dinner recipe that tastes like it took hours 🍝',
            'Meal prep Sunday - 5 meals for under $20 🥗',
            'Gordon Ramsay approved this recipe and I\'m shook 👨‍🍳',
            'Vegan {dish} that even meat lovers will enjoy 🌮',
            'Restaurant {cuisine} at home - easier than you think! 🍜',
            
            // Fitness & Health
            '30-day transformation - consistency is key 💪',
            'No gym? No problem! Home workout that actually works 🏠',
            'Lost 20lbs without giving up pizza - here\'s how 🍕',
            'Morning run views hitting different today 🏃‍♀️',
            'Form check: are you doing {exercise} correctly? 🏋️',
            
            // Travel & Adventure
            'Hidden gem in {location} that tourists don\'t know about 🗺️',
            'Solo travel changed my perspective on everything ✈️',
            'Budget travel hack: {tip} saved me $500 💸',
            'Sunrise at {landmark} was worth the 4am wake up 🌅',
            'Digital nomad life: working from {country} this month 💻',
            
            // Entertainment & Pop Culture
            'Did anyone else notice this detail in {show}? 🎬',
            'Unpopular opinion: {celebrity} is actually underrated 🌟',
            'This {year} song still hits different 🎵',
            'Theory: {character} is the real villain - here\'s why 🎭',
            'Recreating {celebrity}\'s iconic look on a budget 💄',
            
            // Education & Learning
            'Study method that got me straight A\'s this semester 📚',
            'Learning {language} - day 100 progress update 🗣️',
            'Khan Academy > expensive tutors (and it\'s free!) 🎓',
            'Note-taking app that changed my life: {appname} 📝',
            'Why everyone should learn to code in 2024 💻',
            
            // DIY & Creativity
            'Pinterest fail turned into something amazing 🎨',
            'IKEA hack that looks like expensive furniture 🔨',
            'Room makeover for under $100 - swipe for before/after 🏡',
            'Upcycling old {item} into home decor 🌿',
            'Art therapy: painting my feelings helped me heal 🖌️',
            
            // Humor & Trends
            'Tell me you\'re {trait} without telling me you\'re {trait} 😂',
            'POV: Your {relation} finds your TikTok account 👀',
            'Things that live rent-free in my head: a thread 🧵',
            'Rating {topic} as {character} - chaotic edition 🎲',
            'No one: Absolutely no one: Me at 3am: {action} 🌙'
        ];

        const trendingTopics = [
            '#normcore', '#homesteading', '#antipastaslad', '#bugatti', '#sustainability',
            '#minimalism', '#plantbased', '#remotework', '#selfcare', '#productivity',
            '#mentalhealth', '#sidehustle', '#budgeting', '#zerowaste', '#vintage',
            '#streetstyle', '#mealprep', '#homeworkout', '#solotravel', '#studygram',
            '#smallbusiness', '#cryptocurrency', '#nftart', '#mindfulness', '#veganuary',
            '#techreview', '#bookstagram', '#filmtok', '#genzhumor', '#millenniallife'
        ];

        this.contentItems = [];
        const platform = platforms[this.currentPlatform];

        // Generate 50-100 diverse content items
        const contentCount = Math.floor(Math.random() * 50) + 50;
        
        for (let i = 0; i < contentCount; i++) {
            const creator = platform.creators[Math.floor(Math.random() * platform.creators.length)];
            const contentType = platform.contentTypes[Math.floor(Math.random() * platform.contentTypes.length)];
            
            // Generate dynamic caption
            let caption = captionTemplates[Math.floor(Math.random() * captionTemplates.length)];
            
            // Replace placeholders
            caption = caption.replace('{task}', ['coding', 'writing', 'designing', 'planning'][Math.floor(Math.random() * 4)]);
            caption = caption.replace('{appname}', ['Notion', 'Figma', 'Linear', 'Obsidian'][Math.floor(Math.random() * 4)]);
            caption = caption.replace('{action}', ['work', 'communicate', 'create', 'organize'][Math.floor(Math.random() * 4)]);
            caption = caption.replace('{tech}', ['productivity', 'automation', 'AI', 'workflow'][Math.floor(Math.random() * 4)]);
            caption = caption.replace('{crypto}', ['Bitcoin', 'Ethereum', 'DeFi', 'NFTs'][Math.floor(Math.random() * 4)]);
            caption = caption.replace('{percent}', Math.floor(Math.random() * 50) + 10);
            caption = caption.replace('{token}', ['BTC', 'ETH', 'SOL', 'MATIC'][Math.floor(Math.random() * 4)]);
            caption = caption.replace('{strategy}', ['email marketing', 'social proof', 'content marketing', 'SEO'][Math.floor(Math.random() * 4)]);
            caption = caption.replace('{dish}', ['burger', 'pasta', 'tacos', 'curry'][Math.floor(Math.random() * 4)]);
            caption = caption.replace('{cuisine}', ['Italian', 'Japanese', 'Mexican', 'Thai'][Math.floor(Math.random() * 4)]);
            caption = caption.replace('{exercise}', ['squats', 'deadlifts', 'push-ups', 'planks'][Math.floor(Math.random() * 4)]);
            caption = caption.replace('{location}', ['Bali', 'Tokyo', 'Barcelona', 'Iceland'][Math.floor(Math.random() * 4)]);
            caption = caption.replace('{landmark}', ['Machu Picchu', 'Santorini', 'Mt. Fuji', 'Northern Lights'][Math.floor(Math.random() * 4)]);
            caption = caption.replace('{country}', ['Portugal', 'Thailand', 'Mexico', 'Dubai'][Math.floor(Math.random() * 4)]);
            caption = caption.replace('{show}', ['Stranger Things', 'The Office', 'Breaking Bad', 'Friends'][Math.floor(Math.random() * 4)]);
            caption = caption.replace('{celebrity}', ['Zendaya', 'Timothée Chalamet', 'Billie Eilish', 'Drake'][Math.floor(Math.random() * 4)]);
            caption = caption.replace('{year}', ['90s', '2000s', '2010s', '80s'][Math.floor(Math.random() * 4)]);
            caption = caption.replace('{character}', ['Walter White', 'Michael Scott', 'Eleven', 'Ross'][Math.floor(Math.random() * 4)]);
            caption = caption.replace('{language}', ['Spanish', 'Japanese', 'French', 'Korean'][Math.floor(Math.random() * 4)]);
            caption = caption.replace('{item}', ['jeans', 't-shirts', 'furniture', 'books'][Math.floor(Math.random() * 4)]);
            caption = caption.replace('{trait}', ['Gen Z', 'millennial', 'introvert', 'coffee addict'][Math.floor(Math.random() * 4)]);
            caption = caption.replace('{relation}', ['mom', 'boss', 'ex', 'crush'][Math.floor(Math.random() * 4)]);
            caption = caption.replace('{topic}', ['foods', 'movies', 'songs', 'memes'][Math.floor(Math.random() * 4)]);
            
            // Add trending hashtags
            const hashtagCount = Math.floor(Math.random() * 5) + 3;
            const selectedHashtags = [];
            for (let j = 0; j < hashtagCount; j++) {
                selectedHashtags.push(trendingTopics[Math.floor(Math.random() * trendingTopics.length)]);
            }
            caption += ' ' + selectedHashtags.join(' ');
            
            // Generate realistic engagement metrics based on creator popularity
            const isPopular = Math.random() > 0.7;
            const baseViews = isPopular ? Math.floor(Math.random() * 500000) + 50000 : Math.floor(Math.random() * 50000) + 1000;
            const engagementRate = Math.random() * 0.15 + 0.02; // 2-17% engagement
            
            this.contentItems.push({
                id: `content_${i}`,
                platform: this.currentPlatform,
                contentType,
                creator,
                caption,
                hashtags: this.extractHashtags(caption),
                views: baseViews,
                likes: Math.floor(baseViews * engagementRate),
                comments: Math.floor(baseViews * engagementRate * 0.1),
                shares: Math.floor(baseViews * engagementRate * 0.05),
                saves: Math.floor(baseViews * engagementRate * 0.08),
                timestamp: new Date(Date.now() - Math.floor(Math.random() * 86400000)).toISOString() // Random time within last 24h
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

        console.log('🏄‍♀️ Starting Surfer Bot session...');
        
        // Check if real bot client is available
        if (window.botClient) {
            console.log('🔗 Connecting to real bot backend...');
            this.startRealBot();
            return;
        }
        
        // Fallback to simulation if backend not connected
        console.log('⚠️ Backend not connected - using simulation mode');
        this.addActivity('warning', '⚠️ Running in simulation mode - Start backend server for real data');
        
        this.isRunning = true;
        this.sessionId = 'session_' + Date.now();
        this.startTime = Date.now();
        this.activityCount = 0;
        this.sessionData = [];
        this.currentContentIndex = 0;

        // Update UI
        this.updateStatus('running', 'Surfer Bot Surfing');
        this.showSessionProgress();
        this.hideConfigPanel();
        this.showBehaviorPanel();
        
        // Start timers
        this.startSessionTimer();
        this.startProgressTimer();
        
        // Start bot simulation
        this.simulateBotActivity();

        // Log start
        this.addActivityLog('🏄‍♀️', 'Surfing session started', `${this.personas[this.currentPersona].name} on ${this.currentPlatform}`);

        // Auto-stop after duration
        setTimeout(() => {
            if (this.isRunning) {
                this.stopBot();
            }
        }, this.duration);
    }

    stopBot() {
        if (!this.isRunning) return;

        console.log('⏹️ Stopping Surfer Bot session...');
        
        this.isRunning = false;
        
        // Stop timers
        if (this.timer) clearInterval(this.timer);
        if (this.progressTimer) clearInterval(this.progressTimer);
        
        // Update UI
        this.updateStatus('offline', 'Surfer Bot Offline');
        this.hideSessionProgress();
        this.showConfigPanel();
        this.hideBehaviorPanel();
        
        // Log stop
        this.addActivityLog('⏹️', 'Surfing session ended', `Total actions: ${this.activityCount}`);
        
        // Show session summary
        setTimeout(() => {
            this.showSessionSummary();
        }, 1000);
    }

    async startRealBot() {
        try {
            this.isRunning = true;
            this.startTime = Date.now();
            this.activityCount = 0;
            
            // Get configuration
            const platform = document.getElementById('platformSelect').value;
            const profileType = document.getElementById('personaSelect').value;
            const duration = parseInt(document.getElementById('durationSelect').value);
            
            // Update UI
            this.updateStatus('running', 'Connecting to bot...');
            this.showSessionProgress();
            
            // Connect to backend
            window.botClient.connect();
            
            // Set up real-time callbacks
            window.botClient.onContentDiscovered((data) => {
                console.log('📱 Real content discovered:', data);
                this.displayRealContent(data.content);
                this.addActivityLog('📱', 'Real content viewed', `@${data.content.creator}: ${data.content.caption?.substring(0, 30)}...`);
                this.activityCount++;
            });
            
            window.botClient.onSessionComplete((data) => {
                console.log('✅ Real session complete:', data);
                this.stopBot();
            });
            
            // Start the real bot
            const result = await window.botClient.startBot(platform, profileType, duration);
            this.sessionId = result.sessionId;
            
            this.updateStatus('running', '🔴 LIVE - Check browser window!');
            this.addActivityLog('🚀', 'Real bot started', 'Chrome window opened - watch for real Instagram/TikTok scrolling');
            
        } catch (error) {
            console.error('Failed to start real bot:', error);
            this.addActivityLog('❌', 'Bot start failed', error.message);
            this.updateStatus('offline', 'Bot start failed');
            this.isRunning = false;
        }
    }

    displayRealContent(content) {
        const screenContent = document.getElementById('screenContent');
        
        // Update screen with real content
        const contentHTML = `
            <div class="real-content-view" style="padding: 20px; text-align: center; height: 100%;">
                <div style="color: #00ff00; margin-bottom: 10px; font-weight: bold;">🔴 LIVE CONTENT</div>
                <div class="content-header" style="margin-bottom: 15px;">
                    <div class="creator-name" style="font-weight: bold; font-size: 18px;">@${content.creator}</div>
                    ${content.creatorVerified ? '<span style="color: #1DA1F2;">✓ Verified</span>' : ''}
                </div>
                <div class="platform-badge" style="margin: 10px 0;">
                    <span style="background: ${content.platform === 'tiktok' ? '#000' : '#E4405F'}; color: white; padding: 5px 10px; border-radius: 15px;">
                        ${content.platform === 'tiktok' ? '🎵 TikTok' : '📱 Instagram'}
                    </span>
                </div>
                <div class="content-caption" style="margin: 15px 0; font-size: 14px; max-height: 60px; overflow: hidden;">
                    ${content.caption || 'No caption'}
                </div>
                <div class="content-metrics" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0;">
                    <div>❤️ ${this.formatNumber(content.likes)}</div>
                    <div>💬 ${this.formatNumber(content.comments)}</div>
                    <div>🔄 ${this.formatNumber(content.shares)}</div>
                    <div>👁️ ${this.formatNumber(content.views)}</div>
                </div>
                ${content.hashtags && content.hashtags.length > 0 ? `
                    <div style="margin-top: 15px; font-size: 12px;">
                        ${content.hashtags.slice(0, 3).map(tag => `<span style="color: #1DA1F2; margin: 0 3px;">${tag}</span>`).join(' ')}
                    </div>
                ` : ''}
                <div style="position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); font-size: 11px; color: #888;">
                    Data saved to Supabase ✓
                </div>
            </div>
        `;
        
        screenContent.innerHTML = contentHTML;
    }

    formatNumber(num) {
        if (!num || num === 0) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
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
                    <p><strong>🏄‍♀️ Wave Rider:</strong> ${this.personas[this.currentPersona].name}</p>
                </div>
            </div>
            <div style="margin-top: 1.5rem;">
                <h4>🎯 Key Insights</h4>
                <p>Your ${this.personas[this.currentPersona].name} surfed through ${this.currentContentIndex} pieces of content and engaged with ${Math.round(engagementRate)}% of them, demonstrating typical surfing patterns for this Wave Rider profile.</p>
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