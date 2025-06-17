/**
 * Reddit Platform Implementation
 * Handles authentication and posting to Reddit using Puppeteer
 */

export class RedditPlatform {
  constructor(options = {}) {
    this.options = {
      headless: true,
      timeout: 30000,
      ...options,
    };
    this.name = 'reddit';
    this.displayName = 'Reddit';
    this.baseUrl = 'https://www.reddit.com';
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
   * Navigate to Reddit login page
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
   * @param {string} credentials.username - Reddit username
   * @param {string} credentials.password - Reddit password
   */
  async performLogin(page, credentials) {
    try {
      console.log('Starting Reddit login process...');

      // Wait for login form elements
      await page.waitForSelector('#loginUsername', { timeout: this.options.timeout });
      await page.waitForSelector('#loginPassword', { timeout: this.options.timeout });

      // Fill in credentials
      await page.type('#loginUsername', credentials.username);
      await page.type('#loginPassword', credentials.password);

      // Submit the form
      await page.click('button[type="submit"]');

      // Wait for navigation after login
      await page.waitForNavigation({ 
        waitUntil: 'networkidle2',
        timeout: this.options.timeout 
      });

      console.log('Reddit login completed');
    } catch (error) {
      throw new Error(`Reddit login failed: ${error.message}`);
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

    await page.goto(submitUrl, {
      waitUntil: 'networkidle2',
      timeout: this.options.timeout,
    });
  }

  /**
   * Post text content to Reddit
   * @param {Page} page - Puppeteer page instance
   * @param {Object} content - Post content
   * @param {string} content.text - Post text
   * @param {string} content.title - Post title
   * @param {string} content.subreddit - Target subreddit
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
      await page.waitForSelector('[name="title"]', { timeout: this.options.timeout });

      // Select text post type if available
      const textPostButton = await page.$('[data-name="post"]');
      if (textPostButton) {
        await page.click('[data-name="post"]');
      }

      // Fill in title
      await page.type('[name="title"]', content.title || 'Untitled Post');

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
      const submitButton = await page.$('button[type="submit"], [data-testid="submit-button"], .submit');
      if (submitButton) {
        await submitButton.click();
      }

    } catch (error) {
      throw new Error(`Failed to post to Reddit: ${error.message}`);
    }
  }

  /**
   * Post link content to Reddit
   * @param {Page} page - Puppeteer page instance
   * @param {Object} content - Post content
   * @param {string} content.link - URL to post
   * @param {string} content.title - Post title
   * @param {string} content.subreddit - Target subreddit
   */
  async postLink(page, content) {
    try {
      // Wait for submit form
      await page.waitForSelector('[name="title"]', { timeout: this.options.timeout });

      // Select link post type
      const linkPostButton = await page.$('[data-name="link"]');
      if (linkPostButton) {
        await page.click('[data-name="link"]');
      }

      // Fill in title
      const title = content.title || content.link;
      await page.type('[name="title"]', title);

      // Fill in URL
      await page.waitForSelector('[name="url"]', { timeout: this.options.timeout });
      await page.type('[name="url"]', content.link);

      // Submit the post
      const submitButton = await page.$('button[type="submit"], [data-testid="submit-button"], .submit');
      if (submitButton) {
        await submitButton.click();
      }

    } catch (error) {
      throw new Error(`Failed to post link to Reddit: ${error.message}`);
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
   * @returns {Promise<boolean>} - True if post loaded successfully
   */
  async waitForPostToLoad(page) {
    try {
      // Wait for post content to appear
      await page.waitForSelector('.Post, [data-testid="post-content"], .thing', {
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
   * @param {string} content.text - Post text (for text posts)
   * @param {string} content.link - URL (for link posts)
   * @param {string} content.title - Post title
   * @param {string} content.subreddit - Target subreddit
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
          error: 'Reddit authentication required. Please run "sp login reddit" first.',
          platform: this.name,
        };
      }

      // Navigate to submit page
      await this.navigateToSubmit(page, content.subreddit);

      // Post based on type
      if (content.type === 'link' || content.link) {
        await this.postLink(page, content);
      } else {
        await this.postText(page, content);
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
        message: `Successfully posted to Reddit${content.subreddit ? ` in r/${content.subreddit}` : ''}`,
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
        text: true,
        links: true,
        images: false, // Not implemented yet
        videos: false, // Not implemented yet
        scheduling: false,
      },
      limits: {
        textLength: this.maxTextLength,
        titleLength: this.maxTitleLength,
      },
      required: ['title'],
      optional: ['text', 'link', 'subreddit'],
      notes: [
        'Requires subreddit selection for posting',
        'Title is required for all posts',
        'Text posts support markdown formatting',
        'Link posts will auto-generate title if not provided',
      ],
    };
  }
}

export default RedditPlatform;