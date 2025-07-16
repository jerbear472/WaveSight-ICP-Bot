/**
 * Marketing Insights Dashboard JavaScript
 * Real-time trend analysis and marketing intelligence
 */

class MarketingInsights {
  constructor() {
    this.charts = {};
    this.currentTrends = [];
    this.trendData = {};
    this.timeframe = '7d';
    this.platform = 'all';
    
    this.init();
  }

  async init() {
    await this.fetchTrendData();
    this.renderTrendCards();
    this.initializeTrendCharts();
    this.initializeDemographicsCharts();
    this.setupEventListeners();
    this.startRealTimeUpdates();
  }

  /**
   * Fetch trend data from stored bot data
   */
  async fetchTrendData() {
    try {
      // Get stored bot data
      const storedData = localStorage.getItem('botSessionData');
      const dateRange = this.getDateRange(this.timeframe);
      
      if (storedData) {
        const sessions = JSON.parse(storedData);
        const allContent = [];
        
        // Extract all content from sessions
        sessions.forEach(session => {
          if (session.content && Array.isArray(session.content)) {
            session.content.forEach(item => {
              if (this.platform === 'all' || item.platform === this.platform) {
                allContent.push(item);
              }
            });
          }
        });
        
        // Analyze trends from content
        this.currentTrends = this.analyzeTrends(allContent);
        this.updateTrendData();
      } else {
        // Use default data if no bot data available
        this.useDefaultTrends();
      }
    } catch (error) {
      console.error('Error fetching trend data:', error);
      this.useDefaultTrends();
    }
  }

  /**
   * Analyze content for trends
   */
  analyzeTrends(content) {
    const trendMap = new Map();
    const hashtagMap = new Map();
    const keywordMap = new Map();
    
    // Process each content item
    content.forEach(item => {
      // Count hashtags
      if (item.hashtags) {
        item.hashtags.forEach(tag => {
          const key = tag.toLowerCase();
          if (!hashtagMap.has(key)) {
            hashtagMap.set(key, {
              name: tag,
              count: 0,
              engagement: 0,
              reach: 0,
              contents: []
            });
          }
          const trend = hashtagMap.get(key);
          trend.count++;
          trend.engagement += (item.likes || 0) + (item.comments || 0) * 2 + (item.shares || 0) * 3;
          trend.reach += item.views || 0;
          trend.contents.push(item);
        });
      }
      
      // Extract keywords from captions
      if (item.caption) {
        const words = item.caption.toLowerCase().split(/\s+/);
        const keywords = words.filter(word => 
          word.length > 4 && 
          !['with', 'this', 'that', 'from', 'have', 'been'].includes(word)
        );
        
        keywords.forEach(keyword => {
          if (!keywordMap.has(keyword)) {
            keywordMap.set(keyword, {
              name: keyword,
              count: 0,
              engagement: 0,
              reach: 0,
              contents: []
            });
          }
          const trend = keywordMap.get(keyword);
          trend.count++;
          trend.engagement += (item.likes || 0) + (item.comments || 0) * 2 + (item.shares || 0) * 3;
          trend.reach += item.views || 0;
          trend.contents.push(item);
        });
      }
    });
    
    // Combine hashtags and keywords
    const allTrends = [...hashtagMap.values(), ...keywordMap.values()];
    
    // Calculate scores and sort
    allTrends.forEach(trend => {
      trend.engagementRate = trend.reach > 0 ? (trend.engagement / trend.reach) * 100 : 0;
      trend.viralScore = this.calculateViralScore(trend);
      trend.growth = this.calculateGrowth(trend.contents);
      trend.phase = this.determineTrendPhase(trend);
    });
    
    // Sort by viral score and return top trends
    return allTrends
      .sort((a, b) => b.viralScore - a.viralScore)
      .slice(0, 4)
      .map(trend => ({
        identifier: trend.name,
        viralScore: Math.round(trend.viralScore),
        reach: trend.reach,
        engagement: trend.engagement,
        engagementRate: trend.engagementRate.toFixed(1),
        growth: trend.growth,
        phase: trend.phase,
        data: this.generateTrendHistory(trend.contents)
      }));
  }

  /**
   * Calculate viral score
   */
  calculateViralScore(trend) {
    const reachScore = Math.min(trend.reach / 1000000 * 25, 25);
    const engagementScore = Math.min(trend.engagementRate * 5, 25);
    const countScore = Math.min(trend.count / 100 * 25, 25);
    const growthScore = Math.min(Math.abs(trend.growth || 0) / 100 * 25, 25);
    
    return reachScore + engagementScore + countScore + growthScore;
  }

  /**
   * Calculate growth rate
   */
  calculateGrowth(contents) {
    if (contents.length < 2) return 0;
    
    // Sort by timestamp
    const sorted = contents.sort((a, b) => 
      new Date(a.timestamp || 0) - new Date(b.timestamp || 0)
    );
    
    const midpoint = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, midpoint);
    const secondHalf = sorted.slice(midpoint);
    
    const firstEngagement = firstHalf.reduce((sum, item) => 
      sum + (item.likes || 0) + (item.comments || 0) + (item.shares || 0), 0
    );
    const secondEngagement = secondHalf.reduce((sum, item) => 
      sum + (item.likes || 0) + (item.comments || 0) + (item.shares || 0), 0
    );
    
    if (firstEngagement === 0) return 100;
    return Math.round(((secondEngagement - firstEngagement) / firstEngagement) * 100);
  }

  /**
   * Determine trend phase
   */
  determineTrendPhase(trend) {
    if (trend.viralScore >= 80) return 'viral';
    if (trend.viralScore >= 60 && trend.growth > 100) return 'rising';
    if (trend.viralScore >= 60 && trend.growth < 20) return 'peak';
    if (trend.growth > 500) return 'emerging';
    return 'stable';
  }

  /**
   * Generate trend history data
   */
  generateTrendHistory(contents) {
    const days = 7;
    const history = new Array(days).fill(0);
    const now = new Date();
    
    contents.forEach(item => {
      const itemDate = new Date(item.timestamp || now);
      const daysAgo = Math.floor((now - itemDate) / (1000 * 60 * 60 * 24));
      
      if (daysAgo >= 0 && daysAgo < days) {
        const index = days - 1 - daysAgo;
        history[index] += (item.views || 0) / 1000000; // Convert to millions
      }
    });
    
    // Generate cumulative data
    for (let i = 1; i < history.length; i++) {
      history[i] += history[i - 1];
    }
    
    return history.map(val => Math.round(val * 10) / 10);
  }

  /**
   * Update trend data structure
   */
  updateTrendData() {
    this.trendData = {};
    
    this.currentTrends.forEach((trend, index) => {
      const key = `trend${index}`;
      this.trendData[key] = {
        name: trend.identifier,
        data: trend.data,
        growth: trend.growth,
        phase: trend.phase,
        viralScore: trend.viralScore,
        reach: trend.reach,
        engagementRate: trend.engagementRate
      };
    });
  }

  /**
   * Use default trends as fallback
   */
  useDefaultTrends() {
    this.currentTrends = [
      {
        identifier: 'normcore',
        viralScore: 87,
        reach: 12400000,
        engagementRate: '8.7',
        growth: 234,
        phase: 'rising',
        data: [2.1, 3.4, 5.2, 8.7, 12.4, 15.8, 18.2]
      },
      {
        identifier: 'homesteading',
        viralScore: 92,
        reach: 28700000,
        engagementRate: '11.2',
        growth: 567,
        phase: 'peak',
        data: [5.2, 8.1, 12.3, 18.7, 24.5, 28.7, 29.1]
      },
      {
        identifier: 'antipastaslad',
        viralScore: 76,
        reach: 4200000,
        engagementRate: '9.8',
        growth: 892,
        phase: 'emerging',
        data: [0.1, 0.3, 0.8, 1.9, 3.2, 4.2, 5.8]
      },
      {
        identifier: 'bugatti',
        viralScore: 95,
        reach: 45300000,
        engagementRate: '13.5',
        growth: 1240,
        phase: 'viral',
        data: [3.2, 8.7, 15.4, 25.3, 35.8, 45.3, 48.9]
      }
    ];
    
    this.updateTrendData();
  }

  /**
   * Get date range for timeframe
   */
  getDateRange(timeframe) {
    const now = new Date();
    const start = new Date();
    
    switch(timeframe) {
      case '24h':
        start.setDate(now.getDate() - 1);
        break;
      case '7d':
        start.setDate(now.getDate() - 7);
        break;
      case '30d':
        start.setDate(now.getDate() - 30);
        break;
    }
    
    return { start, end: now };
  }

  /**
   * Render trend cards dynamically
   */
  renderTrendCards() {
    const container = document.querySelector('.trend-cards-grid');
    if (!container) return;
    
    container.innerHTML = '';
    
    this.currentTrends.forEach((trend, index) => {
      const card = this.createTrendCard(trend, index);
      container.appendChild(card);
    });
  }

  /**
   * Create trend card element
   */
  createTrendCard(trend, index) {
    const card = document.createElement('div');
    card.className = `trend-card ${trend.phase}`;
    
    card.innerHTML = `
      <div class="trend-header">
        <div class="trend-title">
          <h3>${this.formatTrendName(trend.identifier)}</h3>
          <span class="trend-badge ${trend.phase}">${this.formatPhase(trend.phase)}</span>
        </div>
        <div class="trend-score">
          <span class="score-label">Viral Score</span>
          <span class="score-value">${trend.viralScore}</span>
        </div>
      </div>
      <div class="trend-metrics">
        <div class="metric-item">
          <span class="metric-label">Total Reach</span>
          <span class="metric-value">${this.formatNumber(trend.reach)}</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">Engagement Rate</span>
          <span class="metric-value">${trend.engagementRate}%</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">Growth</span>
          <span class="metric-value ${trend.growth > 0 ? 'positive' : 'negative'}">+${trend.growth}%</span>
        </div>
      </div>
      <div class="trend-insights">
        <h4>Marketing Opportunities:</h4>
        <ul>
          ${this.generateInsightsList(trend)}
        </ul>
      </div>
      <div class="trend-chart">
        <canvas id="trendChart${index}"></canvas>
      </div>
    `;
    
    return card;
  }

  /**
   * Format trend name
   */
  formatTrendName(identifier) {
    const nameMap = {
      'normcore': 'Normcore Aesthetic',
      'homesteading': 'Homesteading Content',
      'antipastaslad': 'Anti-Pasta Salad',
      'bugatti': 'Bugatti Lifestyle'
    };
    
    return nameMap[identifier.toLowerCase()] || 
           identifier.charAt(0).toUpperCase() + identifier.slice(1);
  }

  /**
   * Format phase name
   */
  formatPhase(phase) {
    const phaseMap = {
      'emerging': 'Emerging',
      'rising': 'Rising',
      'peak': 'At Peak',
      'viral': 'Viral',
      'stable': 'Stable'
    };
    
    return phaseMap[phase] || phase;
  }

  /**
   * Format large numbers
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
   * Generate insights list for trend
   */
  generateInsightsList(trend) {
    const insights = {
      'normcore': [
        'Target Gen Z and younger millennials seeking authenticity',
        'Partner with micro-influencers in fashion/lifestyle',
        'Focus on "anti-trend" messaging and simplicity'
      ],
      'homesteading': [
        'Sustainable living and eco-friendly product placement',
        'DIY tools and supplies partnerships',
        'Educational content series potential'
      ],
      'antipastaslad': [
        'Food brands can create recipe variations',
        'Grocery delivery services partnership potential',
        'Quick recipe content series opportunity'
      ],
      'bugatti': [
        'Luxury brand aspirational campaigns',
        'Success mindset content partnerships',
        'High-end lifestyle product placement'
      ]
    };
    
    const defaultInsights = [
      `Leverage ${trend.engagementRate}% engagement rate`,
      `Target content to ${trend.phase} trend phase`,
      `Capitalize on ${trend.growth}% growth momentum`
    ];
    
    const trendInsights = insights[trend.identifier.toLowerCase()] || defaultInsights;
    return trendInsights.map(insight => `<li>${insight}</li>`).join('');
  }

  /**
   * Initialize trend line charts
   */
  initializeTrendCharts() {
    // Wait for DOM to update
    setTimeout(() => {
      this.currentTrends.forEach((trend, index) => {
        this.initializeSingleTrendChart(trend, index);
      });
    }, 100);
  }

  /**
   * Initialize single trend chart
   */
  initializeSingleTrendChart(trend, index) {
    const chartId = `trendChart${index}`;
    const canvas = document.getElementById(chartId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const colors = ['#00ff88', '#ffbb33', '#00d4ff', '#ff4757'];
    const color = colors[index % colors.length];
    
    const chartOptions = {
      type: 'line',
      data: {
        labels: this.generateTimeLabels(),
        datasets: [{
          label: 'Reach (Millions)',
          data: trend.data,
          borderColor: color,
          backgroundColor: color.replace(')', ', 0.1)').replace('rgb', 'rgba'),
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#00d4ff',
            bodyColor: '#ffffff',
            borderColor: '#00d4ff',
            borderWidth: 1,
            cornerRadius: 4,
            displayColors: false
          }
        },
        scales: {
          x: {
            grid: {
              display: false,
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#718096'
            }
          },
          y: {
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#718096',
              callback: function(value) {
                return value + 'M';
              }
            }
          }
        }
      }
    };

    this.charts[`trend${index}`] = new Chart(ctx, chartOptions);
  }

  /**
   * Initialize demographic charts
   */
  initializeDemographicsCharts() {
    // Age Distribution Chart
    const ageCtx = document.getElementById('ageChart').getContext('2d');
    this.charts.age = new Chart(ageCtx, {
      type: 'doughnut',
      data: {
        labels: ['13-17', '18-24', '25-34', '35-44', '45+'],
        datasets: [{
          data: [15, 45, 25, 10, 5],
          backgroundColor: [
            '#ff4757',
            '#00d4ff',
            '#00ff88',
            '#ffbb33',
            '#9b59b6'
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#ffffff',
              padding: 10,
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.label + ': ' + context.parsed + '%';
              }
            }
          }
        }
      }
    });

    // Platform Preference by Age Chart
    const platformAgeCtx = document.getElementById('platformAgeChart').getContext('2d');
    this.charts.platformAge = new Chart(platformAgeCtx, {
      type: 'bar',
      data: {
        labels: ['13-17', '18-24', '25-34', '35-44', '45+'],
        datasets: [{
          label: 'TikTok',
          data: [85, 72, 45, 28, 15],
          backgroundColor: '#000000',
          borderColor: '#00d4ff',
          borderWidth: 1
        }, {
          label: 'Instagram',
          data: [65, 78, 82, 68, 45],
          backgroundColor: '#E4405F',
          borderColor: '#00d4ff',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 0
        },
        plugins: {
          legend: {
            labels: {
              color: '#ffffff'
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#718096'
            }
          },
          y: {
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#718096',
              callback: function(value) {
                return value + '%';
              }
            }
          }
        }
      }
    });
  }

  /**
   * Generate time labels for last 7 days
   */
  generateTimeLabels() {
    const labels = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }
    
    return labels;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Timeframe filter
    document.getElementById('trendTimeframe').addEventListener('change', (e) => {
      this.updateTimeframe(e.target.value);
    });

    // Platform filter
    document.getElementById('platformFilter').addEventListener('change', (e) => {
      this.filterByPlatform(e.target.value);
    });
  }

  /**
   * Update charts based on timeframe
   */
  async updateTimeframe(timeframe) {
    this.timeframe = timeframe;
    await this.fetchTrendData();
    this.renderTrendCards();
    this.initializeTrendCharts();
    this.showNotification(`Updated to show ${timeframe} data`);
  }

  /**
   * Filter data by platform
   */
  async filterByPlatform(platform) {
    this.platform = platform;
    await this.fetchTrendData();
    this.renderTrendCards();
    this.initializeTrendCharts();
    this.showNotification(`Showing ${platform === 'all' ? 'all platforms' : platform + ' only'}`);
  }

  /**
   * Start real-time updates simulation
   */
  startRealTimeUpdates() {
    setInterval(() => {
      this.simulateRealTimeUpdate();
    }, 5000); // Update every 5 seconds
  }

  /**
   * Simulate real-time data updates
   */
  simulateRealTimeUpdate() {
    // Add slight variations to trend data
    this.currentTrends.forEach((trend, index) => {
      const chart = this.charts[`trend${index}`];
      if (chart && chart.data.datasets[0].data.length > 0) {
        const currentData = [...chart.data.datasets[0].data];
        const lastValue = currentData[currentData.length - 1];
        const variation = (Math.random() - 0.5) * 0.5; // Small variation
        const newValue = Math.max(0, lastValue + variation);
        
        // Update the last data point
        currentData[currentData.length - 1] = parseFloat(newValue.toFixed(1));
        chart.data.datasets[0].data = currentData;
        chart.update('none'); // Update without animation
      }
    });
  }

  /**
   * Export marketing report
   */
  exportReport() {
    const reportData = {
      generated: new Date().toISOString(),
      trends: this.trendData,
      insights: this.generateInsights()
    };

    // Create downloadable JSON report
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `wavesite-marketing-report-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    this.showNotification('Report exported successfully!');
  }

  /**
   * Generate marketing insights
   */
  generateInsights() {
    return {
      topTrend: 'Bugatti Lifestyle',
      topGrowth: 'Anti-Pasta Salad (892%)',
      recommendedAction: 'Activate homesteading campaign while at peak',
      audienceInsight: '68% of engagement from 18-24 age group',
      platformRecommendation: 'TikTok showing 3x higher engagement'
    };
  }

  /**
   * Show notification
   */
  showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification show success';
    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-message">
          <div class="notification-title">Success</div>
          <div class="notification-text">${message}</div>
        </div>
      </div>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.marketingInsights = new MarketingInsights();
  
  // Add export function to window for onclick
  window.exportReport = () => {
    window.marketingInsights.exportReport();
  };
});

// Add notification styles dynamically
const style = document.createElement('style');
style.textContent = `
  .notification {
    position: fixed;
    top: 2rem;
    right: 2rem;
    background: var(--card-background);
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    padding: 1rem;
    box-shadow: var(--shadow-lg);
    transform: translateX(400px);
    transition: transform 0.3s;
    z-index: 1000;
  }
  
  .notification.show {
    transform: translateX(0);
  }
  
  .notification.success {
    border-left: 4px solid var(--success-color);
  }
  
  .notification-title {
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
  }
  
  .notification-text {
    color: var(--text-secondary);
    font-size: 0.875rem;
  }
`;
document.head.appendChild(style);