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

export {
  PostService,
  postService,
} from './src/post-service.js';

// Platform implementations
export { XPlatform } from './src/platforms/x-com.js';
export { LinkedInPlatform } from './src/platforms/linkedin.js';

// Platform implementations (to be created)
// export { RedditPlatform } from './src/platforms/reddit.js';
// export { StackerNewsPlatform } from './src/platforms/stacker-news.js';
// export { PrimalPlatform } from './src/platforms/primal.js';
// export { FacebookPlatform } from './src/platforms/facebook.js';
// export { HackerNewsPlatform } from './src/platforms/hacker-news.js';

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
    this.postService = new PostService({
      platformOptions: {
        x: { headless: this.options.headless, timeout: this.options.timeout },
        linkedin: { headless: this.options.headless, timeout: this.options.timeout },
      },
      sessionsPath: this.options.sessionsPath,
    });
    this.sessionManager = this.postService.sessionManager;
  }

  /**
   * Login to a platform
   * @param {string} platform - Platform name
   * @param {object} [options] - Login options
   * @returns {Promise<boolean>} True if login successful
   */
  async login(platform, options = {}) {
    try {
      return await this.postService.loginToPlatform(platform, options);
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
    return await this.postService.post(content, platforms);
  }

  /**
   * Get platforms that are ready for posting
   * @returns {string[]} Array of platform names
   */
  getAvailablePlatforms() {
    return this.postService.getAvailablePlatforms();
  }

  /**
   * Check authentication status for all platforms
   * @returns {object} Status for each platform
   */
  getAuthStatus() {
    const platformStatus = this.postService.getPlatformStatus();
    const status = {};
    const platforms = ['x', 'linkedin', 'reddit', 'stackerNews', 'primal', 'facebook', 'hackerNews'];

    for (const platform of platforms) {
      status[platform] = {
        enabled: this.config.platforms?.[platform]?.enabled ?? false,
        loggedIn: platformStatus[platform]?.loggedIn ?? false,
        displayName: getPlatformDisplayName(platform),
        available: platformStatus[platform]?.available ?? false,
      };
    }

    return status;
  }

  /**
   * Close browser and clean up resources
   */
  async close() {
    await this.postService.close();
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
  const postService = new PostService();
  return postService.validateContent(content);
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