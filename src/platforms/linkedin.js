/**
 * LinkedIn Platform Implementation
 * Handles login and posting to LinkedIn using Puppeteer
 */

import { BrowserAutomation } from '../browser-automation.js';

/**
 * LinkedIn Platform class for handling LinkedIn interactions
 */
export class LinkedInPlatform extends BrowserAutomation {
  constructor(options = {}) {
    super(options);
    this.platformName = 'linkedin';
    this.baseUrl = 'https://www.linkedin.com';
    this.loginUrl = 'https://www.linkedin.com/login';
    this.maxTextLength = 3000; // LinkedIn's character limit
  }

  /**
   * Check if user is logged in to LinkedIn
   * @param {Page} page - Puppeteer page instance
   * @returns {Promise<boolean>} True if logged in
   */
  async isLoggedIn(page) {
    try {
      const currentUrl = page.url();
      
      // Check if we're on a login page
      if (currentUrl.includes('/login') || currentUrl.includes('/uas/login')) {
        return false;
      }

      // Look for elements that indicate we're logged in
      const profileMenu = await page.$('.global-nav__me');
      const feedPage = await page.$('.feed-identity-module');
      const globalNav = await page.$('.global-nav');

      return !!(profileMenu || feedPage || globalNav);
    } catch (error) {
      console.warn(`Failed to check LinkedIn login status: ${error.message}`);
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
   * Perform login with credentials
   * @param {Page} page - Puppeteer page instance
   * @param {object} credentials - Login credentials
   * @returns {Promise<boolean>} True if login successful
   */
  async performLogin(page, credentials) {
    try {
      console.log('Starting LinkedIn login process...');

      // Wait for username input
      await page.waitForSelector('#username', { timeout: 10000 });
      await this.typeText(page, '#username', credentials.username);

      // Wait for password input
      await page.waitForSelector('#password', { timeout: 10000 });
      await this.typeText(page, '#password', credentials.password);

      // Click Sign in button
      await this.clickElement(page, '[type="submit"]');

      // Handle potential verification steps
      try {
        // Check for email verification
        const verificationInput = await page.waitForSelector('#input__email_verification_pin', { 
          timeout: 5000 
        });
        if (verificationInput && credentials.verificationCode) {
          await this.typeText(page, '#input__email_verification_pin', credentials.verificationCode);
          await this.clickElement(page, '#email-pin-submit-button');
        }
      } catch {
        // No verification needed
      }

      // Wait for successful login (redirect to feed)
      await page.waitForNavigation({ timeout: 15000 });

      // Verify we're logged in
      const isLoggedIn = await this.isLoggedIn(page);
      if (isLoggedIn) {
        console.log('Successfully logged in to LinkedIn');
        return true;
      } else {
        console.error('Login appeared to succeed but user is not logged in');
        return false;
      }
    } catch (error) {
      console.error(`LinkedIn login failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Navigate to compose post dialog
   * @param {Page} page - Puppeteer page instance
   */
  async navigateToCompose(page) {
    try {
      // Look for the "Start a post" button
      const startPostButton = await page.waitForSelector('[data-control-name="share_via_linkedin"]', {
        timeout: 10000,
      });

      if (!startPostButton) {
        throw new Error('Start post button not found');
      }

      await startPostButton.click();

      // Wait for compose dialog to open
      await page.waitForSelector('.ql-editor', { timeout: 10000 });
    } catch (error) {
      throw new Error(`Failed to open compose dialog: ${error.message}`);
    }
  }

  /**
   * Post text content
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

      // Wait for editor and type content
      await page.waitForSelector('.ql-editor', { timeout: 10000 });
      await this.typeText(page, '.ql-editor', content.text);

      // Wait a moment for the post button to become enabled
      await page.waitForTimeout(2000);

      // Click the Post button
      await this.clickElement(page, '[data-control-name="share.post"]');

      // Wait for the post to be published
      const posted = await this.waitForPostToLoad(page);
      if (!posted) {
        return {
          success: false,
          error: 'Post publishing timed out',
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
   * Post link content
   * @param {Page} page - Puppeteer page instance
   * @param {object} content - Content to post
   * @returns {Promise<object>} Post result
   */
  async postLink(page, content) {
    try {
      // Combine text and link with proper formatting
      const postText = content.text 
        ? `${content.text}\n\n${content.link}` 
        : content.link;

      // Validate combined length
      if (postText.length > this.maxTextLength) {
        return {
          success: false,
          error: `Combined text and link too long (${postText.length}/${this.maxTextLength} characters)`,
        };
      }

      // Wait for editor and type content
      await page.waitForSelector('.ql-editor', { timeout: 10000 });
      await this.typeText(page, '.ql-editor', postText);

      // Wait for link preview to load
      await page.waitForTimeout(5000);

      // Click the Post button
      await this.clickElement(page, '[data-control-name="share.post"]');

      // Wait for the post to be published
      const posted = await this.waitForPostToLoad(page);
      if (!posted) {
        return {
          success: false,
          error: 'Post publishing timed out',
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
        error: `Failed to post link: ${error.message}`,
      };
    }
  }

  /**
   * Extract post ID from LinkedIn URL
   * @param {string} url - LinkedIn post URL
   * @returns {string|null} Post ID or null if not found
   */
  extractPostId(url) {
    // LinkedIn URLs look like: https://www.linkedin.com/feed/update/urn:li:activity:1234567890123456789/
    const match = url.match(/urn:li:activity:(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Wait for post to be published and URL to change
   * @param {Page} page - Puppeteer page instance
   * @param {number} [timeout=15000] - Timeout in milliseconds
   * @returns {Promise<boolean>} True if post was published
   */
  async waitForPostToLoad(page, timeout = 15000) {
    try {
      // Wait for URL to change to a post URL or for success indicator
      await Promise.race([
        // Wait for URL to contain activity ID
        page.waitForFunction(
          () => globalThis.window.location.href.includes('urn:li:activity:'),
          { timeout }
        ),
        // Or wait for success message/redirect to feed
        page.waitForFunction(
          () => globalThis.window.location.href.includes('/feed/') && !globalThis.window.location.href.includes('update'),
          { timeout }
        )
      ]);
      return true;
    } catch (error) {
      console.warn(`Post loading timed out: ${error.message}`);
      return false;
    }
  }

  /**
   * Login to LinkedIn platform
   * @param {object} [options] - Login options
   * @returns {Promise<boolean>} True if login successful
   */
  async login(_options = {}) {
    const page = await this.createPage(this.platformName);

    try {
      // Check if already logged in
      await page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
      
      if (await this.isLoggedIn(page)) {
        console.log('Already logged in to LinkedIn');
        await this.saveSession(page, this.platformName);
        return true;
      }

      // Navigate to login page
      await this.navigateToLogin(page);

      // For now, we'll wait for manual login
      console.log('Please log in manually in the browser...');
      console.log('Waiting for login to complete...');

      // Wait for user to complete login manually
      await page.waitForFunction(
        () => !globalThis.window.location.href.includes('/login') && !globalThis.window.location.href.includes('/uas/login'),
        { timeout: 300000 } // 5 minutes
      );

      // Verify login was successful
      const isLoggedIn = await this.isLoggedIn(page);
      if (isLoggedIn) {
        console.log('LinkedIn login completed successfully');
        await this.saveSession(page, this.platformName);
        return true;
      } else {
        console.error('LinkedIn login verification failed');
        return false;
      }
    } catch (error) {
      console.error(`LinkedIn login failed: ${error.message}`);
      return false;
    } finally {
      await page.close();
    }
  }

  /**
   * Post content to LinkedIn
   * @param {object} content - Content to post
   * @returns {Promise<object>} Post result
   */
  async post(content) {
    const page = await this.createPage(this.platformName);

    try {
      // Navigate to LinkedIn
      await page.goto(this.baseUrl, { waitUntil: 'networkidle2' });

      // Check if logged in
      if (!(await this.isLoggedIn(page))) {
        return {
          success: false,
          error: 'Authentication required. Please run "sp login linkedin" first.',
        };
      }

      // Navigate to compose
      await this.navigateToCompose(page);

      // Post based on content type
      let result;
      if (content.type === 'link' || content.link) {
        result = await this.postLink(page, content);
      } else {
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
        error: `Failed to post to LinkedIn: ${error.message}`,
      };
    } finally {
      await page.close();
    }
  }
}

// Export default instance
export const linkedInPlatform = new LinkedInPlatform();