/**
 * X.com (Twitter) Platform Implementation
 * Handles login and posting to X using Puppeteer
 */

import { BrowserAutomation } from '../browser-automation.js';

/**
 * X Platform class for handling X.com interactions
 */
export class XPlatform extends BrowserAutomation {
  constructor(options = {}) {
    super(options);
    this.platformName = 'x';
    this.baseUrl = 'https://x.com';
    this.loginUrl = 'https://x.com/i/flow/login';
    this.maxTextLength = 280;
  }

  /**
   * Check if user is logged in to X
   * @param {Page} page - Puppeteer page instance
   * @returns {Promise<boolean>} True if logged in
   */
  async isLoggedIn(page) {
    try {
      const currentUrl = page.url();
      
      // Check if we're on a login page
      if (currentUrl.includes('/login') || currentUrl.includes('/i/flow/login')) {
        return false;
      }

      // Look for elements that indicate we're logged in
      const accountSwitcher = await page.$('[data-testid="SideNav_AccountSwitcher_Button"]');
      const profileButton = await page.$('[data-testid="AppTabBar_Profile_Link"]');
      const homeTimeline = await page.$('[data-testid="primaryColumn"]');

      return !!(accountSwitcher || profileButton || homeTimeline);
    } catch (error) {
      console.warn(`Failed to check login status: ${error.message}`);
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
      console.log('Starting X.com login process...');

      // Wait for username input
      await page.waitForSelector('input[name="text"]', { timeout: 10000 });
      await this.typeText(page, 'input[name="text"]', credentials.username);

      // Click Next button
      await this.clickElement(page, '[role="button"]:has-text("Next")');

      // Handle potential phone/email verification step
      try {
        await page.waitForSelector('input[name="text"]', { timeout: 5000 });
        // If we see another text input, it might be asking for phone/email
        const inputValue = await page.$eval('input[name="text"]', el => el.value);
        if (!inputValue) {
          // Enter username again or phone number if required
          await this.typeText(page, 'input[name="text"]', credentials.username);
          await this.clickElement(page, '[role="button"]:has-text("Next")');
        }
      } catch {
        // No additional verification needed
      }

      // Wait for password input
      await page.waitForSelector('input[name="password"]', { timeout: 10000 });
      await this.typeText(page, 'input[name="password"]', credentials.password);

      // Click Log in button
      await this.clickElement(page, '[data-testid="LoginForm_Login_Button"]');

      // Handle 2FA if required
      if (credentials.twoFactorCode) {
        try {
          await page.waitForSelector('input[name="text"]', { timeout: 5000 });
          await this.typeText(page, 'input[name="text"]', credentials.twoFactorCode);
          await this.clickElement(page, '[role="button"]:has-text("Next")');
        } catch {
          // 2FA not required or already handled
        }
      }

      // Wait for successful login (redirect to home)
      await page.waitForNavigation({ timeout: 15000 });

      // Verify we're logged in
      const isLoggedIn = await this.isLoggedIn(page);
      if (isLoggedIn) {
        console.log('Successfully logged in to X.com');
        return true;
      } else {
        console.error('Login appeared to succeed but user is not logged in');
        return false;
      }
    } catch (error) {
      console.error(`X.com login failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Navigate to compose tweet dialog
   * @param {Page} page - Puppeteer page instance
   */
  async navigateToCompose(page) {
    try {
      // Look for the compose button (Tweet button)
      const composeButton = await page.waitForSelector('[data-testid="SideNav_NewTweet_Button"]', {
        timeout: 10000,
      });

      if (!composeButton) {
        throw new Error('Compose button not found');
      }

      await composeButton.click();

      // Wait for compose dialog to open
      await page.waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 10000 });
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

      // Wait for textarea and type content
      await page.waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 10000 });
      await this.typeText(page, '[data-testid="tweetTextarea_0"]', content.text);

      // Wait a moment for the tweet button to become enabled
      await page.waitForTimeout(1000);

      // Click the Tweet button
      await this.clickElement(page, '[data-testid="tweetButtonInline"]');

      // Wait for the tweet to be posted (URL should change)
      const posted = await this.waitForPostToLoad(page);
      if (!posted) {
        return {
          success: false,
          error: 'Tweet posting timed out',
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
      // Combine text and link
      const tweetText = content.text ? `${content.text} ${content.link}` : content.link;

      // Validate combined length
      if (tweetText.length > this.maxTextLength) {
        return {
          success: false,
          error: `Combined text and link too long (${tweetText.length}/${this.maxTextLength} characters)`,
        };
      }

      // Wait for textarea and type content
      await page.waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 10000 });
      await this.typeText(page, '[data-testid="tweetTextarea_0"]', tweetText);

      // Wait for link preview to load (optional)
      await page.waitForTimeout(3000);

      // Click the Tweet button
      await this.clickElement(page, '[data-testid="tweetButtonInline"]');

      // Wait for the tweet to be posted
      const posted = await this.waitForPostToLoad(page);
      if (!posted) {
        return {
          success: false,
          error: 'Tweet posting timed out',
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
   * Extract post ID from X.com URL
   * @param {string} url - X.com post URL
   * @returns {string|null} Post ID or null if not found
   */
  extractPostId(url) {
    const match = url.match(/\/status\/(\d+)/);
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
      // Wait for URL to change to a status URL
      await page.waitForFunction(
        () => window.location.href.includes('/status/'),
        { timeout }
      );
      return true;
    } catch (error) {
      console.warn(`Post loading timed out: ${error.message}`);
      return false;
    }
  }

  /**
   * Login to X.com platform
   * @param {object} [options] - Login options
   * @returns {Promise<boolean>} True if login successful
   */
  async login(options = {}) {
    const page = await this.createPage(this.platformName);

    try {
      // Check if already logged in
      await page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
      
      if (await this.isLoggedIn(page)) {
        console.log('Already logged in to X.com');
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
        () => !window.location.href.includes('/login') && !window.location.href.includes('/i/flow/login'),
        { timeout: 300000 } // 5 minutes
      );

      // Verify login was successful
      const isLoggedIn = await this.isLoggedIn(page);
      if (isLoggedIn) {
        console.log('Login completed successfully');
        await this.saveSession(page, this.platformName);
        return true;
      } else {
        console.error('Login verification failed');
        return false;
      }
    } catch (error) {
      console.error(`X.com login failed: ${error.message}`);
      return false;
    } finally {
      await page.close();
    }
  }

  /**
   * Post content to X.com
   * @param {object} content - Content to post
   * @returns {Promise<object>} Post result
   */
  async post(content) {
    const page = await this.createPage(this.platformName);

    try {
      // Navigate to X.com
      await page.goto(this.baseUrl, { waitUntil: 'networkidle2' });

      // Check if logged in
      if (!(await this.isLoggedIn(page))) {
        return {
          success: false,
          error: 'Authentication required. Please run "sp login x" first.',
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
        error: `Failed to post to X.com: ${error.message}`,
      };
    } finally {
      await page.close();
    }
  }
}

// Export default instance
export const xPlatform = new XPlatform();