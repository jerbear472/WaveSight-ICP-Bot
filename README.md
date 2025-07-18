# WaveSite 1.1 🏄

WaveSite is an advanced social media intelligence platform that uses AI-powered bots to surf Instagram and TikTok, collecting valuable engagement data and trends. The platform features a beautiful real-time dashboard with animated data flows, comprehensive metrics tracking, and seamless Supabase integration.

## 🌊 Features

### Core Capabilities
- **Multi-Platform Support**: Instagram and TikTok bot automation
- **Real-Time Analytics**: Live metrics dashboard with animated visualizations
- **Smart Data Collection**: Captures posts, creators, hashtags, engagement metrics
- **ICP Profiles**: 8 different ideal customer profiles for targeted browsing
- **Supabase Integration**: Automatic data storage and trend analysis
- **Visual Content Analysis**: Optional AI-powered content extraction using GPT-4 Vision

### Dashboard Features
- **Live Surf Metrics**: Wave count, surf velocity, content quality scores
- **Animated Data Flow**: Visual representation of data moving from social platforms to database
- **Real-Time Stream**: Live feed of discovered content with creator info and metrics
- **Session Management**: Start/stop controls with countdown timer
- **Activity Logging**: Comprehensive logs of all bot activities

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Supabase account (for data storage)
- Instagram/TikTok accounts for bot access

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/WaveSite_1.1.git
cd WaveSite_1.1
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file:
```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Instagram Credentials
INSTAGRAM_USERNAME=your_instagram_username
INSTAGRAM_PASSWORD=your_instagram_password

# TikTok Credentials (optional)
TIKTOK_USERNAME=your_tiktok_username
TIKTOK_PASSWORD=your_tiktok_password

# Optional: OpenAI API for visual content analysis
OPENAI_API_KEY=your_openai_api_key
```

5. Start the server:
```bash
npm start
```

6. Open the dashboard:
```
http://localhost:3000/surf
```

## 📊 Database Setup

The project uses Supabase for data storage. Required tables:

- `bot_sessions` - Tracks bot surfing sessions
- `content_impressions` - Stores discovered content
- `creator_profiles` - Creator information and metrics
- `engagement_events` - User engagement actions
- `trend_metrics` - Hashtag and content trends
- `ICP_Profiles` - Ideal customer profile definitions

See `database/schema.sql` for complete table definitions.

## 🎯 ICP Profiles

Available browsing profiles:
- Gen Z Tech Enthusiast
- Finance Focused Millennial
- Health & Wellness Professional
- Creative Entrepreneur
- Parent & Family Oriented
- Fitness Enthusiast
- Fashion & Beauty Lover
- Gamer & Esports Fan

## 🔧 Advanced Configuration

### Visual Content Analyzer
To enable AI-powered content extraction when CSS selectors fail:

```javascript
// Set OPENAI_API_KEY in .env
// The bot will automatically use GPT-4 Vision for failed extractions
```

### Network Interceptor
For capturing Instagram's API responses directly:

```javascript
// Automatically enabled in bot-engine/network-interceptor.js
// Captures GraphQL and REST API responses
```

## 📁 Project Structure

```
WaveSite_1.1/
├── bot-engine/              # Core bot automation
│   ├── instagram-bot-simple.js
│   ├── tiktok-bot.js
│   ├── visual-content-analyzer.js
│   └── network-interceptor.js
├── dashboard/               # Dashboard backend
│   ├── backend/
│   │   ├── bots/           # Bot controllers
│   │   ├── services/       # Data services
│   │   └── config/         # Configuration
│   └── public/             # Frontend assets
├── unified-server.js        # Main server file
├── wavesite-verification.html # Surf control interface
└── package.json
```

## 🛠️ Development

### Running in Development Mode
```bash
npm run dev
```

### Testing Bot Connections
```bash
# Test page available at http://localhost:3000/test
```

### Debug Mode
Set `DEBUG=true` in `.env` to enable verbose logging and screenshot capture for failed extractions.

## 🚨 Important Notes

- **Rate Limiting**: Be respectful of platform limits. The bot includes human-like delays.
- **Account Safety**: Use dedicated accounts for automation, not personal accounts.
- **Data Privacy**: Ensure compliance with platform ToS and data protection regulations.
- **API Keys**: Keep your API keys secure and never commit them to version control.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [Playwright](https://playwright.dev/) for browser automation
- UI powered by [Socket.IO](https://socket.io/) for real-time updates
- Data stored in [Supabase](https://supabase.com/)
- Optional AI analysis by [OpenAI](https://openai.com/)

---

**Note**: This tool is for research and analytics purposes. Always respect platform terms of service and rate limits.