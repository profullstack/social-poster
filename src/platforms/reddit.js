/**
 * Reddit Platform Implementation
 * Handles authentication and posting to Reddit using Puppeteer
 */

import { BrowserAutomation } from '../browser-automation.js';

/**
 * Reddit Platform class for handling Reddit interactions
 */
export class RedditPlatform extends BrowserAutomation {
  constructor(options = {}) {
    super(options);
    this.platformName = 'reddit';
    this.baseUrl = 'https://www.reddit.com';
    this.loginUrl = 'https://www.reddit.com/login';
    this.maxTextLength = 40000; // Reddit's character limit for text posts
    this.maxTitleLength = 300; // Reddit's title character limit
  }

  /**
   * Check if user is logged in to Reddit
   * @param {Page} page - Puppeteer page instance
   * @returns {Promise<boolean>} - True if logged in
   */
  async isLoggedIn(page) {
    try {
      const currentUrl = page.url();
      
      // If we're on the login page, we're not logged in
      if (currentUrl.includes('/login')) {
        return false;
      }

      // Look for user dropdown or profile indicator
      const userElement = await page.$('[data-testid="user-dropdown-button"], .header-user-dropdown, [id*="USER_DROPDOWN"]');
      
      return userElement !== null;
    } catch (error) {
      console.log('Error checking Reddit login status:', error.message);
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
      console.log('Starting Reddit login process...');

      // Wait for login form elements
      await page.waitForSelector('#loginUsername', { timeout: 10000 });
      await this.typeText(page, '#loginUsername', credentials.username);

      await page.waitForSelector('#loginPassword', { timeout: 10000 });
      await this.typeText(page, '#loginPassword', credentials.password);

      // Submit the form
      await this.clickElement(page, 'button[type="submit"]');

      // Wait for navigation after login
      await page.waitForNavigation({
        waitUntil: 'networkidle2',
        timeout: 15000
      });

      // Verify we're logged in
      const isLoggedIn = await this.isLoggedIn(page);
      if (isLoggedIn) {
        console.log('Successfully logged in to Reddit');
        return true;
      } else {
        console.error('Login appeared to succeed but user is not logged in');
        return false;
      }
    } catch (error) {
      console.error(`Reddit login failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Navigate to Reddit submit page
   * @param {Page} page - Puppeteer page instance
   * @param {string} subreddit - Optional subreddit name
   */
  async navigateToSubmit(page, subreddit = null) {
    const submitUrl = subreddit
      ? `${this.baseUrl}/r/${subreddit}/submit`
      : `${this.baseUrl}/submit`;

    await page.goto(submitUrl, { waitUntil: 'networkidle2' });
  }

  /**
   * Post text content to Reddit
   * @param {Page} page - Puppeteer page instance
   * @param {object} content - Post content
   * @returns {Promise<object>} Post result
   */
  async postText(page, content) {
    try {
      // Validate content length
      if (content.text && content.text.length > this.maxTextLength) {
        return {
          success: false,
          error: `Text is too long (${content.text.length}/${this.maxTextLength} characters)`,
        };
      }

      if (content.title && content.title.length > this.maxTitleLength) {
        return {
          success: false,
          error: `Title is too long (${content.title.length}/${this.maxTitleLength} characters)`,
        };
      }

      // Wait for submit form
      await page.waitForSelector('[name="title"]', { timeout: 10000 });

      // Select text post type if available
      const textPostButton = await page.$('[data-name="post"]');
      if (textPostButton) {
        await this.clickElement(page, '[data-name="post"]');
      }

      // Fill in title
      await this.typeText(page, '[name="title"]', content.title || 'Untitled Post');

      // Fill in text content if available
      const textArea = await page.$('textarea[name="text"], .public-DraftEditor-content, [data-testid="textbox"]');
      if (textArea && content.text) {
        await page.evaluate((text) => {
          const textElement = globalThis.document.querySelector('textarea[name="text"], .public-DraftEditor-content, [data-testid="textbox"]');
          if (textElement) {
            if (textElement.tagName === 'TEXTAREA') {
              textElement.value = text;
              textElement.dispatchEvent(new Event('input', { bubbles: true }));
            } else {
              textElement.textContent = text;
              textElement.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }
        }, content.text);
      }

      // Submit the post
      await this.clickElement(page, 'button[type="submit"], [data-testid="submit-button"], .submit');

      // Wait for post to load
      const posted = await this.waitForPostToLoad(page);
      if (!posted) {
        return {
          success: false,
          error: 'Post submission timed out',
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
   * Post link content to Reddit
   * @param {Page} page - Puppeteer page instance
   * @param {object} content - Post content
   * @returns {Promise<object>} Post result
   */
  async postLink(page, content) {
    try {
      // Wait for submit form
      await page.waitForSelector('[name="title"]', { timeout: 10000 });

      // Select link post type
      const linkPostButton = await page.$('[data-name="link"]');
      if (linkPostButton) {
        await this.clickElement(page, '[data-name="link"]');
      }

      // Fill in title
      const title = content.title || content.link;
      await this.typeText(page, '[name="title"]', title);

      // Fill in URL
      await page.waitForSelector('[name="url"]', { timeout: 10000 });
      await this.typeText(page, '[name="url"]', content.link);

      // Submit the post
      await this.clickElement(page, 'button[type="submit"], [data-testid="submit-button"], .submit');

      // Wait for post to load
      const posted = await this.waitForPostToLoad(page);
      if (!posted) {
        return {
          success: false,
          error: 'Post submission timed out',
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
   * Extract post ID from Reddit URL
   * @param {string} url - Reddit post URL
   * @returns {string|null} - Post ID or null if not found
   */
  extractPostId(url) {
    const match = url.match(/\/comments\/([a-zA-Z0-9]+)\//);
    return match ? match[1] : null;
  }

  /**
   * Wait for post to load after submission
   * @param {Page} page - Puppeteer page instance
   * @param {number} [timeout=15000] - Timeout in milliseconds
   * @returns {Promise<boolean>} True if post loaded successfully
   */
  async waitForPostToLoad(page, timeout = 15000) {
    try {
      // Wait for URL to change to a post URL or for success indicator
      await Promise.race([
        // Wait for URL to contain comments (indicating successful post)
        page.waitForFunction(
          () => globalThis.window.location.href.includes('/comments/'),
          { timeout }
        ),
        // Or wait for post content to appear
        page.waitForSelector('.Post, [data-testid="post-content"], .thing', { timeout })
      ]);
      return true;
    } catch (error) {
      console.warn(`Post loading timed out: ${error.message}`);
      return false;
    }
  }

  /**
   * Login to Reddit platform
   * @param {object} [options] - Login options
   * @returns {Promise<boolean>} True if login successful
   */
  async login(_options = {}) {
    const page = await this.createPage(this.platformName);

    try {
      // Check if already logged in
      await page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
      
      if (await this.isLoggedIn(page)) {
        console.log('Already logged in to Reddit');
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
        () => !globalThis.window.location.href.includes('/login'),
        { timeout: 300000 } // 5 minutes
      );

      // Verify login was successful
      const isLoggedIn = await this.isLoggedIn(page);
      if (isLoggedIn) {
        console.log('Reddit login completed successfully');
        await this.saveSession(page, this.platformName);
        return true;
      } else {
        console.error('Reddit login verification failed');
        return false;
      }
    } catch (error) {
      console.error(`Reddit login failed: ${error.message}`);
      return false;
    } finally {
      await page.close();
    }
  }

  /**
   * Post content to Reddit
   * @param {object} content - Content to post
   * @returns {Promise<object>} Post result
   */
  async post(content) {
    const page = await this.createPage(this.platformName);

    try {
      // Navigate to Reddit
      await page.goto(this.baseUrl, { waitUntil: 'networkidle2' });

      // Check if logged in
      if (!(await this.isLoggedIn(page))) {
        return {
          success: false,
          error: 'Authentication required. Please run "sp login reddit" first.',
        };
      }

      // Navigate to submit page
      await this.navigateToSubmit(page, content.subreddit);

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
        error: `Failed to post to Reddit: ${error.message}`,
      };
    } finally {
      await page.close();
    }
  }

}

// Export default instance
export const redditPlatform = new RedditPlatform();