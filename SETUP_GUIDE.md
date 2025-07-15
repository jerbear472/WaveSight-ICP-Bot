# ICPScope Complete Setup Guide

## 📋 **Prerequisites**

You'll need accounts for:
- **Supabase** (free tier available)
- **GitHub** (free)
- **Render** (optional - for hosting)

## 🔧 **Step 1: Database Setup (Supabase)**

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up/login
3. Click "New Project"
4. Choose organization and create project
5. Wait for setup to complete

### 1.2 Set up Database Schema
1. Go to SQL Editor in Supabase dashboard
2. Copy contents from `config/supabase-schema.sql`
3. Paste and run the SQL script
4. Verify tables were created in Table Editor

### 1.3 Get API Credentials
1. Go to Settings → API
2. Copy your:
   - Project URL
   - Anon/Public key
   - Service Role key (for server)

## 🚀 **Step 2: Local Development Setup**

### 2.1 Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your credentials
```

Add your Supabase credentials to `.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here
```

### 2.2 Install Dependencies
```bash
npm install
```

### 2.3 Test Local Setup
```bash
# Start dashboard
npm run dashboard

# Visit: http://localhost:3000
```

## 📁 **Step 3: GitHub Repository**

### 3.1 Create Repository
1. Go to [github.com](https://github.com)
2. Click "New Repository"
3. Name it "ICPScope"
4. Make it public or private
5. Don't initialize with README (we have one)

### 3.2 Push Code
```bash
# Add all files
git add .

# Commit
git commit -m "Initial ICPScope implementation"

# Add remote (replace with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/ICPScope.git

# Push
git push -u origin main
```

## 🌐 **Step 4: Render Deployment (Optional)**

### 4.1 Connect Repository
1. Go to [render.com](https://render.com)
2. Sign up/login
3. Click "New" → "Web Service"
4. Connect your GitHub repository
5. Select the ICPScope repository

### 4.2 Configure Deployment
1. **Name**: ICPScope Dashboard
2. **Environment**: Node
3. **Build Command**: `npm install && npm run build`
4. **Start Command**: `npm start`
5. **Auto-Deploy**: Yes

### 4.3 Add Environment Variables
In Render dashboard, add:
```
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
DASHBOARD_PORT=10000
MAX_CONCURRENT_BOTS=3
```

## 🔧 **Step 5: Bot Configuration**

### 5.1 Proxy Setup (Optional)
For production bot usage, consider adding proxy credentials:
```env
PROXY_ENDPOINT=http://proxy.provider.com:8000
PROXY_USERNAME=your_username
PROXY_PASSWORD=your_password
```

### 5.2 Platform Sessions (Optional)
For enhanced bot capabilities:
```env
INSTAGRAM_SESSION_ID=optional_session_id
TIKTOK_SESSION_ID=optional_session_id
```

## 🧪 **Step 6: Testing**

### 6.1 Local Testing
```bash
# Test dashboard
npm run dashboard

# Test demo mode
npm run demo

# Test bot orchestrator
npm run orchestrator

# Test analytics
npm run analytics
```

### 6.2 Database Testing
```bash
# Test Supabase connection
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
supabase.from('icp_profiles').select('count').then(console.log);
"
```

## 📊 **Step 7: Usage**

### 7.1 Access Dashboard
- **Local**: `http://localhost:3000`
- **Render**: `https://your-app.onrender.com`

### 7.2 Start Bot Sessions
1. Open dashboard
2. Go to Bot Control section
3. Select ICP profile and platform
4. Click "Start Bot Session"
5. Monitor real-time data

### 7.3 View Analytics
- Check overview cards for key metrics
- Explore viral content table
- Monitor breakout creators
- Review trending hashtags
- Investigate anomalies

## 🔄 **Step 8: Automation**

### 8.1 Scheduled Bot Sessions
The orchestrator automatically runs bot sessions every 15 minutes when active.

### 8.2 Data Processing
- Trend analysis runs hourly
- Daily maintenance cleans old data
- Anomaly detection is continuous

## 🛠️ **Troubleshooting**

### Common Issues:

**"Missing Supabase credentials"**
- Check .env file has correct SUPABASE_URL and keys
- Verify Supabase project is active

**"Bot session failed"**
- Check network connectivity
- Verify platform is accessible
- Try with proxy if needed

**"Dashboard not loading"**
- Ensure port 3000 is available
- Check console for JavaScript errors
- Verify all dependencies installed

**"Database connection failed"**
- Confirm Supabase project is running
- Check API keys are correct
- Verify database schema is installed

## 📈 **Production Considerations**

### Performance:
- Use proxies for bot sessions
- Implement rate limiting
- Monitor resource usage
- Scale based on demand

### Security:
- Use service role key for server operations
- Implement proper authentication
- Monitor for suspicious activity
- Regular security updates

### Monitoring:
- Set up alerts for system issues
- Monitor bot success rates
- Track database performance
- Log important events

## 🎯 **Next Steps**

Once setup is complete:
1. **Customize ICP profiles** for your target audience
2. **Configure monitoring schedules** based on your needs
3. **Set up alerts** for important events
4. **Export data** for reporting
5. **Scale the system** based on usage

## 📞 **Support**

If you encounter issues:
1. Check this guide first
2. Review error logs in `/logs` directory
3. Test individual components
4. Verify all credentials are correct
5. Check GitHub issues for known problems

---

**🎉 You're ready to start monitoring your ICP trends!**