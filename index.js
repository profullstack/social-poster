/**
 * @profullstack/social-poster - Main module export
 * Social media posting tool with Puppeteer-based authentication
 */

// Core modules
export {
  getConfigPath,
  getDefaultConfig,
  validateConfig,
  loadConfig,
  saveConfig,
  mergeConfig,
  getConfigValue,
  setConfigValue,
  isPlatformReady,
  getReadyPlatforms,
  getPlatformDisplayName,
} from './src/config-manager.js';

export {
  BrowserAutomation,
  SessionManager,
  loadSessions,
  saveSessions,
  validateSession,
  getSessionsPath,
} from './src/browser-automation.js';

// Platform implementations (to be created)
export { XPlatform } from './src/platforms/x-com.js';
export { LinkedInPlatform } from './src/platforms/linkedin.js';
export { RedditPlatform } from './src/platforms/reddit.js';
export { StackerNewsPlatform } from './src/platforms/stacker-news.js';
export { PrimalPlatform } from './src/platforms/primal.js';
export { FacebookPlatform } from './src/platforms/facebook.js';
export { HackerNewsPlatform } from './src/platforms/hacker-news.js';

/**
 * Social Media Poster class - Main orchestrator
 */
export class SocialPoster {
  constructor(options = {}) {
    this.options = {
      headless: true,
      timeout: 30000,
      configPath: null,
      sessionsPath: null,
      ...options,
    };

    this.config = loadConfig(this.options.configPath);
    this.browserAutomation = new BrowserAutomation({
      headless: this.options.headless,
      timeout: this.options.timeout,
      sessionsPath: this.options.sessionsPath,
    });
    this.sessionManager = this.browserAutomation.sessionManager;
  }

  /**
   * Login to a platform
   * @param {string} platform - Platform name
   * @param {object} [options] - Login options
   * @returns {Promise<boolean>} True if login successful
   */
  async login(platform, options = {}) {
    try {
      return await this.browserAutomation.login(platform, options);
    } catch (error) {
      console.error(`Login failed for ${platform}: ${error.message}`);
      return false;
    }
  }

  /**
   * Post content to platforms
   * @param {object} content - Content to post
   * @param {string[]} [platforms] - Target platforms (defaults to all ready platforms)
   * @returns {Promise<object>} Post results
   */
  async post(content, platforms = null) {
    const targetPlatforms = platforms || getReadyPlatforms(this.config);
    const results = {};

    for (const platform of targetPlatforms) {
      try {
        const result = await this.browserAutomation.post(platform, content);
        results[platform] = { success: true, ...result };
      } catch (error) {
        results[platform] = { success: false, error: error.message };
      }
    }

    return {
      success: Object.values(results).some(r => r.success),
      results,
    };
  }

  /**
   * Get platforms that are ready for posting
   * @returns {string[]} Array of platform names
   */
  getAvailablePlatforms() {
    return getReadyPlatforms(this.config);
  }

  /**
   * Check authentication status for all platforms
   * @returns {object} Status for each platform
   */
  getAuthStatus() {
    const status = {};
    const platforms = ['x', 'linkedin', 'reddit', 'stackerNews', 'primal', 'facebook', 'hackerNews'];

    for (const platform of platforms) {
      status[platform] = {
        enabled: this.config.platforms[platform]?.enabled ?? false,
        loggedIn: this.sessionManager.isSessionValid(platform),
        displayName: getPlatformDisplayName(platform),
      };
    }

    return status;
  }

  /**
   * Close browser and clean up resources
   */
  async close() {
    await this.browserAutomation.closeBrowser();
  }
}

/**
 * Quick start function for simple posting
 * @param {object} content - Content to post
 * @param {object} [options] - Configuration options
 * @returns {Promise<object>} Post results
 */
export async function quickPost(content, options = {}) {
  const poster = new SocialPoster(options);

  try {
    const validation = validatePostContent(content);
    if (!validation.valid) {
      throw new Error(`Invalid content: ${validation.errors.join(', ')}`);
    }

    return await poster.post(content, options.platforms);
  } finally {
    await poster.close();
  }
}

/**
 * Validate post content
 * @param {object} content - Content to validate
 * @returns {object} Validation result
 */
export function validatePostContent(content) {
  const errors = [];

  if (!content || typeof content !== 'object') {
    errors.push('Content must be an object');
    return { valid: false, errors };
  }

  if (!content.text && !content.link) {
    errors.push('Content must have either text or link');
  }

  if (content.text && typeof content.text !== 'string') {
    errors.push('Text must be a string');
  }

  if (content.link) {
    try {
      new URL(content.link);
    } catch {
      errors.push('Link must be a valid URL');
    }
  }

  if (content.text && content.text.length > 280) {
    errors.push('Text is too long (maximum 280 characters)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create sample post content
 * @param {string} type - Type of sample ('text' or 'link')
 * @returns {object} Sample content
 */
export function createSamplePost(type = 'text') {
  const samples = {
    text: {
      text: 'Hello from Social Poster! 🚀 This is a test post to demonstrate the multi-platform posting capabilities.',
      type: 'text',
    },
    link: {
      text: 'Check out this amazing tool for social media automation! 🔥',
      link: 'https://github.com/profullstack/social-poster',
      type: 'link',
    },
  };

  return samples[type] || samples.text;
}

// Default export
export default {
  SocialPoster,
  quickPost,
  validatePostContent,
  createSamplePost,
  loadConfig,
  BrowserAutomation,
  SessionManager,
};