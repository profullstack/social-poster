/**
 * Facebook Platform Implementation
 * Handles authentication and posting to Facebook using Puppeteer
 */

export class FacebookPlatform {
  constructor(options = {}) {
    this.options = {
      headless: true,
      timeout: 30000,
      ...options,
    };
    this.name = 'facebook';
    this.displayName = 'Facebook';
    this.baseUrl = 'https://www.facebook.com';
    this.maxTextLength = 63206; // Facebook's character limit
  }

  /**
   * Check if user is logged in to Facebook
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

      // Look for user profile or navigation elements that indicate login
      const userElement = await page.$('[data-testid="blue_bar_profile_link"], [aria-label="Account"], .account-switcher-button');
      
      return userElement !== null;
    } catch (error) {
      console.log('Error checking Facebook login status:', error.message);
      return false;
    }
  }

  /**
   * Navigate to Facebook login page
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
   * @param {string} credentials.email - Facebook email/username
   * @param {string} credentials.password - Facebook password
   */
  async performLogin(page, credentials) {
    try {
      console.log('Starting Facebook login process...');

      // Wait for login form elements
      await page.waitForSelector('#email', { timeout: this.options.timeout });
      await page.waitForSelector('#pass', { timeout: this.options.timeout });

      // Fill in credentials
      await page.type('#email', credentials.email);
      await page.type('#pass', credentials.password);

      // Submit the form
      await page.click('#loginbutton');

      // Wait for navigation after login
      await page.waitForNavigation({ 
        waitUntil: 'networkidle2',
        timeout: this.options.timeout 
      });

      console.log('Facebook login completed');
    } catch (error) {
      throw new Error(`Facebook login failed: ${error.message}`);
    }
  }

  /**
   * Navigate to Facebook home page
   * @param {Page} page - Puppeteer page instance
   */
  async navigateToHome(page) {
    await page.goto(`${this.baseUrl}/`, {
      waitUntil: 'networkidle2',
      timeout: this.options.timeout,
    });
  }

  /**
   * Post text content to Facebook
   * @param {Page} page - Puppeteer page instance
   * @param {Object} content - Post content
   * @param {string} content.text - Post text
   */
  async postText(page, content) {
    try {
      // Validate content length
      if (content.text && content.text.length > this.maxTextLength) {
        throw new Error(`Text is too long. Maximum ${this.maxTextLength} characters allowed.`);
      }

      // Wait for the status update box
      await page.waitForSelector('[data-testid="status-attachment-mentions-input"], [role="textbox"]', { 
        timeout: this.options.timeout 
      });

      // Click on the status update box to focus it
      await page.click('[data-testid="status-attachment-mentions-input"], [role="textbox"]');

      // Type the content
      await page.type('[data-testid="status-attachment-mentions-input"], [role="textbox"]', content.text);

      // Wait a moment for Facebook to process the content
      await page.waitForTimeout(1000);

      // Find and click the Post button
      const postButton = await page.$('[data-testid="react-composer-post-button"], [aria-label="Post"]');
      if (postButton) {
        await postButton.click();
      } else {
        // Fallback: try pressing Enter
        await page.keyboard.press('Enter');
      }

    } catch (error) {
      throw new Error(`Failed to post to Facebook: ${error.message}`);
    }
  }

  /**
   * Post link content to Facebook
   * @param {Page} page - Puppeteer page instance
   * @param {Object} content - Post content
   * @param {string} content.link - URL to post
   * @param {string} content.text - Optional text to accompany the link
   */
  async postLink(page, content) {
    try {
      // Wait for the status update box
      await page.waitForSelector('[data-testid="status-attachment-mentions-input"], [role="textbox"]', { 
        timeout: this.options.timeout 
      });

      // Click on the status update box to focus it
      await page.click('[data-testid="status-attachment-mentions-input"], [role="textbox"]');

      // Compose the post content
      const postContent = content.text 
        ? `${content.text}\n\n${content.link}`
        : content.link;

      // Type the content
      await page.type('[data-testid="status-attachment-mentions-input"], [role="textbox"]', postContent);

      // Wait for Facebook to process the link preview
      await page.waitForTimeout(3000);

      // Find and click the Post button
      const postButton = await page.$('[data-testid="react-composer-post-button"], [aria-label="Post"]');
      if (postButton) {
        await postButton.click();
      } else {
        // Fallback: try pressing Enter
        await page.keyboard.press('Enter');
      }

    } catch (error) {
      throw new Error(`Failed to post to Facebook: ${error.message}`);
    }
  }

  /**
   * Extract post ID from Facebook URL
   * @param {string} url - Facebook post URL
   * @returns {string|null} - Post ID or null if not found
   */
  extractPostId(url) {
    // Try different Facebook URL patterns
    let match = url.match(/\/posts\/(\d+)/);
    if (match) return match[1];

    match = url.match(/story_fbid=(\d+)/);
    if (match) return match[1];

    match = url.match(/\/permalink\/(\d+)/);
    if (match) return match[1];

    return null;
  }

  /**
   * Wait for post to load after submission
   * @param {Page} page - Puppeteer page instance
   * @returns {Promise<boolean>} - True if post loaded successfully
   */
  async waitForPostToLoad(page) {
    try {
      // Wait for post content to appear
      await page.waitForSelector('[data-testid="post_message"], .userContent', {
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
   * @param {string} content.text - Post text
   * @param {string} content.link - URL (for link posts)
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
          error: 'Facebook authentication required. Please run "sp login facebook" first.',
          platform: this.name,
        };
      }

      // Validate required fields
      if (!content.text && !content.link) {
        return {
          success: false,
          error: 'Text or link content is required for Facebook posts',
          platform: this.name,
        };
      }

      // Navigate to home page
      await this.navigateToHome(page);

      // Post based on type
      if (content.link) {
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
        message: 'Successfully posted to Facebook',
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
      },
      required: [],
      optional: ['text', 'link'],
      notes: [
        'Either text or link content is required',
        'Link posts will show preview automatically',
        'Facebook may require additional verification for new accounts',
        'Posts are subject to Facebook community standards',
        'Rate limiting may apply for frequent posting',
      ],
    };
  }
}

export default FacebookPlatform;