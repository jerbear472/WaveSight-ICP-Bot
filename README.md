# ICPScope - ICP Bot Intelligence Platform

> **Advanced ICP Bot Monitoring System** - Track what your ideal customers see on social platforms with AI-powered analytics

ICPScope uses autonomous bots that simulate your Ideal Customer Profiles (ICPs) to monitor trends on Instagram and TikTok, providing real-world performance insights filtered through the lens of your target audience.

## 🚀 **Quick Start**

### 1. **Setup**
```bash
# Clone or download the project
cd ICPScope

# Run automatic setup
node scripts/setup.js

# Install dependencies
npm install
```

### 2. **Configuration**
```bash
# Edit environment variables
cp .env.example .env
# Add your API keys and configuration
```

### 3. **Database Setup**
```sql
-- Run in your Supabase SQL editor
-- Import: config/supabase-schema.sql
```

### 4. **Start the System**
```bash
# Start orchestrator
npm start

# Start dashboard (separate terminal)
npm run dashboard

# Visit: http://localhost:3000
```

## 🎯 **Core Use Case**

**Marketing teams** want real-world performance insights from platforms like **TikTok** and **Instagram** — but filtered through the lens of their ideal customer. 

ICPScope bots simulate ICPs, scroll content, and log impressions, interactions, and attention patterns, giving you:

- **What your ICP actually sees** in their feeds
- **Competitor tracking** among your target demographic  
- **Influencer insights** for breakout creators
- **Ad hook testing** with real engagement data
- **Campaign performance** vs. organic reach

## 🏗️ **System Architecture**

```
🤖 ICP Bot Engine → 📊 Data Logger → 🧠 Analytics Engine → 📈 Dashboard
     ↓                   ↓              ↓                ↓
✨ Human-like        📄 Supabase    🔍 Trend Intel    📱 Client UI
   Behavior          Database      & Forecasting      & Reports
```

### **Components**

1. **🤖 ICP Bot Engine** - Playwright-based bots with human-like behavior
2. **📊 Data Logger** - Supabase integration for real-time data storage  
3. **🧠 Analytics Engine** - AI-powered trend intelligence and forecasting
4. **📈 Dashboard** - Client-facing UI for insights and reports

## 🔧 **Features**

### **Bot Engine**
- ✅ **Human-like Behavior** - Jittery mouse movements, natural scrolling
- ✅ **Anti-Detection** - Randomized browser fingerprints, proxy rotation
- ✅ **Multi-Platform** - Instagram feed/stories, TikTok videos
- ✅ **ICP Simulation** - Demographic-based personality profiles
- ✅ **Engagement Tracking** - Likes, follows, saves, view duration

### **Analytics**
- ✅ **Viral Content Detection** - Multi-factor virality scoring
- ✅ **Breakout Creator Identification** - Growth momentum analysis
- ✅ **Hashtag Trend Analysis** - Real-time trending detection
- ✅ **Anomaly Detection** - Statistical outlier identification
- ✅ **AI Forecasting** - Predictive trend modeling

### **Dashboard**
- ✅ **Real-time Metrics** - Live impression and engagement data
- ✅ **Interactive Charts** - Engagement timelines, platform distribution
- ✅ **Data Export** - CSV/JSON export for reporting
- ✅ **Bot Management** - Start/stop sessions, configure profiles

## 📊 **ICP Profiles**

Pre-built personas with realistic behavior patterns:

| Profile | Age | Interests | Behavior |
|---------|-----|-----------|----------|
| **Gen Z Tech Enthusiast** | 18-24 | AI, crypto, gaming | Fast scroll, high engagement |
| **Millennial Professional** | 28-38 | Productivity, career | Moderate scroll, selective engagement |
| **Fashion & Beauty Enthusiast** | 21-35 | Fashion, beauty, lifestyle | Moderate scroll, very high engagement |
| **Fitness & Health Focused** | 25-45 | Fitness, nutrition, wellness | Slow scroll, moderate engagement |
| **Parent & Family Oriented** | 30-45 | Parenting, education, family | Slow scroll, moderate engagement |

## 🛠️ **Configuration**

### **Environment Variables**
```env
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key

# Bot Configuration  
MAX_CONCURRENT_BOTS=5
BOT_TIMEOUT_MS=300000

# Proxy (Optional)
PROXY_ENDPOINT=http://proxy.provider.com:8000
PROXY_USERNAME=your_username
PROXY_PASSWORD=your_password

# Dashboard
DASHBOARD_PORT=3000
```

### **Bot Behavior**
```javascript
// Customize in bot-engine/icp-profile-generator.js
const behaviorPatterns = {
  scrollSpeed: 'moderate',           // fast, moderate, slow
  engagementRate: 'high',            // very_high, high, moderate, selective, low
  contentPreference: ['educational'], // content types to prefer
  activeHours: [9, 12, 17, 20]       // hours when bot is active
};
```

## 📈 **Analytics & Insights**

### **Viral Content Detection**
```javascript
// Multi-factor virality scoring
WaveScore = α·NormEngagement + β·GrowthRate + γ·SentimentMomentum + δ·AudienceDiversity

// Factors:
// - Engagement rate vs. baseline
// - Growth velocity (engagements/hour)
// - ICP engagement patterns
// - Content quality signals
```

### **Breakout Creator Analysis**
- **Growth momentum** - Acceleration in impressions/engagement
- **Engagement consistency** - Stable interaction patterns
- **Reach momentum** - ICP exposure and attention

### **Trend Intelligence**
- **Hashtag trending** - Real-time hashtag momentum tracking
- **Anomaly detection** - Statistical outlier identification
- **Forecasting** - Predictive trend modeling with confidence scores

## 🚀 **Usage**

### **Start Bot Session**
```bash
# Manual session
npm run bot:instagram

# Specific profile
node bot-engine/orchestrator.js --profile=gen_z_tech_enthusiast --platform=tiktok

# Dashboard control
# Visit http://localhost:3000 and use Bot Control panel
```

### **Analytics Processing**
```bash
# Run trend analysis
npm run analytics

# Generate reports
node analytics/trend-processor.js
```

### **Data Export**
```bash
# Export via API
curl "http://localhost:3000/api/export?format=csv&timeRange=24h&dataType=viral"

# Export via dashboard
# Use Export buttons in dashboard tables
```

## 🔍 **API Endpoints**

### **Analytics**
- `GET /api/trends?timeRange=24h` - Trend report
- `GET /api/viral-content?timeRange=24h` - Viral content
- `GET /api/breakout-creators?timeRange=7d` - Breakout creators
- `GET /api/hashtag-trends?timeRange=24h` - Hashtag trends
- `GET /api/anomalies?timeRange=24h` - Anomaly detection

### **Bot Management**
- `POST /api/bot/start` - Start bot session
- `GET /api/status` - System status
- `GET /api/icp-profiles` - Available ICP profiles

### **Data Export**
- `GET /api/export?format=csv&dataType=trends` - Export data

## 📊 **Database Schema**

### **Core Tables**
- `icp_profiles` - ICP demographic and behavior profiles
- `bot_sessions` - Bot session tracking and metrics
- `content_impressions` - Content exposure data
- `engagement_events` - User interaction events
- `trend_metrics` - Aggregated trend analytics

### **Analytics Tables**
- `creator_profiles` - Creator metadata and metrics
- `alerts` - Anomaly and trending alerts
- `forecasts` - Predictive trend data

## 🛡️ **Security & Anti-Detection**

### **Bot Protection**
- **Randomized fingerprints** - Browser, device, location spoofing
- **Human behavior simulation** - Natural mouse movements, scroll patterns
- **Proxy rotation** - Residential IP rotation support
- **Rate limiting** - Respect platform rate limits
- **Session management** - Realistic session durations

### **Data Security**
- **Environment variables** - Secure credential storage
- **Database encryption** - Supabase built-in encryption
- **API authentication** - Secure API endpoints
- **No credential logging** - Sensitive data protection

## 🧪 **Testing**

### **Run Tests**
```bash
# Full test suite
npm test

# Bot functionality
npm run test:bots

# Analytics
npm run test:analytics

# API endpoints
npm run test:api
```

### **Manual Testing**
```bash
# Test bot profile generation
node bot-engine/icp-profile-generator.js

# Test Instagram bot
node bot-engine/instagram-bot.js

# Test analytics processing
node analytics/trend-processor.js
```

## 🚀 **Deployment**

### **Production Setup**
```bash
# Environment
NODE_ENV=production

# Process management
npm install -g pm2
pm2 start ecosystem.config.js

# Database
# Run production migration scripts
```

### **Monitoring**
- **Logs** - Winston logging to files and console
- **Metrics** - Built-in performance monitoring
- **Alerts** - Automated anomaly detection
- **Health checks** - API health endpoints

## 📚 **Documentation**

### **Architecture**
- `docs/architecture.md` - System architecture overview
- `docs/bot-engine.md` - Bot engine documentation
- `docs/analytics.md` - Analytics engine guide
- `docs/api.md` - Complete API reference

### **Development**
- `docs/development.md` - Development setup guide
- `docs/contributing.md` - Contribution guidelines
- `docs/troubleshooting.md` - Common issues and solutions

## 🤝 **Commercial Value**

### **For Marketing Teams**
- **Competitor Intelligence** - See what your competitors are doing in your ICP's feed
- **Influencer Discovery** - Find breakout creators before they're mainstream
- **Ad Performance** - Test hooks and creative with real engagement data
- **Campaign Optimization** - Understand organic vs. paid performance
- **Trend Prediction** - Get ahead of viral content in your niche

### **ROI Metrics**
- **Engagement Prediction** - Forecast content performance before posting
- **Influencer ROI** - Data-driven creator partnership decisions
- **Ad Optimization** - Improve ad creative based on ICP behavior
- **Content Strategy** - Data-backed content planning
- **Competitive Advantage** - Early trend detection and response

## 🔮 **Roadmap**

### **Phase 2 Features**
- [ ] **YouTube Integration** - Long-form content analysis
- [ ] **LinkedIn Bots** - B2B professional content tracking
- [ ] **Twitter/X Integration** - Real-time conversation monitoring
- [ ] **Advanced AI Models** - GPT-4 integration for content analysis
- [ ] **Sentiment Analysis** - Advanced NLP for content sentiment

### **Phase 3 Enhancements**
- [ ] **Multi-tenant Dashboard** - Team collaboration features
- [ ] **Advanced Forecasting** - LSTM models for trend prediction
- [ ] **Real-time Alerts** - Slack/Discord integration
- [ ] **Custom ICP Builder** - Advanced profile customization
- [ ] **Competitive Analysis** - Brand vs. competitor insights

## 📞 **Support**

### **Issues & Bug Reports**
- Create issues in the project repository
- Include logs, screenshots, and reproduction steps
- Use issue templates for faster resolution

### **Feature Requests**
- Submit enhancement requests via issues
- Describe use case and expected behavior
- Community voting on feature priority

### **Community**
- Join our Discord for real-time support
- Follow development updates on Twitter
- Contribute to documentation and guides

---

## 🎉 **Getting Started**

Ready to see what your ideal customers are really engaging with? 

```bash
# Quick start
node scripts/setup.js
npm start
npm run dashboard

# Visit: http://localhost:3000
```

**ICPScope** - Because knowing what your customers see is the first step to reaching them effectively.

---

*© 2024 ICPScope. Advanced ICP Bot Intelligence Platform.*