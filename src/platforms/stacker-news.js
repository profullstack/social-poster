/**
 * Stacker News Platform Implementation
 * Handles authentication and posting to Stacker News using Puppeteer
 * Stacker News is a Bitcoin-focused social platform with Lightning Network integration
 */

export class StackerNewsPlatform {
  constructor(options = {}) {
    this.options = {
      headless: true,
      timeout: 30000,
      ...options,
    };
    this.name = 'stacker-news';
    this.displayName = 'Stacker News';
    this.baseUrl = 'https://stacker.news';
    this.maxTextLength = 50000; // Stacker News text limit (estimated)
    this.maxTitleLength = 80; // Title character limit
  }

  /**
   * Check if user is logged in to Stacker News
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

      // Look for user avatar or profile indicator
      const userElement = await page.$('[data-testid="user-avatar"], .user-avatar, .nav-link[href*="/settings"]');
      
      return userElement !== null;
    } catch (error) {
      console.log('Error checking Stacker News login status:', error.message);
      return false;
    }
  }

  /**
   * Navigate to Stacker News login page
   * @param {Page} page - Puppeteer page instance
   */
  async navigateToLogin(page) {
    await page.goto(`${this.baseUrl}/login`, {
      waitUntil: 'networkidle2',
      timeout: this.options.timeout,
    });
  }

  /**
   * Perform login with credentials
   * @param {Page} page - Puppeteer page instance
   * @param {Object} credentials - Login credentials
   * @param {string} credentials.method - Login method ('lightning', 'email', 'github')
   * @param {string} credentials.email - Email (for email login)
   * @param {string} credentials.password - Password (for email login)
   */
  async performLogin(page, credentials) {
    try {
      if (credentials.method === 'lightning') {
        console.log('Starting Stacker News Lightning login process...');
        
        // Click Lightning login button
        await page.waitForSelector('[data-testid="lightning-login"], .lightning-login', { timeout: this.options.timeout });
        await page.click('[data-testid="lightning-login"], .lightning-login');
        
        // Note: Lightning login requires external wallet interaction
        console.log('Lightning login initiated. Please complete authentication in your Lightning wallet.');
        
      } else if (credentials.method === 'email') {
        console.log('Starting Stacker News email login process...');
        
        // Wait for email/password form
        await page.waitForSelector('input[type="email"]', { timeout: this.options.timeout });
        await page.waitForSelector('input[type="password"]', { timeout: this.options.timeout });
        
        // Fill in credentials
        await page.type('input[type="email"]', credentials.email);
        await page.type('input[type="password"]', credentials.password);
        
        // Submit the form
        await page.click('button[type="submit"]');
        
        // Wait for navigation after login
        await page.waitForNavigation({ 
          waitUntil: 'networkidle2',
          timeout: this.options.timeout 
        });
        
      } else if (credentials.method === 'github') {
        console.log('Starting Stacker News GitHub login process...');
        
        // Click GitHub login button
        await page.waitForSelector('[data-testid="github-login"], .github-login', { timeout: this.options.timeout });
        await page.click('[data-testid="github-login"], .github-login');
        
        // Note: GitHub login will redirect to GitHub OAuth
        console.log('GitHub login initiated. Please complete OAuth flow.');
      }

      console.log('Stacker News login completed');
    } catch (error) {
      throw new Error(`Stacker News login failed: ${error.message}`);
    }
  }

  /**
   * Navigate to Stacker News submit page
   * @param {Page} page - Puppeteer page instance
   * @param {string} type - Post type ('link' or 'discussion')
   */
  async navigateToSubmit(page, type = 'link') {
    const submitUrl = type === 'discussion' 
      ? `${this.baseUrl}/post?type=discussion`
      : `${this.baseUrl}/post`;

    await page.goto(submitUrl, {
      waitUntil: 'networkidle2',
      timeout: this.options.timeout,
    });
  }

  /**
   * Post link content to Stacker News
   * @param {Page} page - Puppeteer page instance
   * @param {Object} content - Post content
   * @param {string} content.link - URL to post
   * @param {string} content.title - Post title
   */
  async postLink(page, content) {
    try {
      // Wait for submit form
      await page.waitForSelector('input[name="title"]', { timeout: this.options.timeout });
      await page.waitForSelector('input[name="url"]', { timeout: this.options.timeout });

      // Fill in title
      const title = content.title || content.link;
      await page.type('input[name="title"]', title);

      // Fill in URL
      await page.type('input[name="url"]', content.link);

      // Submit the post
      await page.click('button[type="submit"]');

    } catch (error) {
      throw new Error(`Failed to post to Stacker News: ${error.message}`);
    }
  }

  /**
   * Post discussion content to Stacker News
   * @param {Page} page - Puppeteer page instance
   * @param {Object} content - Post content
   * @param {string} content.text - Post text
   * @param {string} content.title - Post title
   */
  async postDiscussion(page, content) {
    try {
      // Validate content length
      if (content.text && content.text.length > this.maxTextLength) {
        throw new Error(`Text is too long. Maximum ${this.maxTextLength} characters allowed.`);
      }

      if (content.title && content.title.length > this.maxTitleLength) {
        throw new Error(`Title is too long. Maximum ${this.maxTitleLength} characters allowed.`);
      }

      // Wait for submit form
      await page.waitForSelector('input[name="title"]', { timeout: this.options.timeout });

      // Fill in title
      await page.type('input[name="title"]', content.title);

      // Fill in text content if available
      if (content.text) {
        const textArea = await page.$('textarea[name="text"], .markdown-editor textarea, [data-testid="text-input"]');
        if (textArea) {
          await page.evaluate((text) => {
            const textElement = globalThis.document.querySelector('textarea[name="text"], .markdown-editor textarea, [data-testid="text-input"]');
            if (textElement) {
              textElement.value = text;
              textElement.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }, content.text);
        }
      }

      // Submit the post
      await page.click('button[type="submit"]');

    } catch (error) {
      throw new Error(`Failed to post to Stacker News: ${error.message}`);
    }
  }

  /**
   * Extract post ID from Stacker News URL
   * @param {string} url - Stacker News post URL
   * @returns {string|null} - Post ID or null if not found
   */
  extractPostId(url) {
    const match = url.match(/\/items\/(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Wait for post to load after submission
   * @param {Page} page - Puppeteer page instance
   * @returns {Promise<boolean>} - True if post loaded successfully
   */
  async waitForPostToLoad(page) {
    try {
      // Wait for post content to appear
      await page.waitForSelector('.item, [data-testid="item"]', {
        timeout: this.options.timeout,
      });
      return true;
    } catch (error) {
      console.log('Post loading timed out:', error.message);
      return false;
    }
  }

  /**
   * Main posting method
   * @param {Page} page - Puppeteer page instance
   * @param {Object} content - Post content
   * @param {string} content.text - Post text (for discussions)
   * @param {string} content.link - URL (for link posts)
   * @param {string} content.title - Post title (required)
   * @param {string} content.type - Post type ('link' or 'discussion')
   * @returns {Promise<Object>} - Post result
   */
  async post(page, content) {
    try {
      // Check if logged in
      const loggedIn = await this.isLoggedIn(page);
      if (!loggedIn) {
        return {
          success: false,
          error: 'Stacker News authentication required. Please run "sp login stacker-news" first.',
          platform: this.name,
        };
      }

      // Validate required fields
      if (!content.title) {
        return {
          success: false,
          error: 'Title is required for Stacker News posts',
          platform: this.name,
        };
      }

      // Determine post type
      const postType = content.type || (content.link ? 'link' : 'discussion');

      // Navigate to submit page
      await this.navigateToSubmit(page, postType);

      // Post based on type
      if (postType === 'discussion' || (content.text && !content.link)) {
        await this.postDiscussion(page, content);
      } else if (content.link) {
        await this.postLink(page, content);
      } else {
        return {
          success: false,
          error: 'Either text or link content is required',
          platform: this.name,
        };
      }

      // Wait for post to load
      const postLoaded = await this.waitForPostToLoad(page);
      if (!postLoaded) {
        return {
          success: false,
          error: 'Post submission timed out',
          platform: this.name,
        };
      }

      // Extract post ID from URL
      const currentUrl = page.url();
      const postId = this.extractPostId(currentUrl);

      return {
        success: true,
        postId,
        url: currentUrl,
        platform: this.name,
        message: `Successfully posted to Stacker News as ${postType}`,
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        platform: this.name,
      };
    }
  }

  /**
   * Get platform-specific posting requirements
   * @returns {Object} - Platform requirements and limits
   */
  getRequirements() {
    return {
      name: this.name,
      displayName: this.displayName,
      authType: 'browser',
      supports: {
        text: true, // Discussion posts
        links: true,
        images: false, // Not directly supported
        videos: false, // Not directly supported
        scheduling: false,
        lightning: true, // Lightning Network integration
      },
      limits: {
        textLength: this.maxTextLength,
        titleLength: this.maxTitleLength,
      },
      required: ['title'],
      optional: ['text', 'link'],
      notes: [
        'Bitcoin and Lightning Network focused community',
        'Quality content is rewarded with Bitcoin sats',
        'Title is required for all posts',
        'Link posts and discussion posts are supported',
        'Lightning wallet integration available for login',
        'Supports markdown formatting in discussions',
      ],
    };
  }
}

export default StackerNewsPlatform;