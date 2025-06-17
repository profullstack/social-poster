/**
 * Primal (Nostr) Platform Implementation
 * Handles authentication and posting to Primal/Nostr using private key authentication
 * Nostr is a decentralized social protocol, Primal is a popular client
 */

import { createHash, randomBytes } from 'crypto';

export class PrimalPlatform {
  constructor(options = {}) {
    this.options = {
      headless: true,
      timeout: 30000,
      ...options,
    };
    this.name = 'primal';
    this.displayName = 'Primal (Nostr)';
    this.baseUrl = 'https://primal.net';
    this.maxTextLength = 8000; // Nostr text limit (estimated)
  }

  /**
   * Generate a new Nostr key pair
   * @returns {Object} - Object with privateKey and publicKey
   */
  generateKeyPair() {
    const privateKey = randomBytes(32).toString('hex');
    const publicKey = this.getPublicKeyFromPrivate(privateKey);
    
    return {
      privateKey,
      publicKey,
    };
  }

  /**
   * Validate private key format
   * @param {string} privateKey - Private key to validate
   * @returns {boolean} - True if valid
   */
  validatePrivateKey(privateKey) {
    if (!privateKey || typeof privateKey !== 'string') {
      return false;
    }
    
    // Should be 64 hex characters (32 bytes)
    return /^[a-fA-F0-9]{64}$/.test(privateKey);
  }

  /**
   * Derive public key from private key (simplified implementation)
   * @param {string} privateKey - Private key in hex
   * @returns {string} - Public key in hex
   */
  getPublicKeyFromPrivate(privateKey) {
    // This is a simplified implementation
    // In a real implementation, you'd use secp256k1 elliptic curve cryptography
    const hash = createHash('sha256').update(privateKey).digest('hex');
    return hash;
  }

  /**
   * Create a Nostr event
   * @param {string} privateKey - Private key for signing
   * @param {string} content - Event content
   * @param {Array} tags - Event tags (optional)
   * @returns {Object} - Signed Nostr event
   */
  createNostrEvent(privateKey, content, tags = []) {
    const publicKey = this.getPublicKeyFromPrivate(privateKey);
    const createdAt = Math.floor(Date.now() / 1000);
    
    const event = {
      id: '',
      pubkey: publicKey,
      created_at: createdAt,
      kind: 1, // Text note
      tags,
      content,
      sig: '',
    };

    // Create event ID (hash of serialized event data)
    const eventData = JSON.stringify([
      0,
      event.pubkey,
      event.created_at,
      event.kind,
      event.tags,
      event.content,
    ]);
    
    event.id = createHash('sha256').update(eventData).digest('hex');
    
    // Create signature (simplified - in real implementation use secp256k1)
    const signature = createHash('sha256')
      .update(privateKey + event.id)
      .digest('hex');
    
    event.sig = signature;
    
    return event;
  }

  /**
   * Check if user is logged in to Primal
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

      // Look for user profile or settings link
      const userElement = await page.$('[data-testid="user-profile"], .user-profile, .nav-link[href*="/settings"]');
      
      return userElement !== null;
    } catch (error) {
      console.log('Error checking Primal login status:', error.message);
      return false;
    }
  }

  /**
   * Navigate to Primal login page
   * @param {Page} page - Puppeteer page instance
   */
  async navigateToLogin(page) {
    await page.goto(`${this.baseUrl}/login`, {
      waitUntil: 'networkidle2',
      timeout: this.options.timeout,
    });
  }

  /**
   * Perform login with private key
   * @param {Page} page - Puppeteer page instance
   * @param {Object} credentials - Login credentials
   * @param {string} credentials.privateKey - Nostr private key
   */
  async performLogin(page, credentials) {
    try {
      console.log('Starting Primal login with private key...');

      // Validate private key
      if (!this.validatePrivateKey(credentials.privateKey)) {
        throw new Error('Invalid private key format');
      }

      // Wait for private key input field
      await page.waitForSelector('input[name="privateKey"], [data-testid="private-key-input"]', { 
        timeout: this.options.timeout 
      });

      // Fill in private key
      await page.type('input[name="privateKey"], [data-testid="private-key-input"]', credentials.privateKey);

      // Submit the form
      await page.click('button[type="submit"], [data-testid="login-button"]');

      // Wait for navigation after login
      await page.waitForNavigation({ 
        waitUntil: 'networkidle2',
        timeout: this.options.timeout 
      });

      console.log('Primal login completed');
    } catch (error) {
      throw new Error(`Primal login failed: ${error.message}`);
    }
  }

  /**
   * Navigate to Primal compose page
   * @param {Page} page - Puppeteer page instance
   */
  async navigateToCompose(page) {
    await page.goto(`${this.baseUrl}/compose`, {
      waitUntil: 'networkidle2',
      timeout: this.options.timeout,
    });
  }

  /**
   * Post a note to Primal/Nostr
   * @param {Page} page - Puppeteer page instance
   * @param {Object} content - Post content
   * @param {string} content.text - Note text
   */
  async postNote(page, content) {
    try {
      // Validate content length
      if (content.text && content.text.length > this.maxTextLength) {
        throw new Error(`Text is too long. Maximum ${this.maxTextLength} characters allowed.`);
      }

      // Wait for compose form
      await page.waitForSelector('textarea[name="content"], [data-testid="note-input"]', { 
        timeout: this.options.timeout 
      });

      // Fill in note content
      await page.type('textarea[name="content"], [data-testid="note-input"]', content.text);

      // Submit the note
      await page.click('button[type="submit"], [data-testid="post-button"]');

    } catch (error) {
      throw new Error(`Failed to post to Primal: ${error.message}`);
    }
  }

  /**
   * Extract note ID from Primal URL
   * @param {string} url - Primal note URL
   * @returns {string|null} - Note ID or null if not found
   */
  extractNoteId(url) {
    const match = url.match(/\/e\/(note1[a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  /**
   * Wait for note to load after posting
   * @param {Page} page - Puppeteer page instance
   * @returns {Promise<boolean>} - True if note loaded successfully
   */
  async waitForNoteToLoad(page) {
    try {
      // Wait for note content to appear
      await page.waitForSelector('.note, [data-testid="note"]', {
        timeout: this.options.timeout,
      });
      return true;
    } catch (error) {
      console.log('Note loading timed out:', error.message);
      return false;
    }
  }

  /**
   * Main posting method
   * @param {Page} page - Puppeteer page instance
   * @param {Object} content - Post content
   * @param {string} content.text - Note text (required)
   * @param {string} content.type - Post type (always 'text' for Nostr)
   * @returns {Promise<Object>} - Post result
   */
  async post(page, content) {
    try {
      // Check if logged in
      const loggedIn = await this.isLoggedIn(page);
      if (!loggedIn) {
        return {
          success: false,
          error: 'Primal authentication required. Please run "sp login primal" first.',
          platform: this.name,
        };
      }

      // Validate required fields
      if (!content.text) {
        return {
          success: false,
          error: 'Text content is required for Nostr notes',
          platform: this.name,
        };
      }

      // Navigate to compose page
      await this.navigateToCompose(page);

      // Post the note
      await this.postNote(page, content);

      // Wait for note to load
      const noteLoaded = await this.waitForNoteToLoad(page);
      if (!noteLoaded) {
        return {
          success: false,
          error: 'Note posting timed out',
          platform: this.name,
        };
      }

      // Extract note ID from URL
      const currentUrl = page.url();
      const noteId = this.extractNoteId(currentUrl);

      return {
        success: true,
        postId: noteId,
        url: currentUrl,
        platform: this.name,
        message: 'Successfully posted to Primal/Nostr',
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
      authType: 'privateKey',
      supports: {
        text: true,
        links: true, // Links can be included in text
        images: false, // Not directly supported in basic implementation
        videos: false, // Not directly supported in basic implementation
        scheduling: false,
        decentralized: true, // Nostr is decentralized
      },
      limits: {
        textLength: this.maxTextLength,
      },
      required: ['text'],
      optional: [],
      notes: [
        'Nostr is a decentralized social protocol',
        'Requires private key for authentication',
        'Notes are cryptographically signed',
        'Content is distributed across multiple relays',
        'Primal is one of many Nostr clients',
        'Private key should be kept secure and backed up',
      ],
    };
  }
}

export default PrimalPlatform;