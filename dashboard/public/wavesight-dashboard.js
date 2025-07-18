/**
 * WaveSight Dashboard - With Verification Page Functionality
 * Exact same functionality as ICP Bot System Verification
 */

// Global state
let socket = null;
let currentSession = null;
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
document.addEventListener('DOMContentLoaded', async function() {
  console.log('Initializing WaveSight dashboard...');
  addLog('Initializing WaveSight dashboard...', 'info');
  
  // First check if backend is reachable
  await checkBackendHealth();
  
  // Connect to backend
  initializeSocket();
  
  // Set up button handlers
  setupButtonHandlers();
  
  // Start status updates
  setInterval(updateDashboard, 1000);
  
  // Periodic health checks
  setInterval(checkBackendHealth, 30000);
});

/**
 * Add log entry (matching verification page)
 */
function addLog(message, type = 'info') {
  const log = document.getElementById('log');
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  
  const time = document.createElement('span');
  time.className = 'log-time';
  time.textContent = `[${new Date().toLocaleTimeString()}]`;
  
  const msg = document.createElement('span');
  msg.className = 'log-message';
  msg.textContent = message;
  
  entry.appendChild(time);
  entry.appendChild(msg);
  
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
}

/**
 * Check backend health
 */
async function checkBackendHealth() {
  // Use same origin for unified server
  const backendUrl = '';
    
  try {
    const response = await fetch(`${backendUrl}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log('Backend health check passed');
      return true;
    } else {
      console.error('Backend health check failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Backend not reachable:', error);
    updateConnectionStatus(false);
    return false;
  }
}

/**
 * Initialize WebSocket connection
 */
function initializeSocket() {
  // Connect to same origin (unified server)
  addLog('Connecting to backend...', 'info');
  
  // Create socket connection
  socket = io({
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 20000
  });
  
  // Connection handlers
  socket.on('connect', () => {
    console.log('✅ Connected to backend!');
    addLog('✅ Connected to backend!', 'success');
    updateConnectionStatus(true);
  });
  
  socket.on('disconnect', () => {
    console.log('❌ Disconnected from backend');
    addLog('❌ Disconnected from backend', 'error');
    updateConnectionStatus(false);
  });
  
  socket.on('connect_error', (error) => {
    console.error('Connection error:', error.message);
    updateConnectionStatus(false);
  });
  
  socket.on('error', (error) => {
    console.error('Socket error:', error);
    addLog(`Socket error: ${error}`, 'error');
  });
  
  // Bot event handlers (matching verification page)
  socket.on('bot-status', (data) => {
    addLog(`Bot Status: ${data.status} - ${data.message || ''}`, 'info');
    const platform = data.platform || 'instagram';
    
    // Enable stop button for any running status
    if (data.status === 'started' || data.status === 'running' || 
        data.status === 'scrolling' || data.status === 'logged_in' || 
        data.status === 'feed_loaded') {
      if (data.sessionId) {
        currentSession = data.sessionId;
        activeBots[platform].sessionId = data.sessionId;
      }
      document.getElementById('startBtn').disabled = true;
      document.getElementById('stopBtn').disabled = false;
      
      if (data.status === 'started') {
        addLog(`Session started: ${data.sessionId}`, 'success');
      }
    }
    
    if (data.status === 'stopped' || data.status === 'completed' || 
        data.status === 'stopping' || data.status === 'error') {
      currentSession = null;
      document.getElementById('startBtn').disabled = false;
      document.getElementById('stopBtn').disabled = true;
      addLog('Session ended', 'info');
    }
    
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
    } else if (data.status === 'started' || data.status === 'running') {
      activeBots[platform].status = 'running';
    }
    
    updateBotCard(platform);
  });
  
  socket.on('bot-started', (data) => {
    console.log('Bot started:', data);
    addLog(`Bot started with session: ${data.sessionId}`, 'success');
    currentSession = data.sessionId;
    const platform = data.platform || 'instagram';
    activeBots[platform].status = 'running';
    activeBots[platform].sessionId = data.sessionId;
    activeBots[platform].startTime = Date.now();
    activeBots[platform].currentActivity = 'Starting bot...';
    updateBotCard(platform);
    
    document.getElementById('startBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;
  });
  
  socket.on('content-discovered', (data) => {
    const content = data.content || data;
    const platform = content.platform || 'instagram';
    
    addLog(`📱 Content: ${content.creator || content.username || 'unknown'} - ${content.caption?.substring(0, 50)}...`, 'success');
    
    if (platform === 'instagram') {
      activeBots.instagram.contentViewed++;
      activeBots.instagram.currentActivity = `Viewing post from @${content.creator || 'unknown'}`;
    } else if (platform === 'tiktok') {
      activeBots.tiktok.videosViewed++;
      activeBots.tiktok.currentActivity = `Watching video from @${content.creator || 'unknown'}`;
    }
    
    updateBotCard(platform);
  });
  
  socket.on('bot-engagement', (data) => {
    console.log('Bot engagement:', data);
    const platform = data.platform || 'instagram';
    activeBots[platform].engagements++;
    updateBotCard(platform);
  });
  
  socket.on('bot-stopped', (data) => {
    addLog(`Bot stopped`, 'info');
    currentSession = null;
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
  });
  
  socket.on('bot-error', (error) => {
    addLog(`Error: ${error.message || error.error || error}`, 'error');
    const platform = error.platform || 'instagram';
    activeBots[platform].status = 'error';
    activeBots[platform].currentActivity = error.message || 'Unknown error';
    updateBotCard(platform);
    
    // Reset buttons on error
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
    currentSession = null;
  });
  
  socket.on('session-complete', (data) => {
    const platform = data.platform || 'instagram';
    const duration = Math.round((data.duration || 0) / 1000);
    addLog(`Session complete! Items viewed: ${data.itemsViewed || 0}, Duration: ${duration}s`, 'success');
    
    currentSession = null;
    activeBots[platform].status = 'idle';
    activeBots[platform].currentActivity = 'Session completed';
    activeBots[platform].sessionId = null;
    updateBotCard(platform);
    
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
  });
}

/**
 * Set up button click handlers
 */
function setupButtonHandlers() {
  // Buttons are already set up with onclick in HTML
  // This function is here for consistency with verification page
}

/**
 * Start a bot (matching verification page)
 */
function startBot() {
  if (!socket || !socket.connected) {
    alert('Backend not connected. Please refresh and try again.');
    return;
  }
  
  const platform = document.getElementById('platform').value;
  const profileType = document.getElementById('profileType').value;
  const duration = parseInt(document.getElementById('duration').value);
  const browser = document.getElementById('browser').value;
  
  addLog(`Starting ${platform} bot for ${profileType} (${duration}s) in ${browser}...`, 'info');
  
  socket.emit('start-bot', {
    platform,
    profileType,
    duration: duration * 1000,  // Convert seconds to milliseconds
    browser
  });
  
  // Update UI immediately
  activeBots[platform].status = 'starting';
  activeBots[platform].currentActivity = 'Starting bot...';
  updateBotCard(platform);
}

/**
 * Stop a bot (matching verification page)
 */
function stopBot() {
  if (currentSession) {
    addLog('Sending stop command...', 'warning');
    socket.emit('stop-bot', { sessionId: currentSession });
  }
}

/**
 * Update connection status display
 */
function updateConnectionStatus(connected) {
  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  
  if (statusText) {
    statusText.textContent = connected ? 'Backend Connected' : 'Backend Disconnected';
  }
  
  if (statusIndicator) {
    statusIndicator.className = 'status-indicator ' + (connected ? 'connected' : '');
  }
  
  // Enable/disable start button based on connection
  document.getElementById('startBtn').disabled = !connected;
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
    const hours = Math.floor(elapsed / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    timeElement.textContent = `${hours}:${minutes}:${seconds}`;
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
 * Update dashboard every second
 */
function updateDashboard() {
  // Update all bot cards
  updateBotCard('instagram');
  updateBotCard('tiktok');
}

// Export for use in HTML
window.startBot = startBot;
window.stopBot = stopBot;