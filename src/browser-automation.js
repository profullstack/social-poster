/**
 * Browser Automation Service
 * Handles Puppeteer-based login and session management for social media platforms
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import puppeteer from 'puppeteer';

/**
 * Get the path to the sessions file
 * @returns {string} Full path to sessions.json
 */
export function getSessionsPath() {
  return path.join(os.homedir(), '.config', 'social-poster', 'sessions.json');
}

/**
 * Load sessions from file
 * @param {string} [sessionsPath] - Optional custom sessions path
 * @returns {object} Sessions object
 */
export function loadSessions(sessionsPath = getSessionsPath()) {
  try {
    if (!fs.existsSync(sessionsPath)) {
      return {};
    }

    const sessionsData = fs.readFileSync(sessionsPath, 'utf8');
    return JSON.parse(sessionsData);
  } catch (error) {
    console.warn(`Failed to load sessions from ${sessionsPath}: ${error.message}`);
    return {};
  }
}

/**
 * Save sessions to file
 * @param {object} sessions - Sessions object to save
 * @param {string} [sessionsPath] - Optional custom sessions path
 * @returns {object} Result with success flag and optional error message
 */
export function saveSessions(sessions, sessionsPath = getSessionsPath()) {
  try {
    // Ensure directory exists
    const sessionsDir = path.dirname(sessionsPath);
    if (!fs.existsSync(sessionsDir)) {
      fs.mkdirSync(sessionsDir, { recursive: true });
    }

    // Save sessions
    fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2));

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to save sessions: ${error.message}`,
    };
  }
}

/**
 * Validate if a session is still valid
 * @param {object} session - Session object to validate
 * @param {number} [maxAgeHours=24] - Maximum age in hours
 * @returns {boolean} True if session is valid
 */
export function validateSession(session, maxAgeHours = 24) {
  if (!session || !session.cookies || !Array.isArray(session.cookies)) {
    return false;
  }

  if (session.cookies.length === 0) {
    return false;
  }

  if (!session.lastValidated) {
    return false;
  }

  const lastValidated = new Date(session.lastValidated);
  const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds
  const isExpired = Date.now() - lastValidated.getTime() > maxAge;

  return !isExpired;
}

/**
 * Session Manager class
 * Handles loading, saving, and managing browser sessions
 */
export class SessionManager {
  constructor(sessionsPath = getSessionsPath()) {
    this.sessionsPath = sessionsPath;
    this.sessions = loadSessions(sessionsPath);
  }

  /**
   * Get session for a platform
   * @param {string} platform - Platform name
   * @returns {object|null} Session object or null if not found
   */
  getSession(platform) {
    return this.sessions[platform] || null;
  }

  /**
   * Set session for a platform
   * @param {string} platform - Platform name
   * @param {object} session - Session object
   */
  setSession(platform, session) {
    this.sessions[platform] = session;
    this.save();
  }

  /**
   * Check if session is valid for a platform
   * @param {string} platform - Platform name
   * @param {number} [maxAgeHours=24] - Maximum age in hours
   * @returns {boolean} True if session is valid
   */
  isSessionValid(platform, maxAgeHours = 24) {
    const session = this.getSession(platform);
    return validateSession(session, maxAgeHours);
  }

  /**
   * Clear session for a platform
   * @param {string} platform - Platform name
   */
  clearSession(platform) {
    delete this.sessions[platform];
    this.save();
  }

  /**
   * Get all platforms with valid sessions
   * @returns {string[]} Array of platform names
   */
  getValidPlatforms() {
    return Object.keys(this.sessions).filter(platform => this.isSessionValid(platform));
  }

  /**
   * Save sessions to file
   */
  save() {
    saveSessions(this.sessions, this.sessionsPath);
  }
}

/**
 * Browser Automation class
 * Handles Puppeteer browser operations for login and posting
 */
export class BrowserAutomation {
  constructor(options = {}) {
    this.options = {
      headless: true,
      timeout: 30000,
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      sessionsPath: getSessionsPath(),
      ...options,
    };

    this.sessionManager = new SessionManager(this.options.sessionsPath);
    this.browser = null;
  }

  /**
   * Launch Puppeteer browser
   * @returns {Promise<Browser>} Puppeteer browser instance
   */
  async launchBrowser() {
    if (this.browser) {
      return this.browser;
    }

    this.browser = await puppeteer.launch({
      headless: this.options.headless,
      defaultViewport: this.options.viewport,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    });

    return this.browser;
  }

  /**
   * Close browser
   */
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Create a new page with session restoration
   * @param {string} platform - Platform name
   * @returns {Promise<Page>} Puppeteer page instance
   */
  async createPage(platform) {
    const browser = await this.launchBrowser();
    const page = await browser.newPage();

    // Set user agent and viewport
    await page.setUserAgent(this.options.userAgent);
    await page.setViewport(this.options.viewport);

    // Restore session if available
    const session = this.sessionManager.getSession(platform);
    if (session && validateSession(session)) {
      await this.restoreSession(page, session);
    }

    return page;
  }

  /**
   * Restore session data to page
   * @param {Page} page - Puppeteer page instance
   * @param {object} session - Session data
   */
  async restoreSession(page, session) {
    try {
      // Set cookies
      if (session.cookies && session.cookies.length > 0) {
        await page.setCookie(...session.cookies);
      }

      // Set user agent if stored
      if (session.userAgent) {
        await page.setUserAgent(session.userAgent);
      }

      // Set viewport if stored
      if (session.viewport) {
        await page.setViewport(session.viewport);
      }

      // Navigate to a page first to set localStorage and sessionStorage
      if (session.localStorage || session.sessionStorage) {
        // We'll need to navigate to the platform's domain first
        // This will be handled by platform-specific implementations
      }
    } catch (error) {
      console.warn(`Failed to restore session: ${error.message}`);
    }
  }

  /**
   * Capture session data from page
   * @param {Page} page - Puppeteer page instance
   * @returns {Promise<object>} Session data
   */
  async captureSession(page) {
    try {
      const session = {
        lastValidated: new Date().toISOString(),
        userAgent: await page.evaluate(() => navigator.userAgent),
        viewport: page.viewport(),
      };

      // Get cookies
      session.cookies = await page.cookies();

      // Get localStorage
      session.localStorage = await page.evaluate(() => {
        const storage = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          storage[key] = localStorage.getItem(key);
        }
        return storage;
      });

      // Get sessionStorage
      session.sessionStorage = await page.evaluate(() => {
        const storage = {};
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          storage[key] = sessionStorage.getItem(key);
        }
        return storage;
      });

      return session;
    } catch (error) {
      console.warn(`Failed to capture session: ${error.message}`);
      return {
        lastValidated: new Date().toISOString(),
        cookies: [],
        localStorage: {},
        sessionStorage: {},
      };
    }
  }

  /**
   * Save current page session for platform
   * @param {Page} page - Puppeteer page instance
   * @param {string} platform - Platform name
   */
  async saveSession(page, platform) {
    const session = await this.captureSession(page);
    this.sessionManager.setSession(platform, session);
  }

  /**
   * Wait for element with timeout
   * @param {Page} page - Puppeteer page instance
   * @param {string} selector - CSS selector
   * @param {number} [timeout] - Timeout in milliseconds
   * @returns {Promise<ElementHandle>} Element handle
   */
  async waitForElement(page, selector, timeout = this.options.timeout) {
    return await page.waitForSelector(selector, { timeout });
  }

  /**
   * Type text with human-like delays
   * @param {Page} page - Puppeteer page instance
   * @param {string} selector - CSS selector
   * @param {string} text - Text to type
   * @param {object} [options] - Typing options
   */
  async typeText(page, selector, text, options = {}) {
    const element = await this.waitForElement(page, selector);
    await element.click({ clickCount: 3 }); // Select all existing text
    await element.type(text, {
      delay: options.delay || Math.random() * 100 + 50, // Random delay between 50-150ms
    });
  }

  /**
   * Click element with human-like behavior
   * @param {Page} page - Puppeteer page instance
   * @param {string} selector - CSS selector
   * @param {object} [options] - Click options
   */
  async clickElement(page, selector, options = {}) {
    const element = await this.waitForElement(page, selector);
    
    // Add random delay before clicking
    if (options.delay !== false) {
      await page.waitForTimeout(Math.random() * 1000 + 500);
    }
    
    await element.click();
  }

  /**
   * Wait for navigation with timeout
   * @param {Page} page - Puppeteer page instance
   * @param {object} [options] - Navigation options
   */
  async waitForNavigation(page, options = {}) {
    return await page.waitForNavigation({
      timeout: this.options.timeout,
      waitUntil: 'networkidle2',
      ...options,
    });
  }

  /**
   * Take screenshot for debugging
   * @param {Page} page - Puppeteer page instance
   * @param {string} filename - Screenshot filename
   */
  async takeScreenshot(page, filename) {
    if (!this.options.headless) {
      return; // Don't take screenshots in non-headless mode
    }

    try {
      const screenshotPath = path.join(os.tmpdir(), `social-poster-${filename}-${Date.now()}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Screenshot saved: ${screenshotPath}`);
    } catch (error) {
      console.warn(`Failed to take screenshot: ${error.message}`);
    }
  }

  /**
   * Check if user is logged in to platform
   * @param {Page} page - Puppeteer page instance
   * @param {string} platform - Platform name
   * @returns {Promise<boolean>} True if logged in
   */
  async isLoggedIn(page, platform) {
    // This will be implemented by platform-specific classes
    throw new Error('isLoggedIn method must be implemented by platform-specific classes');
  }

  /**
   * Perform login for platform
   * @param {string} platform - Platform name
   * @param {object} [options] - Login options
   * @returns {Promise<boolean>} True if login successful
   */
  async login(platform, options = {}) {
    // This will be implemented by platform-specific classes
    throw new Error('login method must be implemented by platform-specific classes');
  }

  /**
   * Post content to platform
   * @param {string} platform - Platform name
   * @param {object} content - Content to post
   * @returns {Promise<object>} Post result
   */
  async post(platform, content) {
    // This will be implemented by platform-specific classes
    throw new Error('post method must be implemented by platform-specific classes');
  }
}

/**
 * Default browser automation instance
 */
export const browserAutomation = new BrowserAutomation();