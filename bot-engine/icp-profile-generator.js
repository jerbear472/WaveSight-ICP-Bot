/**
 * ICP Profile Generator
 * Creates realistic ideal customer profiles for bot simulation
 */

const faker = require('faker');
const { v4: uuidv4 } = require('uuid');

class ICPProfileGenerator {
  constructor() {
    this.profileTemplates = {
      'gen_z_tech_enthusiast': {
        ageRange: '18-24',
        interests: ['AI', 'crypto', 'gaming', 'tech', 'startups', 'web3'],
        deviceType: 'mobile_ios',
        behaviorPatterns: {
          scrollSpeed: 'fast',
          engagementRate: 'high',
          contentPreference: ['short_video', 'memes', 'tech_news'],
          activeHours: [10, 14, 19, 23]
        }
      },
      'millennial_professional': {
        ageRange: '28-38',
        interests: ['productivity', 'career', 'investing', 'wellness', 'travel'],
        deviceType: 'mobile_android',
        behaviorPatterns: {
          scrollSpeed: 'moderate',
          engagementRate: 'selective',
          contentPreference: ['educational', 'inspirational', 'news'],
          activeHours: [7, 12, 18, 21]
        }
      },
      'fashion_beauty_enthusiast': {
        ageRange: '21-35',
        interests: ['fashion', 'beauty', 'lifestyle', 'influencers', 'shopping'],
        deviceType: 'mobile_ios',
        behaviorPatterns: {
          scrollSpeed: 'moderate',
          engagementRate: 'very_high',
          contentPreference: ['tutorials', 'hauls', 'reviews', 'trends'],
          activeHours: [11, 15, 20, 22]
        }
      },
      'fitness_health_focused': {
        ageRange: '25-45',
        interests: ['fitness', 'nutrition', 'wellness', 'sports', 'outdoor'],
        deviceType: 'mobile_android',
        behaviorPatterns: {
          scrollSpeed: 'slow',
          engagementRate: 'moderate',
          contentPreference: ['workouts', 'recipes', 'motivation', 'tips'],
          activeHours: [6, 12, 17, 20]
        }
      },
      'parent_family_oriented': {
        ageRange: '30-45',
        interests: ['parenting', 'education', 'family', 'cooking', 'home'],
        deviceType: 'mobile_ios',
        behaviorPatterns: {
          scrollSpeed: 'slow',
          engagementRate: 'moderate',
          contentPreference: ['tips', 'recipes', 'activities', 'products'],
          activeHours: [9, 13, 19, 21]
        }
      }
    };

    this.regions = [
      { code: 'US-CA', timezone: 'America/Los_Angeles', language: 'en' },
      { code: 'US-NY', timezone: 'America/New_York', language: 'en' },
      { code: 'US-TX', timezone: 'America/Chicago', language: 'en' },
      { code: 'UK-LON', timezone: 'Europe/London', language: 'en' },
      { code: 'CA-ON', timezone: 'America/Toronto', language: 'en' }
    ];

    this.incomeBrackets = [
      '< $30k',
      '$30k - $50k',
      '$50k - $75k',
      '$75k - $100k',
      '$100k - $150k',
      '> $150k'
    ];
  }

  /**
   * Generate a complete ICP profile
   * @param {string} templateName - Name of the profile template to use
   * @param {Object} customAttributes - Custom attributes to override
   * @returns {Object} Complete ICP profile
   */
  generateProfile(templateName, customAttributes = {}) {
    const template = this.profileTemplates[templateName] || this.profileTemplates['gen_z_tech_enthusiast'];
    const region = this.regions[Math.floor(Math.random() * this.regions.length)];
    const gender = ['male', 'female', 'non-binary'][Math.floor(Math.random() * 3)];

    const profile = {
      id: uuidv4(),
      profileName: `${templateName}_${faker.internet.userName().toLowerCase()}`,
      ageRange: template.ageRange,
      gender: gender,
      interests: template.interests,
      deviceType: template.deviceType,
      region: region.code,
      language: region.language,
      timezone: region.timezone,
      incomeBracket: this.incomeBrackets[Math.floor(Math.random() * this.incomeBrackets.length)],
      behaviorPatterns: {
        ...template.behaviorPatterns,
        ...this.generateBehaviorVariance(template.behaviorPatterns)
      },
      deviceInfo: this.generateDeviceInfo(template.deviceType),
      personalityTraits: this.generatePersonalityTraits(templateName),
      ...customAttributes
    };

    return profile;
  }

  /**
   * Generate behavior variance to make bots more human-like
   */
  generateBehaviorVariance(basePatterns) {
    return {
      scrollSpeedVariance: Math.random() * 0.3 + 0.85, // 85-115% of base speed
      engagementProbability: this.getEngagementProbability(basePatterns.engagementRate),
      attentionSpanMs: this.getAttentionSpan(basePatterns.scrollSpeed),
      clickThroughRate: Math.random() * 0.15 + 0.05, // 5-20%
      storyCompletionRate: Math.random() * 0.4 + 0.6, // 60-100%
      adInteractionRate: Math.random() * 0.1 + 0.02 // 2-12%
    };
  }

  /**
   * Get engagement probability based on engagement rate
   */
  getEngagementProbability(engagementRate) {
    const rates = {
      'very_high': 0.3 + Math.random() * 0.2,
      'high': 0.2 + Math.random() * 0.15,
      'moderate': 0.1 + Math.random() * 0.1,
      'selective': 0.05 + Math.random() * 0.05,
      'low': 0.02 + Math.random() * 0.03
    };
    return rates[engagementRate] || rates['moderate'];
  }

  /**
   * Get attention span based on scroll speed
   */
  getAttentionSpan(scrollSpeed) {
    const spans = {
      'fast': 3000 + Math.random() * 4000, // 3-7 seconds
      'moderate': 5000 + Math.random() * 7000, // 5-12 seconds
      'slow': 8000 + Math.random() * 12000 // 8-20 seconds
    };
    return spans[scrollSpeed] || spans['moderate'];
  }

  /**
   * Generate device information
   */
  generateDeviceInfo(deviceType) {
    const devices = {
      'mobile_ios': {
        platform: 'iOS',
        device: ['iPhone 14', 'iPhone 13', 'iPhone 12', 'iPhone 15 Pro'][Math.floor(Math.random() * 4)],
        osVersion: `${16 + Math.floor(Math.random() * 2)}.${Math.floor(Math.random() * 5)}`,
        screenSize: { width: 390, height: 844 }
      },
      'mobile_android': {
        platform: 'Android',
        device: ['Samsung Galaxy S23', 'Google Pixel 7', 'OnePlus 11'][Math.floor(Math.random() * 3)],
        osVersion: `${12 + Math.floor(Math.random() * 2)}`,
        screenSize: { width: 412, height: 915 }
      },
      'desktop': {
        platform: 'Desktop',
        device: 'Desktop Computer',
        osVersion: ['Windows 11', 'macOS 14', 'Ubuntu 22.04'][Math.floor(Math.random() * 3)],
        screenSize: { width: 1920, height: 1080 }
      }
    };

    return devices[deviceType] || devices['mobile_ios'];
  }

  /**
   * Generate personality traits for more realistic behavior
   */
  generatePersonalityTraits(templateName) {
    return {
      impulsiveness: Math.random(), // 0-1, affects quick engagement decisions
      trendSensitivity: Math.random(), // 0-1, affects interest in viral content
      brandLoyalty: Math.random(), // 0-1, affects following/engaging with brands
      socialProof: Math.random(), // 0-1, affects engagement based on popularity
      contentQualityThreshold: Math.random() * 0.5 + 0.5, // 0.5-1, minimum quality for engagement
      adTolerance: Math.random() * 0.7 // 0-0.7, willingness to interact with ads
    };
  }

  /**
   * Generate a batch of diverse ICP profiles
   */
  generateBatch(count = 10) {
    const profiles = [];
    const templateNames = Object.keys(this.profileTemplates);
    
    for (let i = 0; i < count; i++) {
      const templateName = templateNames[i % templateNames.length];
      profiles.push(this.generateProfile(templateName));
    }
    
    return profiles;
  }

  /**
   * Create a specific ICP profile for targeted testing
   */
  createCustomProfile(specifications) {
    const {
      ageRange,
      gender,
      interests,
      region,
      incomeBracket,
      behaviorType = 'moderate'
    } = specifications;

    return {
      id: uuidv4(),
      profileName: `custom_${faker.internet.userName().toLowerCase()}`,
      ageRange: ageRange || '25-35',
      gender: gender || 'any',
      interests: interests || ['general'],
      deviceType: 'mobile_ios',
      region: region || 'US-CA',
      language: 'en',
      incomeBracket: incomeBracket || '$50k - $75k',
      behaviorPatterns: this.createCustomBehaviorPattern(behaviorType),
      deviceInfo: this.generateDeviceInfo('mobile_ios'),
      personalityTraits: this.generatePersonalityTraits('custom')
    };
  }

  /**
   * Create custom behavior patterns
   */
  createCustomBehaviorPattern(behaviorType) {
    const patterns = {
      'aggressive': {
        scrollSpeed: 'fast',
        engagementRate: 'very_high',
        contentPreference: ['viral', 'trending', 'new'],
        activeHours: Array.from({length: 16}, (_, i) => i + 8) // 8am-midnight
      },
      'passive': {
        scrollSpeed: 'slow',
        engagementRate: 'low',
        contentPreference: ['educational', 'long_form'],
        activeHours: [12, 18, 20, 21]
      },
      'moderate': {
        scrollSpeed: 'moderate',
        engagementRate: 'moderate',
        contentPreference: ['mixed'],
        activeHours: [9, 12, 17, 20, 22]
      }
    };

    return {
      ...patterns[behaviorType],
      ...this.generateBehaviorVariance(patterns[behaviorType])
    };
  }
}

module.exports = ICPProfileGenerator;