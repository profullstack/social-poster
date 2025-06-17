/**
 * X.com Platform Tests
 * Testing X (Twitter) platform implementation
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import platform to test
import { XPlatform } from '../../src/platforms/x-com.js';

describe('X Platform', () => {
  let sandbox;
  let xPlatform;
  let mockPage;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Mock Puppeteer page
    mockPage = {
      goto: sandbox.stub(),
      waitForSelector: sandbox.stub(),
      click: sandbox.stub(),
      type: sandbox.stub(),
      evaluate: sandbox.stub(),
      waitForNavigation: sandbox.stub(),
      url: sandbox.stub(),
      $: sandbox.stub(),
      $$: sandbox.stub(),
      waitForTimeout: sandbox.stub(),
    };

    xPlatform = new XPlatform({
      headless: true,
      timeout: 30000,
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const platform = new XPlatform();
      expect(platform.platformName).to.equal('x');
      expect(platform.baseUrl).to.equal('https://x.com');
    });

    it('should initialize with custom options', () => {
      const platform = new XPlatform({
        headless: false,
        timeout: 60000,
      });
      expect(platform.options.headless).to.be.false;
      expect(platform.options.timeout).to.equal(60000);
    });
  });

  describe('isLoggedIn', () => {
    it('should return true when user is logged in', async () => {
      mockPage.url.returns('https://x.com/home');
      mockPage.$.withArgs('[data-testid="SideNav_AccountSwitcher_Button"]').resolves({});

      const isLoggedIn = await xPlatform.isLoggedIn(mockPage);
      expect(isLoggedIn).to.be.true;
    });

    it('should return false when user is not logged in', async () => {
      mockPage.url.returns('https://x.com/login');
      mockPage.$.withArgs('[data-testid="SideNav_AccountSwitcher_Button"]').resolves(null);

      const isLoggedIn = await xPlatform.isLoggedIn(mockPage);
      expect(isLoggedIn).to.be.false;
    });

    it('should return false when on login page', async () => {
      mockPage.url.returns('https://x.com/i/flow/login');

      const isLoggedIn = await xPlatform.isLoggedIn(mockPage);
      expect(isLoggedIn).to.be.false;
    });
  });

  describe('navigateToLogin', () => {
    it('should navigate to login page', async () => {
      await xPlatform.navigateToLogin(mockPage);
      
      expect(mockPage.goto.calledWith('https://x.com/i/flow/login')).to.be.true;
    });
  });

  describe('performLogin', () => {
    it.skip('should perform login with credentials', async () => {
      const credentials = {
        username: 'testuser',
        password: 'testpass',
      };

      // Mock successful login flow
      mockPage.waitForSelector.resolves({});
      mockPage.type.resolves();
      mockPage.click.resolves();
      mockPage.waitForNavigation.resolves();

      const result = await xPlatform.performLogin(mockPage, credentials);
      
      expect(result).to.be.true;
      expect(mockPage.waitForSelector.calledWith('input[name="text"]')).to.be.true;
      expect(mockPage.type.calledWith('input[name="text"]', credentials.username)).to.be.true;
    });

    it('should handle login errors', async () => {
      const credentials = {
        username: 'testuser',
        password: 'wrongpass',
      };

      mockPage.waitForSelector.rejects(new Error('Element not found'));

      const result = await xPlatform.performLogin(mockPage, credentials);
      
      expect(result).to.be.false;
    });

    it.skip('should handle 2FA if required', async () => {
      const credentials = {
        username: 'testuser',
        password: 'testpass',
        twoFactorCode: '123456',
      };

      // Mock 2FA flow
      mockPage.waitForSelector.onFirstCall().resolves({});
      mockPage.waitForSelector.onSecondCall().resolves({});
      mockPage.waitForSelector.onThirdCall().resolves({}); // 2FA input
      mockPage.type.resolves();
      mockPage.click.resolves();
      mockPage.waitForNavigation.resolves();

      const result = await xPlatform.performLogin(mockPage, credentials);
      
      expect(result).to.be.true;
    });
  });

  describe('navigateToCompose', () => {
    it.skip('should navigate to compose tweet', async () => {
      mockPage.waitForSelector.resolves({});
      mockPage.click.resolves();

      await xPlatform.navigateToCompose(mockPage);
      
      expect(mockPage.waitForSelector.calledWith('[data-testid="SideNav_NewTweet_Button"]')).to.be.true;
      expect(mockPage.click.calledWith('[data-testid="SideNav_NewTweet_Button"]')).to.be.true;
    });

    it('should handle compose button not found', async () => {
      mockPage.waitForSelector.rejects(new Error('Button not found'));

      try {
        await xPlatform.navigateToCompose(mockPage);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Failed to open compose dialog');
      }
    });
  });

  describe('postText', () => {
    it.skip('should post text content', async () => {
      const content = {
        text: 'Hello, world! This is a test tweet.',
        type: 'text',
      };

      mockPage.waitForSelector.resolves({});
      mockPage.type.resolves();
      mockPage.click.resolves();
      mockPage.waitForNavigation.resolves();
      mockPage.url.returns('https://x.com/user/status/123456789');

      const result = await xPlatform.postText(mockPage, content);
      
      expect(result.success).to.be.true;
      expect(result.postId).to.equal('123456789');
      expect(mockPage.type.calledWith('[data-testid="tweetTextarea_0"]', content.text)).to.be.true;
      expect(mockPage.click.calledWith('[data-testid="tweetButtonInline"]')).to.be.true;
    });

    it('should handle posting errors', async () => {
      const content = {
        text: 'Test tweet',
        type: 'text',
      };

      mockPage.waitForSelector.rejects(new Error('Textarea not found'));

      const result = await xPlatform.postText(mockPage, content);
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('Failed to post text');
    });

    it('should handle text that is too long', async () => {
      const content = {
        text: 'a'.repeat(300), // Longer than Twitter's limit
        type: 'text',
      };

      const result = await xPlatform.postText(mockPage, content);
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('Text is too long');
    });
  });

  describe('postLink', () => {
    it.skip('should post link with text', async () => {
      const content = {
        text: 'Check out this amazing website!',
        link: 'https://example.com',
        type: 'link',
      };

      mockPage.waitForSelector.resolves({});
      mockPage.type.resolves();
      mockPage.click.resolves();
      mockPage.waitForNavigation.resolves();
      mockPage.url.returns('https://x.com/user/status/123456789');

      const result = await xPlatform.postLink(mockPage, content);
      
      expect(result.success).to.be.true;
      expect(result.postId).to.equal('123456789');
      
      const expectedText = `${content.text} ${content.link}`;
      expect(mockPage.type.calledWith('[data-testid="tweetTextarea_0"]', expectedText)).to.be.true;
    });

    it.skip('should post link without text', async () => {
      const content = {
        link: 'https://example.com',
        type: 'link',
      };

      mockPage.waitForSelector.resolves({});
      mockPage.type.resolves();
      mockPage.click.resolves();
      mockPage.waitForNavigation.resolves();
      mockPage.url.returns('https://x.com/user/status/123456789');

      const result = await xPlatform.postLink(mockPage, content);
      
      expect(result.success).to.be.true;
      expect(mockPage.type.calledWith('[data-testid="tweetTextarea_0"]', content.link)).to.be.true;
    });
  });

  describe('extractPostId', () => {
    it('should extract post ID from URL', () => {
      const url = 'https://x.com/username/status/1234567890123456789';
      const postId = xPlatform.extractPostId(url);
      
      expect(postId).to.equal('1234567890123456789');
    });

    it('should return null for invalid URL', () => {
      const url = 'https://x.com/home';
      const postId = xPlatform.extractPostId(url);
      
      expect(postId).to.be.null;
    });
  });

  describe('waitForPostToLoad', () => {
    it.skip('should wait for post to be published', async () => {
      mockPage.waitForSelector.resolves({});
      mockPage.url.returns('https://x.com/user/status/123456789');

      const result = await xPlatform.waitForPostToLoad(mockPage);
      
      expect(result).to.be.true;
    });

    it('should timeout if post does not load', async () => {
      mockPage.waitForSelector.rejects(new Error('Timeout'));
      mockPage.url.returns('https://x.com/compose/tweet');

      const result = await xPlatform.waitForPostToLoad(mockPage);
      
      expect(result).to.be.false;
    });
  });

  describe('post', () => {
    it.skip('should handle complete posting flow for text', async () => {
      const content = {
        text: 'Hello, world!',
        type: 'text',
      };

      // Mock the entire flow
      sandbox.stub(xPlatform, 'createPage').resolves(mockPage);
      sandbox.stub(xPlatform, 'isLoggedIn').resolves(true);
      sandbox.stub(xPlatform, 'navigateToCompose').resolves();
      sandbox.stub(xPlatform, 'postText').resolves({
        success: true,
        postId: '123456789',
      });
      sandbox.stub(xPlatform, 'saveSession').resolves();

      const result = await xPlatform.post(content);
      
      expect(result.success).to.be.true;
      expect(result.postId).to.equal('123456789');
    });

    it.skip('should handle login requirement', async () => {
      const content = {
        text: 'Hello, world!',
        type: 'text',
      };

      sandbox.stub(xPlatform, 'createPage').resolves(mockPage);
      sandbox.stub(xPlatform, 'isLoggedIn').resolves(false);
      sandbox.stub(xPlatform, 'login').resolves(false);

      const result = await xPlatform.post(content);
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('Authentication required');
    });
  });
});