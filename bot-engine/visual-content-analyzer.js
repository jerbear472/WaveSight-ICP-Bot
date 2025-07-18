/**
 * Visual Content Analyzer
 * Uses AI to analyze screenshots when traditional scraping fails
 */

const fs = require('fs').promises;
const path = require('path');

class VisualContentAnalyzer {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    this.model = options.model || 'gpt-4-vision-preview';
    this.maxTokens = options.maxTokens || 500;
    this.temperature = options.temperature || 0.2;
    this.enabled = !!this.apiKey;
    
    if (!this.enabled) {
      console.log('⚠️  Visual Content Analyzer disabled - no API key provided');
    }
  }

  async analyzeScreenshot(screenshotPath) {
    if (!this.enabled) {
      return null;
    }

    try {
      // Read image as base64
      const imageBuffer = await fs.readFile(screenshotPath);
      const base64Image = imageBuffer.toString('base64');

      // Prepare the prompt
      const prompt = `Analyze this Instagram post screenshot and extract the following information in JSON format:
{
  "username": "the creator's username",
  "handle": "the @handle if visible",
  "caption": "the full caption text",
  "hashtags": ["array", "of", "hashtags"],
  "likes": "number of likes (convert K/M to full number)",
  "comments": "number of comments",
  "views": "number of views if it's a video/reel",
  "location": "location tag if present",
  "music": "music/audio name if it's a reel",
  "postType": "photo/video/reel",
  "isSponsored": true/false
}

Extract as much information as possible. If something is not visible, use null for that field.`;

      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/png;base64,${base64Image}`,
                    detail: 'high'
                  }
                }
              ]
            }
          ],
          max_tokens: this.maxTokens,
          temperature: this.temperature
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return null;
    } catch (error) {
      console.error('Error analyzing screenshot:', error);
      return null;
    }
  }

  async analyzePost(page, postElement) {
    if (!this.enabled) {
      return null;
    }

    try {
      // Take screenshot of just the post element
      const screenshotPath = path.join(__dirname, `../debug/post-${Date.now()}.png`);
      await postElement.screenshot({ path: screenshotPath });
      
      // Analyze the screenshot
      const analysis = await this.analyzeScreenshot(screenshotPath);
      
      // Clean up screenshot after analysis
      await fs.unlink(screenshotPath).catch(() => {});
      
      return analysis;
    } catch (error) {
      console.error('Error in analyzePost:', error);
      return null;
    }
  }

  // Convert LLM analysis to our data format
  normalizeAnalysis(analysis) {
    if (!analysis) return null;

    return {
      username: analysis.username || 'Unknown',
      handle: analysis.handle || '@unknown',
      caption: analysis.caption || '',
      hashtags: analysis.hashtags || [],
      likes: this.parseNumber(analysis.likes),
      comments: this.parseNumber(analysis.comments),
      views: this.parseNumber(analysis.views),
      location: analysis.location,
      music: analysis.music,
      postType: analysis.postType || 'post',
      isSponsored: analysis.isSponsored || false
    };
  }

  parseNumber(value) {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    
    const str = value.toString().toUpperCase();
    let num = parseFloat(str.replace(/[^0-9.]/g, ''));
    
    if (str.includes('K')) num *= 1000;
    if (str.includes('M')) num *= 1000000;
    if (str.includes('B')) num *= 1000000000;
    
    return Math.floor(num);
  }
}

module.exports = VisualContentAnalyzer;