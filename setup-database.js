/**
 * Database Setup
 * Creates the required tables in Supabase for trend logging
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  console.log('🗄️ Setting up Supabase database tables...');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
  );

  try {
    // Test connection
    console.log('🔗 Testing connection...');
    const { data, error } = await supabase.from('content_impressions').select('count');
    
    if (error && error.code === 'PGRST116') {
      console.log('⚠️ Tables don\'t exist yet. Need to run SQL schema.');
      console.log('\n📋 SETUP INSTRUCTIONS:');
      console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and run the SQL from: config/supabase-schema.sql');
      console.log('4. Then run this script again');
      console.log('\n💡 Or run this SQL directly:');
      
      // Read and display the schema
      const schemaPath = path.join(__dirname, 'config', 'supabase-schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('SQL SCHEMA TO RUN IN SUPABASE:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(schema.substring(0, 1000) + '...');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      }
      
      return false;
    } else if (error) {
      console.error('❌ Database error:', error.message);
      return false;
    } else {
      console.log('✅ Database tables exist and accessible!');
      
      // Test each main table
      const tables = ['icp_profiles', 'bot_sessions', 'content_impressions', 'engagement_events'];
      for (const table of tables) {
        try {
          const { error } = await supabase.from(table).select('count');
          if (error) {
            console.log(`⚠️ Table ${table}: ${error.message}`);
          } else {
            console.log(`✅ Table ${table}: OK`);
          }
        } catch (e) {
          console.log(`❌ Table ${table}: ${e.message}`);
        }
      }
      
      console.log('\n🚀 Database is ready for bot data logging!');
      console.log('💡 Run "node run-tech-savvy-bot.js" to start collecting trends');
      return true;
    }
    
  } catch (error) {
    console.error('❌ Setup error:', error.message);
    return false;
  }
}

setupDatabase().catch(console.error);