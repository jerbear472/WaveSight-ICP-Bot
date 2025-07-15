/**
 * ICPScope Dashboard JavaScript
 * Frontend logic for the dashboard interface
 */

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

    // Platform Distribution Chart
    const platformCtx = document.getElementById('platformChart').getContext('2d');
    this.charts.platform = new Chart(platformCtx, {
      type: 'doughnut',
      data: {
        labels: ['Instagram', 'TikTok'],
        datasets: [{
          data: [0, 0],
          backgroundColor: ['#e11d48', '#000000'],
          borderWidth: 0
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
      const response = await fetch(`/api/dashboard-data?timeRange=${this.currentTimeRange}`);
      const data = await response.json();
      
      this.updateOverviewCards(data.summary);
      this.updateCharts(data);
      this.updateTables(data);
      this.updateLastUpdated();
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      this.showNotification('Error loading dashboard data', 'error');
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
      }
    }, 30000); // Refresh every 30 seconds
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
  
  const startButton = document.querySelector('.start-bot-btn');
  const statusIndicator = document.querySelector('.status-indicator');
  const statusText = document.querySelector('.status-text');
  
  // Update UI
  startButton.disabled = true;
  startButton.textContent = 'Starting...';
  statusIndicator.style.background = '#f59e0b';
  statusText.textContent = 'Starting bot...';
  
  try {
    const response = await fetch('/api/bot/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        profileType,
        platform,
        duration
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      dashboard.showNotification('Bot session started successfully', 'success');
      statusText.textContent = 'Bot running...';
      
      // Reset after duration
      setTimeout(() => {
        statusIndicator.style.background = '#10b981';
        statusText.textContent = 'Ready';
        startButton.disabled = false;
        startButton.textContent = 'Start Bot Session';
      }, duration);
      
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Failed to start bot:', error);
    dashboard.showNotification('Failed to start bot: ' + error.message, 'error');
    
    // Reset UI
    statusIndicator.style.background = '#10b981';
    statusText.textContent = 'Ready';
    startButton.disabled = false;
    startButton.textContent = 'Start Bot Session';
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