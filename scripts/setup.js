#!/usr/bin/env node

/**
 * ICPScope Setup Script
 * Initializes the ICPScope system and creates required directories
 */

const fs = require('fs');
const path = require('path');

class ICPScopeSetup {
  constructor() {
    this.requiredDirs = [
      'logs',
      'screenshots',
      'data',
      'config/profiles',
      'tests/fixtures'
    ];
    
    this.requiredFiles = [
      '.env'
    ];
  }

  /**
   * Run complete setup
   */
  async run() {
    console.log('🚀 Starting ICPScope Setup...\n');
    
    try {
      this.createDirectories();
      this.createEnvironmentFile();
      this.installDependencies();
      this.showCompletionMessage();
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Create required directories
   */
  createDirectories() {
    console.log('📁 Creating required directories...');
    
    this.requiredDirs.forEach(dir => {
      const fullPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`   ✅ Created: ${dir}`);
      } else {
        console.log(`   ⚠️  Already exists: ${dir}`);
      }
    });
  }

  /**
   * Create environment file if not exists
   */
  createEnvironmentFile() {
    console.log('\n🔧 Setting up environment configuration...');
    
    const envPath = path.join(process.cwd(), '.env');
    const envExamplePath = path.join(process.cwd(), '.env.example');
    
    if (!fs.existsSync(envPath)) {
      if (fs.existsSync(envExamplePath)) {
        fs.copyFileSync(envExamplePath, envPath);
        console.log('   ✅ Created .env from .env.example');
        console.log('   ⚠️  Please edit .env file with your configuration');
      } else {
        console.log('   ❌ .env.example not found');
      }
    } else {
      console.log('   ⚠️  .env already exists');
    }
  }

  /**
   * Install dependencies
   */
  installDependencies() {
    console.log('\n📦 Installing dependencies...');
    
    const { execSync } = require('child_process');
    
    try {
      console.log('   Installing npm packages...');
      execSync('npm install', { stdio: 'inherit' });
      console.log('   ✅ Dependencies installed successfully');
    } catch (error) {
      console.log('   ❌ Failed to install dependencies');
      console.log('   Please run: npm install');
    }
  }

  /**
   * Show completion message
   */
  showCompletionMessage() {
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ICPScope Setup Complete!');
    console.log('='.repeat(60));
    console.log('\n📋 Next Steps:');
    console.log('1. Edit .env file with your API keys and configuration');
    console.log('2. Set up your Supabase database:');
    console.log('   - Create a new Supabase project');
    console.log('   - Run the SQL schema: config/supabase-schema.sql');
    console.log('   - Add your Supabase URL and keys to .env');
    console.log('3. Test the setup:');
    console.log('   npm run test');
    console.log('4. Start the system:');
    console.log('   npm start');
    console.log('5. Open the dashboard:');
    console.log('   npm run dashboard');
    console.log('\n📚 Documentation:');
    console.log('- README.md - Complete setup guide');
    console.log('- API Documentation: /docs');
    console.log('- Bot Configuration: /config');
    console.log('\n🔧 Development Commands:');
    console.log('- npm run dev          - Start with auto-reload');
    console.log('- npm run bot:instagram - Run Instagram bot only');
    console.log('- npm run bot:tiktok   - Run TikTok bot only');
    console.log('- npm run analytics    - Run analytics processor');
    console.log('- npm run dashboard    - Start dashboard server');
    console.log('\n⚡ Ready to monitor your ICP trends!');
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new ICPScopeSetup();
  setup.run();
}

module.exports = ICPScopeSetup;