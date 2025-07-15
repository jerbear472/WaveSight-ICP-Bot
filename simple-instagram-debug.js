/**
 * Simple Instagram Debug - Just show HTML structure
 */

require('dotenv').config();
const { chromium } = require('playwright');

async function simpleDebug() {
    console.log('🔍 SIMPLE INSTAGRAM DEBUG');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const browser = await chromium.launch({ 
        headless: false, // Show browser
        slowMo: 2000 
    });
    
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    });
    
    // Add session cookie if available
    if (process.env.INSTAGRAM_SESSION_ID) {
        await context.addCookies([{
            name: 'sessionid',
            value: process.env.INSTAGRAM_SESSION_ID,
            domain: '.instagram.com',
            path: '/',
            secure: true,
            httpOnly: true
        }]);
    }
    
    const page = await context.newPage();
    
    try {
        console.log('🌐 Navigating to Instagram...');
        await page.goto('https://www.instagram.com', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        console.log('📍 Current URL:', page.url());
        console.log('📄 Page Title:', await page.title());
        
        // Wait a moment for dynamic content
        await page.waitForTimeout(5000);
        
        // Check what's actually on the page
        console.log('\n🔍 LOOKING FOR CONTENT...');
        
        // Check for common Instagram selectors
        const selectors = [
            'article',
            'article[role="presentation"]', 
            'div[role="main"]',
            'main',
            'input[name="username"]', // Login form
            'img[alt*="profile"]',     // Profile pictures
            'a[href*="/p/"]',          // Post links
            'svg[aria-label="Like"]',  // Like buttons
            'canvas',                  // Stories
            'video',                   // Videos
            'span[dir="auto"]'         // Captions
        ];
        
        for (const selector of selectors) {
            const count = await page.locator(selector).count();
            console.log(`   ${count > 0 ? '✅' : '❌'} ${selector}: ${count} found`);
        }
        
        // Get page structure
        console.log('\n📋 PAGE STRUCTURE:');
        const structure = await page.evaluate(() => {
            const main = document.querySelector('main') || document.querySelector('[role="main"]') || document.body;
            return {
                mainElement: main ? main.tagName : 'NOT FOUND',
                mainChildren: main ? Array.from(main.children).map(child => child.tagName).slice(0, 10) : [],
                bodyClasses: document.body.className,
                hasReact: !!document.querySelector('[data-reactroot]'),
                totalElements: document.querySelectorAll('*').length
            };
        });
        
        console.log(`   Main element: ${structure.mainElement}`);
        console.log(`   Main children: ${structure.mainChildren.join(', ')}`);
        console.log(`   Body classes: ${structure.bodyClasses}`);
        console.log(`   Has React: ${structure.hasReact}`);
        console.log(`   Total elements: ${structure.totalElements}`);
        
        // Look for content more specifically
        console.log('\n🔎 DETAILED CONTENT SEARCH:');
        
        // Try to find any post-like content
        const contentSearch = await page.evaluate(() => {
            const results = [];
            
            // Look for articles
            const articles = document.querySelectorAll('article');
            articles.forEach((article, i) => {
                results.push({
                    type: 'article',
                    index: i,
                    textContent: article.textContent.substring(0, 100),
                    children: article.children.length,
                    hasImages: article.querySelectorAll('img').length,
                    hasVideos: article.querySelectorAll('video').length,
                    hasLinks: article.querySelectorAll('a').length
                });
            });
            
            // Look for divs with specific patterns
            const divs = document.querySelectorAll('div[role="main"] > div, main > div');
            Array.from(divs).slice(0, 5).forEach((div, i) => {
                if (div.children.length > 0) {
                    results.push({
                        type: 'main-div',
                        index: i,
                        textContent: div.textContent.substring(0, 100),
                        children: div.children.length,
                        hasImages: div.querySelectorAll('img').length,
                        hasVideos: div.querySelectorAll('video').length,
                        hasLinks: div.querySelectorAll('a').length
                    });
                }
            });
            
            return results;
        });
        
        if (contentSearch.length === 0) {
            console.log('   ❌ No content found');
            
            // Save a screenshot
            await page.screenshot({ path: 'instagram-debug.png', fullPage: true });
            console.log('   📸 Screenshot saved as: instagram-debug.png');
            
            // Check if we need to handle login
            const hasLoginForm = await page.locator('input[name="username"]').count() > 0;
            if (hasLoginForm) {
                console.log('   🔑 Login form detected - session cookie may be invalid');
            }
            
        } else {
            console.log(`   ✅ Found ${contentSearch.length} potential content items:`);
            
            contentSearch.forEach((item, i) => {
                console.log(`   ${i + 1}. ${item.type} #${item.index}:`);
                console.log(`      📝 Text: "${item.textContent.substring(0, 50)}..."`);
                console.log(`      👶 Children: ${item.children}`);
                console.log(`      🖼️ Images: ${item.hasImages}, 🎥 Videos: ${item.hasVideos}, 🔗 Links: ${item.hasLinks}`);
            });
            
            // Try to extract data from the first item
            if (contentSearch.length > 0) {
                console.log('\n🎯 EXTRACTING DATA FROM FIRST ITEM:');
                await extractFirstItemData(page, contentSearch[0]);
            }
        }
        
        console.log('\n⏸️ Pausing for 10 seconds so you can inspect the browser...');
        await page.waitForTimeout(10000);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        await page.screenshot({ path: 'instagram-error.png' });
        console.log('📸 Error screenshot saved');
    } finally {
        await browser.close();
    }
}

async function extractFirstItemData(page, contentInfo) {
    try {
        const selector = contentInfo.type === 'article' ? 'article' : 'div[role="main"] > div';
        
        const data = await page.evaluate((sel, idx) => {
            const elements = document.querySelectorAll(sel);
            const element = elements[idx];
            
            if (!element) return null;
            
            // Try multiple username selectors
            const usernameSelectors = [
                'a[role="link"]',
                'a[href*="/"]',
                'h2 a',
                'header a',
                'span[title]'
            ];
            
            let username = 'Not found';
            for (const userSel of usernameSelectors) {
                const userEl = element.querySelector(userSel);
                if (userEl && userEl.textContent.trim()) {
                    username = userEl.textContent.trim();
                    break;
                }
            }
            
            // Try multiple caption selectors
            const captionSelectors = [
                'span[dir="auto"]',
                'div[data-testid="post-caption"]',
                'article span',
                'p'
            ];
            
            let caption = 'Not found';
            for (const capSel of captionSelectors) {
                const capEl = element.querySelector(capSel);
                if (capEl && capEl.textContent.trim().length > 10) {
                    caption = capEl.textContent.trim().substring(0, 100);
                    break;
                }
            }
            
            // Try to find like count
            const likeSelectors = [
                'button span',
                'span[title]',
                'div[role="button"] span'
            ];
            
            let likes = 'Not found';
            for (const likeSel of likeSelectors) {
                const likeEls = element.querySelectorAll(likeSel);
                for (const likeEl of likeEls) {
                    const text = likeEl.textContent.trim();
                    if (text.match(/^\d/) || text.includes('like')) {
                        likes = text;
                        break;
                    }
                }
                if (likes !== 'Not found') break;
            }
            
            return {
                username,
                caption,
                likes,
                allText: element.textContent.substring(0, 200)
            };
            
        }, selector, contentInfo.index);
        
        if (data) {
            console.log(`   👤 Username: ${data.username}`);
            console.log(`   💬 Caption: ${data.caption}`);
            console.log(`   💯 Likes: ${data.likes}`);
            console.log(`   📝 All text preview: "${data.allText}..."`);
        } else {
            console.log('   ❌ Could not extract data');
        }
        
    } catch (error) {
        console.log(`   ❌ Extraction error: ${error.message}`);
    }
}

simpleDebug().catch(console.error);