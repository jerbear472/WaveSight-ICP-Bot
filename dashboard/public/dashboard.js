/**
 * ICPScope Dashboard JavaScript
 * Frontend logic for the dashboard interface
 */

// Global variable to track current bot session
let currentBotSession = null;

class ICPDashboard {
  constructor() {
    this.currentTimeRange = '24h';
    this.refreshInterval = null;
    this.charts = {};
    this.isLoading = false;
    
    this.init();
  }

  /**
   * Initialize dashboard
   */
  init() {
    this.setupEventListeners();
    this.initializeCharts();
    this.loadData();
    this.startAutoRefresh();
    this.checkBackendConnection();
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Time range selector
    document.querySelectorAll('.time-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.changeTimeRange(e.target.dataset.range);
      });
    });

    // Chart controls
    document.querySelectorAll('.chart-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchChartView(e.target.dataset.chart);
      });
    });

    // Refresh button
    document.querySelector('.refresh-btn').addEventListener('click', () => {
      this.refreshData();
    });

    // Auto-refresh on visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.refreshData();
      }
    });
  }

  /**
   * Initialize charts
   */
  initializeCharts() {
    // Engagement Timeline Chart
    const engagementCtx = document.getElementById('engagementChart').getContext('2d');
    this.charts.engagement = new Chart(engagementCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Impressions',
          data: [],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: '#e2e8f0'
            }
          },
          x: {
            grid: {
              color: '#e2e8f0'
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });

    // Platform Distribution Chart (Pie Chart)
    const platformCtx = document.getElementById('platformChart').getContext('2d');
    this.charts.platform = new Chart(platformCtx, {
      type: 'pie',
      data: {
        labels: ['TikTok', 'Instagram'],
        datasets: [{
          data: [68, 32],
          backgroundColor: ['#000000', '#E4405F'],
          borderWidth: 0,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }

  /**
   * Change time range
   */
  changeTimeRange(range) {
    // Update active button
    document.querySelectorAll('.time-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-range="${range}"]`).classList.add('active');
    
    this.currentTimeRange = range;
    this.loadData();
  }

  /**
   * Switch chart view
   */
  switchChartView(chartType) {
    document.querySelectorAll('.chart-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-chart="${chartType}"]`).classList.add('active');
    
    // Update chart data based on type
    this.updateEngagementChart(chartType);
  }

  /**
   * Load all dashboard data
   */
  async loadData() {
    if (this.isLoading) return;
    
    this.showLoading();
    
    try {
      // Try to fetch from API first
      const response = await fetch(`/api/dashboard-data?timeRange=${this.currentTimeRange}`);
      
      if (!response.ok) {
        throw new Error('API not available');
      }
      
      const data = await response.json();
      
      this.updateOverviewCards(data.summary);
      this.updateCharts(data);
      this.updateTables(data);
      this.updateLastUpdated();
      
    } catch (error) {
      // Use mock data when API is not available
      console.log('Using mock data - API not available');
      
      const mockData = this.generateMockData();
      this.updateOverviewCards(mockData.summary);
      this.updateCharts(mockData);
      this.updateTables(mockData);
      this.updateLastUpdated();
      
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Update overview cards
   */
  updateOverviewCards(summary) {
    document.getElementById('totalImpressions').textContent = 
      this.formatNumber(summary.totalImpressions);
    document.getElementById('totalEngagements').textContent = 
      this.formatNumber(summary.totalEngagements);
    document.getElementById('viralContent').textContent = 
      this.formatNumber(summary.viralContentCount);
    document.getElementById('breakoutCreators').textContent = 
      this.formatNumber(summary.breakoutCreatorsCount);

    // Update change indicators (would need historical data)
    document.getElementById('impressionsChange').textContent = 'No change data';
    document.getElementById('engagementsChange').textContent = 'No change data';
    document.getElementById('viralChange').textContent = 'No change data';
    document.getElementById('creatorsChange').textContent = 'No change data';
  }

  /**
   * Update charts
   */
  updateCharts(data) {
    this.updateEngagementChart('impressions', data.trends);
    this.updatePlatformChart(data.trends);
  }

  /**
   * Update engagement chart
   */
  updateEngagementChart(type, trendsData) {
    const chart = this.charts.engagement;
    
    // Generate time labels based on time range
    const labels = this.generateTimeLabels(this.currentTimeRange);
    const data = this.generateChartData(type, trendsData, labels);
    
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.data.datasets[0].label = type === 'impressions' ? 'Impressions' : 'Engagements';
    chart.update();
  }

  /**
   * Update platform chart
   */
  updatePlatformChart(trendsData) {
    const chart = this.charts.platform;
    
    const platforms = trendsData.platforms || {};
    const instagramData = platforms.instagram || { impressions: 0 };
    const tiktokData = platforms.tiktok || { impressions: 0 };
    
    chart.data.datasets[0].data = [
      instagramData.impressions,
      tiktokData.impressions
    ];
    chart.update();
  }

  /**
   * Update tables
   */
  updateTables(data) {
    this.updateViralTable(data.viralContent);
    this.updateCreatorsTable(data.breakoutCreators);
    this.updateHashtagsTable(data.hashtags);
    this.updateAnomaliesTable(data.anomalies);
  }

  /**
   * Update viral content table
   */
  updateViralTable(viralContent) {
    const tbody = document.getElementById('viralTableBody');
    
    if (!viralContent || !viralContent.organic || viralContent.organic.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="loading">No viral content found</td></tr>';
      return;
    }
    
    tbody.innerHTML = viralContent.organic.slice(0, 10).map(content => `
      <tr>
        <td class="truncate" style="max-width: 200px;" title="${content.caption || 'No caption'}">
          ${content.caption ? content.caption.substring(0, 50) + '...' : 'No caption'}
        </td>
        <td>@${content.creator}</td>
        <td>
          <span class="platform-badge ${content.platform}">${content.platform}</span>
        </td>
        <td class="font-semibold">${content.viralityScore}</td>
        <td>${((content.metrics.engagementRate || 0) * 100).toFixed(1)}%</td>
        <td>${this.formatTimeAgo(content.timestamp)}</td>
      </tr>
    `).join('');
  }

  /**
   * Update creators table
   */
  updateCreatorsTable(breakoutCreators) {
    const tbody = document.getElementById('creatorsTableBody');
    
    if (!breakoutCreators || breakoutCreators.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="loading">No breakout creators found</td></tr>';
      return;
    }
    
    tbody.innerHTML = breakoutCreators.map(creator => `
      <tr>
        <td class="font-semibold">@${creator.creator}</td>
        <td>
          <span class="platform-badge ${creator.platform}">${creator.platform}</span>
        </td>
        <td class="trending-up">${(creator.growthRate * 100).toFixed(1)}%</td>
        <td>${(creator.engagementRate * 100).toFixed(1)}%</td>
        <td>
          <div class="momentum-bar">
            <div class="momentum-fill" style="width: ${creator.growthMomentum * 100}%"></div>
          </div>
        </td>
        <td>
          <span class="status-badge ${creator.isBreakout ? 'breakout' : 'normal'}">
            ${creator.isBreakout ? 'Breakout' : 'Normal'}
          </span>
        </td>
      </tr>
    `).join('');
  }

  /**
   * Update hashtags table
   */
  updateHashtagsTable(hashtags) {
    const tbody = document.getElementById('hashtagsTableBody');
    
    if (!hashtags || hashtags.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="loading">No trending hashtags found</td></tr>';
      return;
    }
    
    tbody.innerHTML = hashtags.map(hashtag => `
      <tr>
        <td class="font-semibold text-primary">${hashtag.hashtag}</td>
        <td>${this.formatNumber(hashtag.totalMentions)}</td>
        <td>${this.formatNumber(hashtag.totalEngagements)}</td>
        <td>
          <span class="trend-score">${hashtag.trendingScore.toFixed(1)}</span>
        </td>
        <td class="${hashtag.momentum > 0 ? 'trending-up' : 'trending-down'}">
          ${hashtag.momentum > 0 ? '↗' : '↘'} ${Math.abs(hashtag.momentum * 100).toFixed(1)}%
        </td>
      </tr>
    `).join('');
  }

  /**
   * Update anomalies table
   */
  updateAnomaliesTable(anomalies) {
    const tbody = document.getElementById('anomaliesTableBody');
    
    if (!anomalies || anomalies.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="loading">No anomalies detected</td></tr>';
      return;
    }
    
    tbody.innerHTML = anomalies.map(anomaly => `
      <tr>
        <td class="font-semibold">${anomaly.type.replace('_', ' ')}</td>
        <td>
          <span class="status-${anomaly.severity}">${anomaly.severity}</span>
        </td>
        <td>${anomaly.data.description}</td>
        <td>${this.formatTimeAgo(anomaly.timestamp)}</td>
      </tr>
    `).join('');
  }

  /**
   * Generate time labels for charts
   */
  generateTimeLabels(timeRange) {
    const now = new Date();
    const labels = [];
    
    switch (timeRange) {
      case '1h':
        for (let i = 11; i >= 0; i--) {
          const time = new Date(now.getTime() - i * 5 * 60 * 1000);
          labels.push(time.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          }));
        }
        break;
      case '6h':
        for (let i = 11; i >= 0; i--) {
          const time = new Date(now.getTime() - i * 30 * 60 * 1000);
          labels.push(time.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          }));
        }
        break;
      case '24h':
        for (let i = 11; i >= 0; i--) {
          const time = new Date(now.getTime() - i * 2 * 60 * 60 * 1000);
          labels.push(time.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          }));
        }
        break;
      case '7d':
        for (let i = 6; i >= 0; i--) {
          const time = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          labels.push(time.toLocaleDateString([], { 
            month: 'short', 
            day: 'numeric' 
          }));
        }
        break;
    }
    
    return labels;
  }

  /**
   * Generate chart data
   */
  generateChartData(type, trendsData, labels) {
    // Generate sample data for now (would use real data in production)
    return labels.map(() => Math.floor(Math.random() * 1000) + 100);
  }

  /**
   * Refresh data
   */
  async refreshData() {
    await this.loadData();
    this.showNotification('Data refreshed successfully', 'success');
  }

  /**
   * Start auto-refresh
   */
  startAutoRefresh() {
    this.refreshInterval = setInterval(() => {
      if (!document.hidden) {
        this.loadData();
        this.checkBackendConnection();
      }
    }, 30000); // Refresh every 30 seconds
  }

  /**
   * Check backend connection status
   */
  async checkBackendConnection() {
    const statusElement = document.getElementById('botStatus');
    const statusText = statusElement?.querySelector('.status-text');
    const statusIndicator = statusElement?.querySelector('.status-indicator');
    
    if (!statusElement || !statusText || !statusIndicator) return;

    try {
      // Test if backend is running
      const response = await fetch('http://localhost:3001/api/health', {
        method: 'GET',
        timeout: 3000
      });
      
      if (response.ok) {
        statusText.textContent = 'Backend Connected';
        statusIndicator.classList.remove('offline');
        statusIndicator.classList.add('online');
      } else {
        throw new Error('Backend not responding');
      }
    } catch (error) {
      statusText.textContent = 'Backend Not Connected';
      statusIndicator.classList.remove('online');
      statusIndicator.classList.add('offline');
    }
  }

  /**
   * Show loading overlay
   */
  showLoading() {
    this.isLoading = true;
    document.getElementById('loadingOverlay').classList.add('show');
  }

  /**
   * Hide loading overlay
   */
  hideLoading() {
    this.isLoading = false;
    document.getElementById('loadingOverlay').classList.remove('show');
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-message">
          <div class="notification-text">${message}</div>
        </div>
        <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    
    container.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }

  /**
   * Update last updated timestamp
   */
  updateLastUpdated() {
    document.getElementById('lastUpdated').textContent = 
      new Date().toLocaleString();
  }

  /**
   * Format number with K/M suffixes
   */
  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  /**
   * Format time ago
   */
  formatTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}m ago`;
    } else if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    } else {
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    }
  }

  /**
   * Generate mock data for development/demo
   */
  generateMockData() {
    const now = new Date();
    
    return {
      summary: {
        totalImpressions: 12547,
        totalEngagements: 3892,
        viralContentCount: 23,
        breakoutCreatorsCount: 15
      },
      trends: {
        platforms: {
          instagram: { impressions: 4000 },
          tiktok: { impressions: 8547 }
        }
      },
      viralContent: {
        organic: [
          {
            caption: "This mindfulness technique changed my life! Try the 5-4-3-2-1 grounding method",
            creator: "mindful.maven",
            platform: "instagram",
            viralityScore: 985,
            metrics: { engagementRate: 0.124 },
            timestamp: new Date(now - 2 * 60 * 60 * 1000).toISOString()
          },
          {
            caption: "POV: You discover the secret to instant productivity boosts",
            creator: "techlife.hacks",
            platform: "tiktok",
            viralityScore: 1243,
            metrics: { engagementRate: 0.156 },
            timestamp: new Date(now - 1 * 60 * 60 * 1000).toISOString()
          }
        ]
      },
      breakoutCreators: [
        {
          creator: "zen.entrepreneur",
          platform: "instagram",
          growthRate: 0.234,
          engagementRate: 0.089,
          growthMomentum: 0.78,
          isBreakout: true
        },
        {
          creator: "crypto.insights",
          platform: "tiktok",
          growthRate: 0.156,
          engagementRate: 0.092,
          growthMomentum: 0.65,
          isBreakout: true
        }
      ],
      hashtags: [
        {
          hashtag: "#mindfulness",
          totalMentions: 4532,
          totalEngagements: 89234,
          trendingScore: 92.3,
          momentum: 0.123
        },
        {
          hashtag: "#productivity",
          totalMentions: 3211,
          totalEngagements: 67892,
          trendingScore: 87.5,
          momentum: -0.045
        }
      ],
      anomalies: []
    };
  }
}

/**
 * Global functions for HTML event handlers
 */
function refreshData() {
  dashboard.refreshData();
}

async function startBot() {
  const profileType = document.getElementById('profileType').value;
  const platform = document.getElementById('platform').value;
  const duration = parseInt(document.getElementById('duration').value);
  
  console.log('Starting bot with:', { platform, profileType, duration });
  
  const startButton = document.querySelector('.start-bot-btn');
  const statusIndicator = document.querySelector('.status-indicator');
  const statusText = document.querySelector('.status-text');
  
  // Update UI
  startButton.disabled = true;
  startButton.textContent = 'Starting...';
  statusIndicator.style.background = '#f59e0b';
  statusText.textContent = 'Starting bot...';
  
  try {
    // First check if backend is available
    const healthCheck = await fetch('http://localhost:3001/api/health', {
      method: 'GET',
      timeout: 3000
    });
    
    if (!healthCheck.ok) {
      throw new Error('Backend server not running. Start with: cd backend && npm run dev');
    }
    
    // Check if bot client is available
    if (window.botClient) {
      // Connect to backend
      window.botClient.connect();
      
      // Set up callbacks
      window.botClient.onContentDiscovered((data) => {
        console.log('Content discovered:', data);
        dashboard.showNotification(`Bot viewed: ${data.content.creator}`, 'info');
      });
      
      window.botClient.onSessionComplete((data) => {
        console.log('Session complete:', data);
        dashboard.showNotification('Bot session completed', 'success');
        
        // Reset UI
        currentBotSession = null;
        statusIndicator.style.background = '#10b981';
        statusText.textContent = 'Backend Connected';
        startButton.disabled = false;
        startButton.textContent = 'Start Bot Session';
        
        // Show start button, hide stop button
        const stopButton = document.querySelector('.stop-bot-btn');
        startButton.style.display = 'block';
        stopButton.style.display = 'none';
      });
      
      window.botClient.onError((error) => {
        console.error('Bot error:', error);
        dashboard.showNotification('Bot error: ' + error, 'error');
        
        // Reset UI
        statusIndicator.style.background = '#f59e0b';
        statusText.textContent = 'Bot Error';
        startButton.disabled = false;
        startButton.textContent = 'Start Bot Session';
      });
      
      // Start the bot
      const result = await window.botClient.startBot(platform, profileType, duration);
      console.log('Bot started:', result);
      
      // Save session ID and update UI
      currentBotSession = result.sessionId;
      console.log('Bot started with session ID:', currentBotSession);
      
      dashboard.showNotification(`🔴 ${platform.toUpperCase()} Bot session started - Check the Chrome browser window!`, 'success');
      statusText.textContent = `${platform} Bot Running`;
      statusIndicator.style.background = '#10b981';
      
      // Show stop button, hide start button
      const stopButton = document.querySelector('.stop-bot-btn');
      startButton.style.display = 'none';
      stopButton.style.display = 'block';
      startButton.disabled = false; // Re-enable for next time
      
    } else {
      throw new Error('Bot client not loaded. Include bot-client.js script.');
    }
    
  } catch (error) {
    console.error('Failed to start bot:', error);
    dashboard.showNotification('Failed to start bot: ' + error.message, 'error');
    
    // Reset UI with error status
    statusIndicator.style.background = '#ef4444';
    statusText.textContent = 'Backend Not Connected';
    startButton.disabled = false;
    startButton.textContent = 'Start Bot Session';
    
    // Make sure stop button is hidden on error
    const stopButton = document.querySelector('.stop-bot-btn');
    if (stopButton) {
      stopButton.style.display = 'none';
    }
  }
}

async function stopBot() {
  console.log('Stopping bot session:', currentBotSession);
  
  const startButton = document.querySelector('.start-bot-btn');
  const stopButton = document.querySelector('.stop-bot-btn');
  const statusIndicator = document.querySelector('.status-indicator');
  const statusText = document.querySelector('.status-text');
  
  try {
    if (!currentBotSession) {
      console.error('No active session to stop');
      dashboard.showNotification('No active bot session to stop', 'error');
      return;
    }
    
    // Disable stop button while stopping
    stopButton.disabled = true;
    stopButton.textContent = 'Stopping...';
    
    // Stop the bot
    if (window.botClient) {
      await window.botClient.stopBot(currentBotSession);
      dashboard.showNotification('Bot session stopped', 'success');
    }
    
    // Reset UI
    currentBotSession = null;
    statusIndicator.style.background = '#64748b';
    statusText.textContent = 'Bot Stopped';
    startButton.style.display = 'block';
    stopButton.style.display = 'none';
    stopButton.disabled = false;
    stopButton.textContent = 'Stop Bot Session';
    
  } catch (error) {
    console.error('Failed to stop bot:', error);
    dashboard.showNotification('Failed to stop bot: ' + error.message, 'error');
    
    // Reset UI anyway
    stopButton.disabled = false;
    stopButton.textContent = 'Stop Bot Session';
  }
}

async function exportData(type) {
  const timeRange = dashboard.currentTimeRange;
  const url = `/api/export?format=csv&timeRange=${timeRange}&dataType=${type}`;
  
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `${type}-${timeRange}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);
    
    dashboard.showNotification('Data exported successfully', 'success');
  } catch (error) {
    console.error('Export failed:', error);
    dashboard.showNotification('Export failed: ' + error.message, 'error');
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.dashboard = new ICPDashboard();
});