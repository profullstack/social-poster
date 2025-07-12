/**
 * Pinterest Platform Implementation
 * Handles login and posting to Pinterest using Puppeteer
 */

import { BrowserAutomation } from '../browser-automation.js';

/**
 * Pinterest Platform class for handling Pinterest interactions
 */
export class PinterestPlatform extends BrowserAutomation {
  constructor(options = {}) {
    super(options);
    this.platformName = 'pinterest';
    this.baseUrl = 'https://www.pinterest.com';
    this.loginUrl = 'https://www.pinterest.com/login';
    this.createUrl = 'https://www.pinterest.com/pin-creation-tool';
    this.maxTextLength = 500;
  }

  /**
   * Check if user is logged in to Pinterest
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
      const profileButton = await page.$('[data-test-id="header-profile"]');
      const userAvatar = await page.$('[data-test-id="user-avatar"]');
      const createButton = await page.$('[data-test-id="create-pin-button"]');

      return !!(profileButton || userAvatar || createButton);
    } catch (error) {
      console.warn(`Failed to check Pinterest login status: ${error.message}`);
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
   * Navigate to pin creation page
   * @param {Page} page - Puppeteer page instance
   */
  async navigateToCreate(page) {
    await page.goto(this.createUrl, { waitUntil: 'networkidle2' });
  }

  /**
   * Post a pin with image or URL
   * @param {Page} page - Puppeteer page instance
   * @param {object} content - Content to post
   * @returns {Promise<object>} Post result
   */
  async postPin(page, content) {
    try {
      // Validate text length
      if (content.text && content.text.length > this.maxTextLength) {
        return {
          success: false,
          error: `Text is too long (${content.text.length}/${this.maxTextLength} characters)`,
        };
      }

      // Pinterest requires either an image file or a URL
      if (!content.imagePath && !content.link) {
        return {
          success: false,
          error: 'Either imagePath or link is required for Pinterest pins',
        };
      }

      // Handle image upload
      if (content.imagePath) {
        // Wait for file input and upload image
        const fileInput = await page.waitForSelector('input[type="file"]', { timeout: 10000 });
        await fileInput.uploadFile(content.imagePath);
        
        // Wait for image to process
        await page.waitForTimeout(3000);
      }

      // Handle URL input
      if (content.link) {
        // Wait for URL input field
        await page.waitForSelector('[data-test-id="pin-draft-link-url"]', { timeout: 10000 });
        await this.typeText(page, '[data-test-id="pin-draft-link-url"]', content.link);
        
        // Wait for URL to be processed
        await page.waitForTimeout(3000);
      }

      // Add title/description if provided
      if (content.text) {
        // Try different selectors for the description field
        const descriptionSelectors = [
          '[data-test-id="pin-draft-description"]',
          '[data-test-id="description-text-area"]',
          'textarea[placeholder*="description"]',
          'textarea[placeholder*="Tell everyone what your Pin is about"]'
        ];

        let descriptionField = null;
        for (const selector of descriptionSelectors) {
          try {
            descriptionField = await page.waitForSelector(selector, { timeout: 2000 });
            if (descriptionField) break;
          } catch {
            // Try next selector
          }
        }

        if (descriptionField) {
          await this.typeText(page, descriptionSelectors.find(async (sel) => await page.$(sel)), content.text);
        }
      }

      // Add board selection (use default board for now)
      try {
        const boardSelector = await page.waitForSelector('[data-test-id="board-dropdown"]', { timeout: 5000 });
        if (boardSelector) {
          await boardSelector.click();
          // Select first available board
          await page.waitForTimeout(1000);
          const firstBoard = await page.$('[data-test-id="board-row"]');
          if (firstBoard) {
            await firstBoard.click();
          }
        }
      } catch {
        // Board selection is optional, continue without it
      }

      // Wait for publish button to be enabled
      await page.waitForTimeout(2000);

      // Click the Publish button
      const publishSelectors = [
        '[data-test-id="board-dropdown-save-button"]',
        '[data-test-id="pin-draft-save-button"]',
        'button[data-test-id*="save"]',
        'button:has-text("Publish")',
        'button:has-text("Save")'
      ];

      let publishButton = null;
      for (const selector of publishSelectors) {
        try {
          publishButton = await page.waitForSelector(selector, { timeout: 2000 });
          if (publishButton) {
            await publishButton.click();
            break;
          }
        } catch {
          // Try next selector
        }
      }

      if (!publishButton) {
        return {
          success: false,
          error: 'Could not find publish button',
        };
      }

      // Wait for the pin to be published
      const posted = await this.waitForPostToLoad(page);
      if (!posted) {
        return {
          success: false,
          error: 'Pinterest posting timed out',
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
        error: `Failed to post pin: ${error.message}`,
      };
    }
  }

  /**
   * Extract post ID from Pinterest URL
   * @param {string} url - Pinterest pin URL
   * @returns {string|null} Post ID or null if not found
   */
  extractPostId(url) {
    const match = url.match(/\/pin\/(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Wait for pin to be published and URL to change
   * @param {Page} page - Puppeteer page instance
   * @param {number} [timeout=30000] - Timeout in milliseconds
   * @returns {Promise<boolean>} True if pin was published
   */
  async waitForPostToLoad(page, timeout = 30000) {
    try {
      // Wait for URL to change to a pin URL
      await page.waitForFunction(
        () => globalThis.window.location.href.includes('/pin/'),
        { timeout }
      );
      return true;
    } catch (error) {
      console.warn(`Pinterest pin loading timed out: ${error.message}`);
      return false;
    }
  }

  /**
   * Login to Pinterest platform
   * @param {object} [options] - Login options
   * @returns {Promise<boolean>} True if login successful
   */
  async login(_options = {}) {
    const page = await this.createPage(this.platformName);

    try {
      // Check if already logged in
      await page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
      
      if (await this.isLoggedIn(page)) {
        console.log('Already logged in to Pinterest');
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
        console.log('Pinterest login completed successfully');
        await this.saveSession(page, this.platformName);
        return true;
      } else {
        console.error('Pinterest login verification failed');
        return false;
      }
    } catch (error) {
      console.error(`Pinterest login failed: ${error.message}`);
      return false;
    } finally {
      await page.close();
    }
  }

  /**
   * Post content to Pinterest
   * @param {object} content - Content to post
   * @returns {Promise<object>} Post result
   */
  async post(content) {
    const page = await this.createPage(this.platformName);

    try {
      // Navigate to Pinterest
      await page.goto(this.baseUrl, { waitUntil: 'networkidle2' });

      // Check if logged in
      if (!(await this.isLoggedIn(page))) {
        return {
          success: false,
          error: 'Authentication required. Please run "sp login pinterest" first.',
        };
      }

      // Navigate to pin creation page
      await this.navigateToCreate(page);

      // Post the pin
      const result = await this.postPin(page, content);

      // Save session after successful interaction
      if (result.success) {
        await this.saveSession(page, this.platformName);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to post to Pinterest: ${error.message}`,
      };
    } finally {
      await page.close();
    }
  }
}

// Export default instance
export const pinterestPlatform = new PinterestPlatform();