/**
 * Post Service
 * Orchestrates posting content across multiple social media platforms
 */

import { SessionManager } from './browser-automation.js';
import { XPlatform } from './platforms/x-com.js';
import { LinkedInPlatform } from './platforms/linkedin.js';
import { RedditPlatform } from './platforms/reddit.js';
import { HackerNewsPlatform } from './platforms/hacker-news.js';
import { StackerNewsPlatform } from './platforms/stacker-news.js';
import { PrimalPlatform } from './platforms/primal.js';
import { FacebookPlatform } from './platforms/facebook.js';

/**
 * Post Service class for managing multi-platform posting
 */
export class PostService {
  constructor(options = {}) {
    this.options = {
      retryAttempts: 3,
      retryDelay: 1000,
      concurrentPosts: true,
      ...options,
    };

    // Initialize platform instances
    this.platforms = options.platforms || {
      x: new XPlatform(options.platformOptions?.x),
      linkedin: new LinkedInPlatform(options.platformOptions?.linkedin),
      reddit: new RedditPlatform(options.platformOptions?.reddit),
      'hacker-news': new HackerNewsPlatform(options.platformOptions?.['hacker-news']),
      'stacker-news': new StackerNewsPlatform(options.platformOptions?.['stacker-news']),
      primal: new PrimalPlatform(options.platformOptions?.primal),
      facebook: new FacebookPlatform(options.platformOptions?.facebook),
    };

    // Initialize session manager
    this.sessionManager = options.sessionManager || new SessionManager();
  }

  /**
   * Get platforms that are available for posting (have valid sessions)
   * @returns {string[]} Array of platform names
   */
  getAvailablePlatforms() {
    const availablePlatforms = [];

    for (const platformName of Object.keys(this.platforms)) {
      if (this.sessionManager.isSessionValid(platformName)) {
        availablePlatforms.push(platformName);
      }
    }

    return availablePlatforms;
  }

  /**
   * Validate post content
   * @param {object} content - Content to validate
   * @returns {object} Validation result
   */
  validateContent(content) {
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
      errors.push('Text is too long for some platforms (maximum 280 characters recommended)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Post content to a single platform
   * @param {string} platformName - Platform name
   * @param {object} content - Content to post
   * @returns {Promise<object>} Post result
   */
  async postToPlatform(platformName, content) {
    try {
      const platform = this.platforms[platformName];
      
      if (!platform) {
        return {
          success: false,
          error: `Platform '${platformName}' not supported`,
          platform: platformName,
        };
      }

      console.log(`Posting to ${platformName}...`);
      const result = await platform.post(content);

      return {
        ...result,
        platform: platformName,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to post to ${platformName}: ${error.message}`,
        platform: platformName,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Post content to multiple platforms
   * @param {string[]} platformNames - Array of platform names
   * @param {object} content - Content to post
   * @returns {Promise<object>} Combined results
   */
  async postToMultiplePlatforms(platformNames, content) {
    const results = {};
    let successCount = 0;
    let failureCount = 0;

    if (this.options.concurrentPosts) {
      // Post to all platforms concurrently
      const postPromises = platformNames.map(async platformName => {
        const result = await this.postToPlatform(platformName, content);
        results[platformName] = result;
        
        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }
        
        return result;
      });

      await Promise.all(postPromises);
    } else {
      // Post to platforms sequentially
      for (const platformName of platformNames) {
        const result = await this.postToPlatform(platformName, content);
        results[platformName] = result;
        
        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }

        // Add delay between posts if configured
        if (this.options.retryDelay && platformNames.indexOf(platformName) < platformNames.length - 1) {
          await new Promise(resolve => setTimeout(resolve, this.options.retryDelay));
        }
      }
    }

    return {
      success: successCount > 0,
      results,
      successCount,
      failureCount,
      totalPlatforms: platformNames.length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Main post method - posts to specified platforms or all available platforms
   * @param {object} content - Content to post
   * @param {string[]} [platformNames] - Specific platforms to post to (defaults to all available)
   * @returns {Promise<object>} Post results
   */
  async post(content, platformNames = null) {
    try {
      // Validate content
      const validation = this.validateContent(content);
      if (!validation.valid) {
        return {
          success: false,
          error: `Invalid content: ${validation.errors.join(', ')}`,
          timestamp: new Date().toISOString(),
        };
      }

      // Determine target platforms
      const targetPlatforms = platformNames || this.getAvailablePlatforms();
      
      if (targetPlatforms.length === 0) {
        return {
          success: false,
          error: 'No platforms available for posting. Please login to at least one platform.',
          timestamp: new Date().toISOString(),
        };
      }

      // Filter out unsupported platforms
      const supportedPlatforms = targetPlatforms.filter(name => this.platforms[name]);
      const unsupportedPlatforms = targetPlatforms.filter(name => !this.platforms[name]);

      if (unsupportedPlatforms.length > 0) {
        console.warn(`Unsupported platforms ignored: ${unsupportedPlatforms.join(', ')}`);
      }

      if (supportedPlatforms.length === 0) {
        return {
          success: false,
          error: 'No supported platforms specified',
          timestamp: new Date().toISOString(),
        };
      }

      // Post to platforms
      console.log(`Posting to ${supportedPlatforms.length} platform(s): ${supportedPlatforms.join(', ')}`);
      const result = await this.postToMultiplePlatforms(supportedPlatforms, content);

      // Add content info to result
      result.content = {
        type: content.type || (content.link ? 'link' : 'text'),
        hasText: !!content.text,
        hasLink: !!content.link,
        textLength: content.text?.length || 0,
      };

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Post operation failed: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get posting statistics from a result object
   * @param {object} result - Post result object
   * @returns {object} Statistics
   */
  getPostingStats(result) {
    if (!result.results) {
      return {
        totalPlatforms: 0,
        successfulPosts: 0,
        failedPosts: 0,
        successRate: 0,
      };
    }

    const totalPlatforms = Object.keys(result.results).length;
    const successfulPosts = Object.values(result.results).filter(r => r.success).length;
    const failedPosts = totalPlatforms - successfulPosts;
    const successRate = totalPlatforms > 0 ? Math.round((successfulPosts / totalPlatforms) * 100) : 0;

    return {
      totalPlatforms,
      successfulPosts,
      failedPosts,
      successRate,
    };
  }

  /**
   * Retry failed posts from a previous attempt
   * @param {object} previousResult - Previous post result
   * @param {object} content - Original content
   * @returns {Promise<object>} Retry results
   */
  async retryFailedPosts(previousResult, content) {
    if (!previousResult.results) {
      throw new Error('Invalid previous result - no results found');
    }

    // Find failed platforms
    const failedPlatforms = Object.entries(previousResult.results)
      .filter(([, result]) => !result.success)
      .map(([platform]) => platform);

    if (failedPlatforms.length === 0) {
      return {
        ...previousResult,
        success: true,
        message: 'No failed posts to retry',
      };
    }

    console.log(`Retrying failed posts for: ${failedPlatforms.join(', ')}`);
    
    // Retry failed platforms
    const retryResult = await this.postToMultiplePlatforms(failedPlatforms, content);

    // Merge results
    const mergedResults = {
      ...previousResult.results,
      ...retryResult.results,
    };

    // Recalculate success/failure counts
    const successCount = Object.values(mergedResults).filter(r => r.success).length;
    const failureCount = Object.values(mergedResults).filter(r => !r.success).length;

    return {
      success: successCount > 0,
      results: mergedResults,
      successCount,
      failureCount,
      totalPlatforms: Object.keys(mergedResults).length,
      timestamp: new Date().toISOString(),
      retryAttempt: true,
    };
  }

  /**
   * Get platform status information
   * @returns {object} Platform status for each platform
   */
  getPlatformStatus() {
    const status = {};

    for (const [platformName, platform] of Object.entries(this.platforms)) {
      status[platformName] = {
        available: true,
        loggedIn: this.sessionManager.isSessionValid(platformName),
        platformName: platform.platformName || platformName,
        lastLogin: this.sessionManager.getSession(platformName)?.lastValidated || null,
      };
    }

    return status;
  }

  /**
   * Login to a specific platform
   * @param {string} platformName - Platform name
   * @param {object} [options] - Login options
   * @returns {Promise<boolean>} True if login successful
   */
  async loginToPlatform(platformName, options = {}) {
    const platform = this.platforms[platformName];
    
    if (!platform) {
      throw new Error(`Platform '${platformName}' not supported`);
    }

    try {
      const success = await platform.login(options);
      
      if (success) {
        console.log(`Successfully logged in to ${platformName}`);
      } else {
        console.error(`Failed to login to ${platformName}`);
      }
      
      return success;
    } catch (error) {
      console.error(`Login to ${platformName} failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Close all platform connections and clean up resources
   */
  async close() {
    const closePromises = Object.values(this.platforms).map(async platform => {
      if (platform.closeBrowser) {
        await platform.closeBrowser();
      }
    });

    await Promise.all(closePromises);
  }
}

// Export default instance
export const postService = new PostService();