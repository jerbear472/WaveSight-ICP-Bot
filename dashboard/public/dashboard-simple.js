/**
 * Simplified WaveSight Dashboard
 * Connects to the working bot system from verify-bot-system.html
 */

// Global state
let socket = null;
let activeBots = {
  instagram: {
    status: 'idle',
    sessionId: null,
    startTime: null,
    contentViewed: 0,
    engagements: 0,
    trendsFound: 0,
    currentActivity: 'Waiting for command'
  },
  tiktok: {
    status: 'idle',
    sessionId: null,
    startTime: null,
    videosViewed: 0,
    engagements: 0,
    viralFound: 0,
    currentActivity: 'Waiting for command'
  }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  console.log('Initializing simplified dashboard...');
  
  // Connect to backend
  initializeSocket();
  
  // Set up button handlers
  setupButtonHandlers();
  
  // Start status updates
  setInterval(updateDashboard, 1000);
});

/**
 * Initialize WebSocket connection
 */
function initializeSocket() {
  // Determine backend URL based on environment
  const backendUrl = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001' 
    : 'https://wavesight-bot-backend.onrender.com';
  
  console.log('Connecting to:', backendUrl);
  
  // Create socket connection
  socket = io(backendUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5
  });
  
  // Connection handlers
  socket.on('connect', () => {
    console.log('✅ Connected to backend!');
    updateConnectionStatus(true);
  });
  
  socket.on('disconnect', () => {
    console.log('❌ Disconnected from backend');
    updateConnectionStatus(false);
  });
  
  // Bot event handlers
  socket.on('bot-started', (data) => {
    console.log('Bot started:', data);
    const platform = data.platform || 'instagram';
    activeBots[platform].status = 'running';
    activeBots[platform].sessionId = data.sessionId;
    activeBots[platform].startTime = Date.now();
    activeBots[platform].currentActivity = 'Starting bot...';
    updateBotCard(platform);
  });
  
  socket.on('bot-status', (data) => {
    console.log('Bot status:', data);
    const platform = data.platform || 'instagram';
    
    // Update activity based on status
    const statusMessages = {
      'navigating': 'Opening ' + platform,
      'logging_in': 'Logging in...',
      'logged_in': 'Successfully logged in',
      'feed_loaded': 'Feed loaded',
      'scrolling': 'Scrolling through feed',
      'stopped': 'Bot stopped',
      'error': 'Error: ' + (data.message || 'Unknown error')
    };
    
    activeBots[platform].currentActivity = statusMessages[data.status] || data.message || data.status;
    
    if (data.status === 'stopped' || data.status === 'error') {
      activeBots[platform].status = data.status === 'error' ? 'error' : 'idle';
      if (data.status === 'stopped') {
        activeBots[platform].sessionId = null;
      }
    }
    
    updateBotCard(platform);
  });
  
  socket.on('content-discovered', (data) => {
    console.log('Content discovered:', data);
    const platform = data.content?.platform || 'instagram';
    
    if (platform === 'instagram') {
      activeBots.instagram.contentViewed++;
      activeBots.instagram.currentActivity = `Viewing post from @${data.content.creator}`;
      
      // Add to activity feed
      addActivityFeedItem({
        type: 'content',
        platform: 'instagram',
        message: `📸 Found post from @${data.content.creator} - ${data.content.likes} likes`,
        details: data.content.caption ? data.content.caption.substring(0, 100) + '...' : 'No caption'
      });
    } else if (platform === 'tiktok') {
      activeBots.tiktok.videosViewed++;
      activeBots.tiktok.currentActivity = `Watching video from @${data.content.creator}`;
      
      addActivityFeedItem({
        type: 'content',
        platform: 'tiktok',
        message: `🎵 Found video from @${data.content.creator} - ${data.content.likes} likes`,
        details: data.content.caption ? data.content.caption.substring(0, 100) + '...' : 'No caption'
      });
    }
    
    updateBotCard(platform);
  });
  
  socket.on('bot-engagement', (data) => {
    console.log('Bot engagement:', data);
    const platform = data.platform || 'instagram';
    activeBots[platform].engagements++;
    
    addActivityFeedItem({
      type: 'engagement',
      platform: platform,
      message: `💟 Bot ${data.engagement.engagement_type} content`,
      details: `Engaged with @${data.engagement.creator_username}`
    });
    
    updateBotCard(platform);
  });
  
  socket.on('bot-error', (error) => {
    console.error('Bot error:', error);
    const platform = error.platform || 'instagram';
    activeBots[platform].status = 'error';
    activeBots[platform].currentActivity = error.message || 'Unknown error';
    updateBotCard(platform);
    
    addActivityFeedItem({
      type: 'error',
      platform: platform,
      message: `❌ Bot error: ${error.message}`,
      details: error.error || ''
    });
  });
  
  socket.on('session-complete', (data) => {
    console.log('Session complete:', data);
    const platform = data.platform || 'instagram';
    activeBots[platform].status = 'idle';
    activeBots[platform].currentActivity = 'Session completed';
    activeBots[platform].sessionId = null;
    updateBotCard(platform);
    
    addActivityFeedItem({
      type: 'success',
      platform: platform,
      message: `✅ Bot session completed - ${data.itemsViewed || 0} items viewed`,
      details: `Duration: ${Math.round((data.duration || 0) / 1000)}s`
    });
  });
}

/**
 * Set up button click handlers
 */
function setupButtonHandlers() {
  // Instagram buttons
  const instagramStart = document.querySelector('.instagram-bot .start-btn');
  const instagramStop = document.querySelector('.instagram-bot .stop-btn');
  
  if (instagramStart) {
    instagramStart.addEventListener('click', () => startBot('instagram'));
  }
  
  if (instagramStop) {
    instagramStop.addEventListener('click', () => stopBot('instagram'));
  }
  
  // TikTok buttons
  const tiktokStart = document.querySelector('.tiktok-bot .start-btn');
  const tiktokStop = document.querySelector('.tiktok-bot .stop-btn');
  
  if (tiktokStart) {
    tiktokStart.addEventListener('click', () => startBot('tiktok'));
  }
  
  if (tiktokStop) {
    tiktokStop.addEventListener('click', () => stopBot('tiktok'));
  }
}

/**
 * Start a bot
 */
function startBot(platform) {
  if (!socket || !socket.connected) {
    alert('Backend not connected. Please refresh and try again.');
    return;
  }
  
  console.log(`Starting ${platform} bot...`);
  
  // Emit start event
  socket.emit('start-bot', {
    platform: platform,
    profileType: 'gen-z-tech-enthusiast', // Default profile
    duration: 300000, // 5 minutes
    browser: 'chrome' // Default browser
  });
  
  // Update UI immediately
  activeBots[platform].status = 'starting';
  activeBots[platform].currentActivity = 'Starting bot...';
  updateBotCard(platform);
}

/**
 * Stop a bot
 */
function stopBot(platform) {
  if (!socket || !socket.connected) {
    alert('Backend not connected.');
    return;
  }
  
  const sessionId = activeBots[platform].sessionId;
  if (!sessionId) {
    console.warn('No active session to stop');
    return;
  }
  
  console.log(`Stopping ${platform} bot...`);
  
  // Emit stop event
  socket.emit('stop-bot', { 
    sessionId: sessionId,
    platform: platform 
  });
  
  // Update UI
  activeBots[platform].currentActivity = 'Stopping...';
  updateBotCard(platform);
}

/**
 * Update connection status display
 */
function updateConnectionStatus(connected) {
  const statusElement = document.querySelector('.connection-status');
  const statusText = document.querySelector('.status-text');
  const statusIndicator = document.querySelector('.status-indicator');
  
  if (statusText) {
    statusText.textContent = connected ? 'Backend Connected' : 'Backend not connected';
  }
  
  if (statusIndicator) {
    statusIndicator.className = 'status-indicator ' + (connected ? 'connected' : 'disconnected');
  }
  
  // Enable/disable all start buttons based on connection
  document.querySelectorAll('.start-btn').forEach(btn => {
    btn.disabled = !connected;
  });
}

/**
 * Update bot card display
 */
function updateBotCard(platform) {
  const bot = activeBots[platform];
  const card = document.querySelector(`.${platform}-bot`);
  if (!card) return;
  
  // Update status indicator
  const statusElement = card.querySelector('.bot-status');
  if (statusElement) {
    statusElement.className = 'bot-status ' + bot.status;
    statusElement.textContent = bot.status.charAt(0).toUpperCase() + bot.status.slice(1);
  }
  
  // Update session time
  const timeElement = card.querySelector('.session-time');
  if (timeElement && bot.startTime) {
    const elapsed = Math.floor((Date.now() - bot.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    timeElement.textContent = `${minutes}:${seconds}`;
  } else if (timeElement) {
    timeElement.textContent = '00:00:00';
  }
  
  // Update metrics
  if (platform === 'instagram') {
    updateMetric(card, '.content-viewed', bot.contentViewed);
    updateMetric(card, '.engagements', bot.engagements);
    updateMetric(card, '.trends-found', bot.trendsFound);
  } else {
    updateMetric(card, '.videos-viewed', bot.videosViewed);
    updateMetric(card, '.engagements', bot.engagements);
    updateMetric(card, '.viral-found', bot.viralFound);
  }
  
  // Update activity
  const activityElement = card.querySelector('.current-activity');
  if (activityElement) {
    activityElement.textContent = bot.currentActivity;
  }
  
  // Update buttons
  const startBtn = card.querySelector('.start-btn');
  const stopBtn = card.querySelector('.stop-btn');
  
  if (startBtn && stopBtn) {
    if (bot.status === 'running' || bot.status === 'starting') {
      startBtn.disabled = true;
      stopBtn.disabled = false;
    } else {
      startBtn.disabled = !socket?.connected;
      stopBtn.disabled = true;
    }
  }
}

/**
 * Update a metric display
 */
function updateMetric(card, selector, value) {
  const element = card.querySelector(selector);
  if (element) {
    element.textContent = value.toString();
  }
}

/**
 * Add item to activity feed
 */
function addActivityFeedItem(item) {
  const feed = document.querySelector('.activity-feed-items');
  if (!feed) return;
  
  const feedItem = document.createElement('div');
  feedItem.className = `feed-item ${item.type}`;
  
  const time = new Date().toLocaleTimeString();
  
  feedItem.innerHTML = `
    <div class="feed-time">${time}</div>
    <div class="feed-icon">${getActivityIcon(item.type, item.platform)}</div>
    <div class="feed-content">
      <div class="feed-message">${item.message}</div>
      ${item.details ? `<div class="feed-details">${item.details}</div>` : ''}
    </div>
  `;
  
  // Add to top of feed
  feed.insertBefore(feedItem, feed.firstChild);
  
  // Keep only last 50 items
  while (feed.children.length > 50) {
    feed.removeChild(feed.lastChild);
  }
}

/**
 * Get icon for activity type
 */
function getActivityIcon(type, platform) {
  const icons = {
    content: platform === 'instagram' ? '📸' : '🎵',
    engagement: '💟',
    error: '❌',
    success: '✅',
    trending: '🔥'
  };
  return icons[type] || '📱';
}

/**
 * Update dashboard every second
 */
function updateDashboard() {
  // Update all bot cards
  updateBotCard('instagram');
  updateBotCard('tiktok');
}

// Export for use in HTML
window.dashboardSimple = {
  startBot,
  stopBot,
  activeBots
};