/**
 * Fix Database RLS Policies
 * Adds policies to allow the service key to insert data
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function fixPolicies() {
    console.log('🔧 FIXING SUPABASE RLS POLICIES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Use service key for admin operations
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
    );
    
    try {
        console.log('1. Testing service key access...');
        
        // Test insert with service key
        const testData = {
            sessionId: 'test_' + Date.now(),
            platform: 'instagram',
            contentId: 'test_content_' + Date.now(),
            contentType: 'test',
            creatorUsername: 'test_user',
            viewDurationMs: 1000,
            caption: 'Test caption',
            hashtags: ['#test'],
            engagementMetrics: { test: true }
        };
        
        const { data, error } = await supabase
            .from('content_impressions')
            .insert(testData)
            .select();
        
        if (error) {
            console.log('❌ Service key insert failed:', error.message);
            
            if (error.message.includes('row-level security')) {
                console.log('🔧 Creating RLS policies...');
                
                // Create policies for service key access
                const policies = [
                    {
                        table: 'content_impressions',
                        policy: `
                        CREATE POLICY "Service key can insert impressions" ON content_impressions
                        FOR INSERT WITH CHECK (true);
                        `
                    },
                    {
                        table: 'engagement_events', 
                        policy: `
                        CREATE POLICY "Service key can insert engagements" ON engagement_events
                        FOR INSERT WITH CHECK (true);
                        `
                    },
                    {
                        table: 'trending_alerts',
                        policy: `
                        CREATE POLICY "Service key can insert alerts" ON trending_alerts
                        FOR INSERT WITH CHECK (true);
                        `
                    },
                    {
                        table: 'bot_sessions',
                        policy: `
                        CREATE POLICY "Service key can insert sessions" ON bot_sessions
                        FOR INSERT WITH CHECK (true);
                        `
                    },
                    {
                        table: 'icp_profiles',
                        policy: `
                        CREATE POLICY "Service key can insert profiles" ON icp_profiles
                        FOR INSERT WITH CHECK (true);
                        `
                    }
                ];
                
                console.log('📋 SQL COMMANDS TO RUN IN SUPABASE:');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('Go to Supabase Dashboard > SQL Editor and run these commands:');
                console.log('');
                
                policies.forEach((p, i) => {
                    console.log(`-- ${i + 1}. Policy for ${p.table}`);
                    console.log(p.policy.trim());
                    console.log('');
                });
                
                console.log('-- OR disable RLS entirely (simpler but less secure):');
                console.log('ALTER TABLE content_impressions DISABLE ROW LEVEL SECURITY;');
                console.log('ALTER TABLE engagement_events DISABLE ROW LEVEL SECURITY;');
                console.log('ALTER TABLE trending_alerts DISABLE ROW LEVEL SECURITY;');
                console.log('ALTER TABLE bot_sessions DISABLE ROW LEVEL SECURITY;');
                console.log('ALTER TABLE icp_profiles DISABLE ROW LEVEL SECURITY;');
                console.log('');
                console.log('💡 After running these, your bot will be able to save data!');
                
            } else {
                console.log('❌ Different error:', error.message);
            }
        } else {
            console.log('✅ Service key can insert data successfully!');
            console.log('📊 Test record created:', data[0]?.id);
            
            // Clean up test record
            await supabase
                .from('content_impressions')
                .delete()
                .eq('sessionId', testData.sessionId);
            
            console.log('🧹 Test record cleaned up');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
    
    console.log('');
    console.log('🎯 ONCE FIXED, RUN:');
    console.log('   node working-instagram-debug.js    # Test data saving');
    console.log('   node run-tech-savvy-bot.js         # Full monitoring');
}

fixPolicies().catch(console.error);