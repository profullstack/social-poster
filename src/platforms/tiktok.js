/**
 * TikTok Platform Implementation
 * Handles login and posting to TikTok using Puppeteer
 */

import { BrowserAutomation } from '../browser-automation.js';

/**
 * TikTok Platform class for handling TikTok interactions
 */
export class TikTokPlatform extends BrowserAutomation {
  constructor(options = {}) {
    super(options);
    this.platformName = 'tiktok';
    this.baseUrl = 'https://www.tiktok.com';
    this.loginUrl = 'https://www.tiktok.com/login';
    this.uploadUrl = 'https://www.tiktok.com/upload';
    this.maxTextLength = 2200;
  }

  /**
   * Check if user is logged in to TikTok
   * @param {Page} page - Puppeteer page instance
   * @returns {Promise<boolean>} True if logged in
   */
  async isLoggedIn(page) {
    try {
      const currentUrl = page.url();
      
      // Check if we're on a login page
      if (currentUrl.includes('/login') || currentUrl.includes('/signup')) {
        return false;
      }

      // Look for elements that indicate we're logged in
      const profileIcon = await page.$('[data-e2e="profile-icon"]');
      const navProfile = await page.$('[data-e2e="nav-profile"]');
      const uploadButton = await page.$('[data-e2e="nav-upload"]');

      return !!(profileIcon || navProfile || uploadButton);
    } catch (error) {
      console.warn(`Failed to check TikTok login status: ${error.message}`);
      return false;
    }
  }

  /**
   * Navigate to login page
   * @param {Page} page - Puppeteer page instance
   */
  async navigateToLogin(page) {
    await page.goto(this.loginUrl, { waitUntil: 'networkidle2' });
  }

  /**
   * Navigate to upload page
   * @param {Page} page - Puppeteer page instance
   */
  async navigateToUpload(page) {
    await page.goto(this.uploadUrl, { waitUntil: 'networkidle2' });
  }

  /**
   * Post text content (TikTok requires video upload, so this is for caption/description)
   * @param {Page} page - Puppeteer page instance
   * @param {object} content - Content to post
   * @returns {Promise<object>} Post result
   */
  async postText(page, content) {
    try {
      // Validate text length
      if (content.text.length > this.maxTextLength) {
        return {
          success: false,
          error: `Text is too long (${content.text.length}/${this.maxTextLength} characters)`,
        };
      }

      // Wait for caption/description textarea
      await page.waitForSelector('[data-text="true"]', { timeout: 10000 });
      await this.typeText(page, '[data-text="true"]', content.text);

      // Wait a moment for the post button to become enabled
      await page.waitForTimeout(1000);

      // Click the Post button
      await this.clickElement(page, '[data-e2e="post-button"]');

      // Wait for the post to be published
      const posted = await this.waitForPostToLoad(page);
      if (!posted) {
        return {
          success: false,
          error: 'TikTok posting timed out',
        };
      }

      // Extract post ID from URL
      const postId = this.extractPostId(page.url());

      return {
        success: true,
        postId,
        url: page.url(),
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to post text: ${error.message}`,
      };
    }
  }

  /**
   * Upload video with caption
   * @param {Page} page - Puppeteer page instance
   * @param {object} content - Content to post (should include video file path)
   * @returns {Promise<object>} Post result
   */
  async postVideo(page, content) {
    try {
      if (!content.videoPath) {
        return {
          success: false,
          error: 'Video file path is required for TikTok posts',
        };
      }

      // Wait for file input
      const fileInput = await page.waitForSelector('input[type="file"]', { timeout: 10000 });
      
      // Upload video file
      await fileInput.uploadFile(content.videoPath);

      // Wait for video to process
      await page.waitForSelector('[data-e2e="video-upload-progress"]', { visible: false, timeout: 60000 });

      // Add caption if provided
      if (content.text) {
        await page.waitForSelector('[data-text="true"]', { timeout: 10000 });
        await this.typeText(page, '[data-text="true"]', content.text);
      }

      // Wait for post button to be enabled
      await page.waitForTimeout(2000);

      // Click the Post button
      await this.clickElement(page, '[data-e2e="post-button"]');

      // Wait for the post to be published
      const posted = await this.waitForPostToLoad(page);
      if (!posted) {
        return {
          success: false,
          error: 'TikTok video posting timed out',
        };
      }

      // Extract post ID from URL
      const postId = this.extractPostId(page.url());

      return {
        success: true,
        postId,
        url: page.url(),
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to post video: ${error.message}`,
      };
    }
  }

  /**
   * Extract post ID from TikTok URL
   * @param {string} url - TikTok post URL
   * @returns {string|null} Post ID or null if not found
   */
  extractPostId(url) {
    const match = url.match(/\/video\/(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Wait for post to be published and URL to change
   * @param {Page} page - Puppeteer page instance
   * @param {number} [timeout=30000] - Timeout in milliseconds
   * @returns {Promise<boolean>} True if post was published
   */
  async waitForPostToLoad(page, timeout = 30000) {
    try {
      // Wait for URL to change to a video URL
      await page.waitForFunction(
        () => globalThis.window.location.href.includes('/video/'),
        { timeout }
      );
      return true;
    } catch (error) {
      console.warn(`TikTok post loading timed out: ${error.message}`);
      return false;
    }
  }

  /**
   * Login to TikTok platform
   * @param {object} [options] - Login options
   * @returns {Promise<boolean>} True if login successful
   */
  async login(_options = {}) {
    const page = await this.createPage(this.platformName);

    try {
      // Check if already logged in
      await page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
      
      if (await this.isLoggedIn(page)) {
        console.log('Already logged in to TikTok');
        await this.saveSession(page, this.platformName);
        return true;
      }

      // Navigate to login page
      await this.navigateToLogin(page);

      // For now, we'll wait for manual login
      // In a real implementation, you might prompt for credentials
      console.log('Please log in manually in the browser...');
      console.log('Waiting for login to complete...');

      // Wait for user to complete login manually
      await page.waitForFunction(
        () => !globalThis.window.location.href.includes('/login') && 
              !globalThis.window.location.href.includes('/signup'),
        { timeout: 300000 } // 5 minutes
      );

      // Verify login was successful
      const isLoggedIn = await this.isLoggedIn(page);
      if (isLoggedIn) {
        console.log('TikTok login completed successfully');
        await this.saveSession(page, this.platformName);
        return true;
      } else {
        console.error('TikTok login verification failed');
        return false;
      }
    } catch (error) {
      console.error(`TikTok login failed: ${error.message}`);
      return false;
    } finally {
      await page.close();
    }
  }

  /**
   * Post content to TikTok
   * @param {object} content - Content to post
   * @returns {Promise<object>} Post result
   */
  async post(content) {
    const page = await this.createPage(this.platformName);

    try {
      // Navigate to TikTok
      await page.goto(this.baseUrl, { waitUntil: 'networkidle2' });

      // Check if logged in
      if (!(await this.isLoggedIn(page))) {
        return {
          success: false,
          error: 'Authentication required. Please run "sp login tiktok" first.',
        };
      }

      // Navigate to upload page
      await this.navigateToUpload(page);

      // Post based on content type
      let result;
      if (content.videoPath) {
        result = await this.postVideo(page, content);
      } else {
        // TikTok requires video, but we can still handle text-only for testing
        result = await this.postText(page, content);
      }

      // Save session after successful interaction
      if (result.success) {
        await this.saveSession(page, this.platformName);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to post to TikTok: ${error.message}`,
      };
    } finally {
      await page.close();
    }
  }
}

// Export default instance
export const tikTokPlatform = new TikTokPlatform();