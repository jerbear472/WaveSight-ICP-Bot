const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('🔗 Testing Supabase connection...');

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase credentials in .env file');
  console.log('Please check your SUPABASE_URL and SUPABASE_ANON_KEY values');
  process.exit(1);
}

if (supabaseUrl.includes('YOUR_PROJECT_URL_HERE') || supabaseKey.includes('YOUR_ANON_KEY_HERE')) {
  console.log('❌ Please replace placeholder values in .env file with your actual Supabase credentials');
  process.exit(1);
}

console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    const { data, error } = await supabase.from('icp_profiles').select('count');
    
    if (error) {
      console.log('❌ Connection failed:', error.message);
      console.log('💡 Make sure you:');
      console.log('   1. Created the database tables using the SQL schema');
      console.log('   2. Have the correct API keys in your .env file');
    } else {
      console.log('✅ Supabase connection successful!');
      console.log('📊 Database is ready');
      console.log('🚀 You can now start the ICPScope system');
    }
  } catch (err) {
    console.log('❌ Connection error:', err.message);
  }
}

testConnection();