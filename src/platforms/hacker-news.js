/**
 * Hacker News Platform Implementation
 * Handles authentication and posting to Hacker News using Puppeteer
 */

export class HackerNewsPlatform {
  constructor(options = {}) {
    this.options = {
      headless: true,
      timeout: 30000,
      ...options,
    };
    this.name = 'hacker-news';
    this.displayName = 'Hacker News';
    this.baseUrl = 'https://news.ycombinator.com';
    this.maxTextLength = 8000; // Hacker News text limit (estimated)
    this.maxTitleLength = 80; // Hacker News title limit
  }

  /**
   * Check if user is logged in to Hacker News
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

      // Look for user link in the top bar
      const userElement = await page.$('a[href^="user?id="]');
      
      return userElement !== null;
    } catch (error) {
      console.log('Error checking Hacker News login status:', error.message);
      return false;
    }
  }

  /**
   * Navigate to Hacker News login page
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
   * @param {string} credentials.username - Hacker News username
   * @param {string} credentials.password - Hacker News password
   */
  async performLogin(page, credentials) {
    try {
      console.log('Starting Hacker News login process...');

      // Wait for login form elements
      await page.waitForSelector('input[name="acct"]', { timeout: this.options.timeout });
      await page.waitForSelector('input[name="pw"]', { timeout: this.options.timeout });

      // Fill in credentials
      await page.type('input[name="acct"]', credentials.username);
      await page.type('input[name="pw"]', credentials.password);

      // Submit the form
      await page.click('input[type="submit"]');

      // Wait for navigation after login
      await page.waitForNavigation({ 
        waitUntil: 'networkidle2',
        timeout: this.options.timeout 
      });

      console.log('Hacker News login completed');
    } catch (error) {
      throw new Error(`Hacker News login failed: ${error.message}`);
    }
  }

  /**
   * Navigate to Hacker News submit page
   * @param {Page} page - Puppeteer page instance
   */
  async navigateToSubmit(page) {
    await page.goto(`${this.baseUrl}/submit`, {
      waitUntil: 'networkidle2',
      timeout: this.options.timeout,
    });
  }

  /**
   * Post link content to Hacker News
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
      await page.click('input[type="submit"]');

    } catch (error) {
      throw new Error(`Failed to post to Hacker News: ${error.message}`);
    }
  }

  /**
   * Post text content to Hacker News (Ask HN)
   * @param {Page} page - Puppeteer page instance
   * @param {Object} content - Post content
   * @param {string} content.text - Post text
   * @param {string} content.title - Post title
   */
  async postText(page, content) {
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

      // Fill in title (usually starts with "Ask HN:")
      const title = content.title || `Ask HN: ${content.text.substring(0, 50)}...`;
      await page.type('input[name="title"]', title);

      // Fill in text content
      if (content.text) {
        await page.waitForSelector('textarea[name="text"]', { timeout: this.options.timeout });
        await page.type('textarea[name="text"]', content.text);
      }

      // Submit the post
      await page.click('input[type="submit"]');

    } catch (error) {
      throw new Error(`Failed to post to Hacker News: ${error.message}`);
    }
  }

  /**
   * Extract post ID from Hacker News URL
   * @param {string} url - Hacker News post URL
   * @returns {string|null} - Post ID or null if not found
   */
  extractPostId(url) {
    const match = url.match(/[?&]id=(\d+)/);
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
      await page.waitForSelector('.athing, .storylink', {
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
   * @param {string} content.text - Post text (for Ask HN posts)
   * @param {string} content.link - URL (for link posts)
   * @param {string} content.title - Post title (required)
   * @param {string} content.type - Post type ('text' or 'link')
   * @returns {Promise<Object>} - Post result
   */
  async post(page, content) {
    try {
      // Check if logged in
      const loggedIn = await this.isLoggedIn(page);
      if (!loggedIn) {
        return {
          success: false,
          error: 'Hacker News authentication required. Please run "sp login hacker-news" first.',
          platform: this.name,
        };
      }

      // Validate required fields
      if (!content.title && !content.link) {
        return {
          success: false,
          error: 'Title is required for Hacker News posts',
          platform: this.name,
        };
      }

      // Navigate to submit page
      await this.navigateToSubmit(page);

      // Post based on type
      if (content.type === 'text' || (content.text && !content.link)) {
        await this.postText(page, content);
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
        message: 'Successfully posted to Hacker News',
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
        text: true, // Ask HN posts
        links: true,
        images: false,
        videos: false,
        scheduling: false,
      },
      limits: {
        textLength: this.maxTextLength,
        titleLength: this.maxTitleLength,
      },
      required: ['title'],
      optional: ['text', 'link'],
      notes: [
        'Title is required for all posts',
        'Text posts are typically "Ask HN" style questions',
        'Link posts should be high-quality, relevant content',
        'Community guidelines are strictly enforced',
        'Duplicate submissions are not allowed',
      ],
    };
  }
}

export default HackerNewsPlatform;