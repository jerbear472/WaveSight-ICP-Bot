/**
 * Marketing Insights Dashboard JavaScript
 * Real-time trend analysis and marketing intelligence
 */

class MarketingInsights {
  constructor() {
    this.charts = {};
    this.trendData = {
      normcore: {
        name: 'Normcore Aesthetic',
        data: [2.1, 3.4, 5.2, 8.7, 12.4, 15.8, 18.2],
        growth: 234,
        phase: 'rising'
      },
      homesteading: {
        name: 'Homesteading Content',
        data: [5.2, 8.1, 12.3, 18.7, 24.5, 28.7, 29.1],
        growth: 567,
        phase: 'peak'
      },
      antiPastaSalad: {
        name: 'Anti-Pasta Salad',
        data: [0.1, 0.3, 0.8, 1.9, 3.2, 4.2, 5.8],
        growth: 892,
        phase: 'emerging'
      },
      bugatti: {
        name: 'Bugatti Lifestyle',
        data: [3.2, 8.7, 15.4, 25.3, 35.8, 45.3, 48.9],
        growth: 1240,
        phase: 'viral'
      }
    };
    
    this.init();
  }

  init() {
    this.initializeTrendCharts();
    this.initializeDemographicsCharts();
    this.setupEventListeners();
    this.startRealTimeUpdates();
  }

  /**
   * Initialize trend line charts
   */
  initializeTrendCharts() {
    const chartOptions = {
      type: 'line',
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

    // Normcore Chart
    const normcoreCtx = document.getElementById('normcoreChart').getContext('2d');
    this.charts.normcore = new Chart(normcoreCtx, {
      ...chartOptions,
      data: {
        labels: this.generateTimeLabels(),
        datasets: [{
          label: 'Reach (Millions)',
          data: this.trendData.normcore.data,
          borderColor: '#00ff88',
          backgroundColor: 'rgba(0, 255, 136, 0.1)',
          tension: 0.4,
          fill: true
        }]
      }
    });

    // Homesteading Chart
    const homesteadingCtx = document.getElementById('homesteadingChart').getContext('2d');
    this.charts.homesteading = new Chart(homesteadingCtx, {
      ...chartOptions,
      data: {
        labels: this.generateTimeLabels(),
        datasets: [{
          label: 'Reach (Millions)',
          data: this.trendData.homesteading.data,
          borderColor: '#ffbb33',
          backgroundColor: 'rgba(255, 187, 51, 0.1)',
          tension: 0.4,
          fill: true
        }]
      }
    });

    // Anti-Pasta Salad Chart
    const antiPastaCtx = document.getElementById('antiPastaChart').getContext('2d');
    this.charts.antiPasta = new Chart(antiPastaCtx, {
      ...chartOptions,
      data: {
        labels: this.generateTimeLabels(),
        datasets: [{
          label: 'Reach (Millions)',
          data: this.trendData.antiPastaSalad.data,
          borderColor: '#00d4ff',
          backgroundColor: 'rgba(0, 212, 255, 0.1)',
          tension: 0.4,
          fill: true
        }]
      }
    });

    // Bugatti Chart
    const bugattiCtx = document.getElementById('bugattiChart').getContext('2d');
    this.charts.bugatti = new Chart(bugattiCtx, {
      ...chartOptions,
      data: {
        labels: this.generateTimeLabels(),
        datasets: [{
          label: 'Reach (Millions)',
          data: this.trendData.bugatti.data,
          borderColor: '#ff4757',
          backgroundColor: 'rgba(255, 71, 87, 0.1)',
          tension: 0.4,
          fill: true
        }]
      }
    });
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
  updateTimeframe(timeframe) {
    // Simulate different data for different timeframes
    const multiplier = timeframe === '24h' ? 0.1 : timeframe === '7d' ? 1 : 4;
    
    Object.keys(this.trendData).forEach(trend => {
      const chart = this.charts[trend];
      if (chart) {
        const newData = this.trendData[trend].data.map(value => value * multiplier);
        chart.data.datasets[0].data = newData;
        chart.update();
      }
    });
  }

  /**
   * Filter data by platform
   */
  filterByPlatform(platform) {
    // In a real implementation, this would filter actual data
    console.log('Filtering by platform:', platform);
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
    Object.keys(this.trendData).forEach(trend => {
      const chart = this.charts[trend];
      if (chart && chart.data.datasets[0].data.length > 0) {
        const currentData = [...chart.data.datasets[0].data];
        const lastValue = currentData[currentData.length - 1];
        const variation = (Math.random() - 0.5) * 2; // -1 to 1
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