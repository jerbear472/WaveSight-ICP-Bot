/**
 * Test Setup - Check environment and connections
 */

require('dotenv').config();

async function testSetup() {
    console.log('🔧 TESTING ICPSCOPE SETUP');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // 1. Check environment variables
    console.log('1. 📋 ENVIRONMENT VARIABLES:');
    const requiredEnvVars = [
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_KEY',
        'INSTAGRAM_SESSION_ID',
        'INSTAGRAM_USERNAME'
    ];
    
    requiredEnvVars.forEach(varName => {
        const value = process.env[varName];
        if (value) {
            const preview = varName.includes('KEY') || varName.includes('SESSION') 
                ? value.substring(0, 20) + '...' 
                : value;
            console.log(`   ✅ ${varName}: ${preview}`);
        } else {
            console.log(`   ❌ ${varName}: Missing`);
        }
    });
    console.log('');

    // 2. Test Supabase connection
    console.log('2. 🗄️ SUPABASE CONNECTION:');
    try {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
        );
        
        const { data, error } = await supabase.from('content_impressions').select('count');
        
        if (error) {
            if (error.code === 'PGRST116') {
                console.log('   ⚠️ Tables not created yet');
                console.log('   💡 Run: node setup-database.js');
            } else {
                console.log(`   ❌ Connection error: ${error.message}`);
            }
        } else {
            console.log('   ✅ Connected successfully');
        }
    } catch (error) {
        console.log(`   ❌ Setup error: ${error.message}`);
    }
    console.log('');

    // 3. Check dependencies
    console.log('3. 📦 DEPENDENCIES:');
    const dependencies = [
        'playwright',
        '@supabase/supabase-js',
        'dotenv',
        'winston',
        'uuid'
    ];
    
    dependencies.forEach(dep => {
        try {
            require(dep);
            console.log(`   ✅ ${dep}: Installed`);
        } catch (error) {
            console.log(`   ❌ ${dep}: Missing - run npm install ${dep}`);
        }
    });
    console.log('');

    // 4. Check required directories
    console.log('4. 📁 DIRECTORIES:');
    const fs = require('fs');
    const directories = ['logs', 'screenshots', 'data'];
    
    directories.forEach(dir => {
        if (fs.existsSync(dir)) {
            console.log(`   ✅ ${dir}/: Exists`);
        } else {
            try {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`   ✅ ${dir}/: Created`);
            } catch (error) {
                console.log(`   ❌ ${dir}/: Cannot create - ${error.message}`);
            }
        }
    });
    console.log('');

    // 5. Test browser initialization
    console.log('5. 🌐 BROWSER TEST:');
    try {
        const { chromium } = require('playwright');
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto('https://www.google.com');
        const title = await page.title();
        await browser.close();
        console.log(`   ✅ Browser works: ${title}`);
    } catch (error) {
        console.log(`   ❌ Browser error: ${error.message}`);
        console.log('   💡 Try: npx playwright install chromium');
    }
    console.log('');

    // Summary
    console.log('🎯 QUICK START COMMANDS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 Debug what bot sees:     node debug-instagram-bot.js');
    console.log('🤖 Run tech-savvy bots:     node run-tech-savvy-bot.js');
    console.log('🗄️ Setup database:          node setup-database.js');
    console.log('📊 View dashboard:           http://localhost:3000/bot-dashboard.html');
    console.log('');
    console.log('✅ Setup test complete!');
}

testSetup().catch(console.error);