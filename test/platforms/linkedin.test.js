/**
 * LinkedIn Platform Tests
 * Testing LinkedIn platform implementation
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import platform to test
import { LinkedInPlatform } from '../../src/platforms/linkedin.js';

describe('LinkedIn Platform', () => {
  let sandbox;
  let linkedInPlatform;
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
      keyboard: {
        press: sandbox.stub(),
      },
    };

    linkedInPlatform = new LinkedInPlatform({
      headless: true,
      timeout: 30000,
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const platform = new LinkedInPlatform();
      expect(platform.platformName).to.equal('linkedin');
      expect(platform.baseUrl).to.equal('https://www.linkedin.com');
    });

    it('should initialize with custom options', () => {
      const platform = new LinkedInPlatform({
        headless: false,
        timeout: 60000,
      });
      expect(platform.options.headless).to.be.false;
      expect(platform.options.timeout).to.equal(60000);
    });
  });

  describe('isLoggedIn', () => {
    it('should return true when user is logged in', async () => {
      mockPage.url.returns('https://www.linkedin.com/feed/');
      mockPage.$.withArgs('.global-nav__me').resolves({});

      const isLoggedIn = await linkedInPlatform.isLoggedIn(mockPage);
      expect(isLoggedIn).to.be.true;
    });

    it('should return false when user is not logged in', async () => {
      mockPage.url.returns('https://www.linkedin.com/login');
      mockPage.$.withArgs('.global-nav__me').resolves(null);

      const isLoggedIn = await linkedInPlatform.isLoggedIn(mockPage);
      expect(isLoggedIn).to.be.false;
    });

    it('should return false when on login page', async () => {
      mockPage.url.returns('https://www.linkedin.com/login');

      const isLoggedIn = await linkedInPlatform.isLoggedIn(mockPage);
      expect(isLoggedIn).to.be.false;
    });
  });

  describe('navigateToLogin', () => {
    it('should navigate to login page', async () => {
      await linkedInPlatform.navigateToLogin(mockPage);
      
      expect(mockPage.goto.calledWith('https://www.linkedin.com/login')).to.be.true;
    });
  });

  describe('performLogin', () => {
    it.skip('should perform login with credentials', async () => {
      const credentials = {
        username: 'test@example.com',
        password: 'testpass',
      };

      // Mock successful login flow
      mockPage.waitForSelector.resolves({});
      mockPage.type.resolves();
      mockPage.click.resolves();
      mockPage.waitForNavigation.resolves();

      const result = await linkedInPlatform.performLogin(mockPage, credentials);
      
      expect(result).to.be.true;
      expect(mockPage.waitForSelector.calledWith('#username')).to.be.true;
      expect(mockPage.type.calledWith('#username', credentials.username)).to.be.true;
    });

    it('should handle login errors', async () => {
      const credentials = {
        username: 'test@example.com',
        password: 'wrongpass',
      };

      mockPage.waitForSelector.rejects(new Error('Element not found'));

      const result = await linkedInPlatform.performLogin(mockPage, credentials);
      
      expect(result).to.be.false;
    });
  });

  describe('navigateToCompose', () => {
    it.skip('should navigate to compose post', async () => {
      mockPage.waitForSelector.resolves({});
      mockPage.click.resolves();

      await linkedInPlatform.navigateToCompose(mockPage);
      
      expect(mockPage.waitForSelector.calledWith('[data-control-name="share_via_linkedin"]')).to.be.true;
      expect(mockPage.click.calledWith('[data-control-name="share_via_linkedin"]')).to.be.true;
    });

    it('should handle compose button not found', async () => {
      mockPage.waitForSelector.rejects(new Error('Button not found'));

      try {
        await linkedInPlatform.navigateToCompose(mockPage);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Failed to open compose dialog');
      }
    });
  });

  describe('postText', () => {
    it.skip('should post text content', async () => {
      const content = {
        text: 'Hello LinkedIn! This is a test post from Social Poster.',
        type: 'text',
      };

      mockPage.waitForSelector.resolves({});
      mockPage.type.resolves();
      mockPage.click.resolves();
      mockPage.waitForNavigation.resolves();
      mockPage.url.returns('https://www.linkedin.com/feed/update/urn:li:activity:123456789/');

      const result = await linkedInPlatform.postText(mockPage, content);
      
      expect(result.success).to.be.true;
      expect(result.postId).to.equal('123456789');
      expect(mockPage.type.calledWith('.ql-editor', content.text)).to.be.true;
      expect(mockPage.click.calledWith('[data-control-name="share.post"]')).to.be.true;
    });

    it('should handle posting errors', async () => {
      const content = {
        text: 'Test post',
        type: 'text',
      };

      mockPage.waitForSelector.rejects(new Error('Editor not found'));

      const result = await linkedInPlatform.postText(mockPage, content);
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('Failed to post text');
    });

    it('should handle text that is too long', async () => {
      const content = {
        text: 'a'.repeat(4000), // Longer than LinkedIn's limit
        type: 'text',
      };

      const result = await linkedInPlatform.postText(mockPage, content);
      
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
      mockPage.url.returns('https://www.linkedin.com/feed/update/urn:li:activity:123456789/');

      const result = await linkedInPlatform.postLink(mockPage, content);
      
      expect(result.success).to.be.true;
      expect(result.postId).to.equal('123456789');
      
      const expectedText = `${content.text}\n\n${content.link}`;
      expect(mockPage.type.calledWith('.ql-editor', expectedText)).to.be.true;
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
      mockPage.url.returns('https://www.linkedin.com/feed/update/urn:li:activity:123456789/');

      const result = await linkedInPlatform.postLink(mockPage, content);
      
      expect(result.success).to.be.true;
      expect(mockPage.type.calledWith('.ql-editor', content.link)).to.be.true;
    });
  });

  describe('extractPostId', () => {
    it('should extract post ID from LinkedIn URL', () => {
      const url = 'https://www.linkedin.com/feed/update/urn:li:activity:1234567890123456789/';
      const postId = linkedInPlatform.extractPostId(url);
      
      expect(postId).to.equal('1234567890123456789');
    });

    it('should return null for invalid URL', () => {
      const url = 'https://www.linkedin.com/feed/';
      const postId = linkedInPlatform.extractPostId(url);
      
      expect(postId).to.be.null;
    });
  });

  describe('waitForPostToLoad', () => {
    it.skip('should wait for post to be published', async () => {
      mockPage.waitForSelector.resolves({});
      mockPage.url.returns('https://www.linkedin.com/feed/update/urn:li:activity:123456789/');

      const result = await linkedInPlatform.waitForPostToLoad(mockPage);
      
      expect(result).to.be.true;
    });

    it('should timeout if post does not load', async () => {
      mockPage.waitForSelector.rejects(new Error('Timeout'));
      mockPage.url.returns('https://www.linkedin.com/feed/');

      const result = await linkedInPlatform.waitForPostToLoad(mockPage);
      
      expect(result).to.be.false;
    });
  });

  describe('post', () => {
    it.skip('should handle complete posting flow for text', async () => {
      const content = {
        text: 'Hello LinkedIn!',
        type: 'text',
      };

      // Mock the entire flow
      sandbox.stub(linkedInPlatform, 'createPage').resolves(mockPage);
      sandbox.stub(linkedInPlatform, 'isLoggedIn').resolves(true);
      sandbox.stub(linkedInPlatform, 'navigateToCompose').resolves();
      sandbox.stub(linkedInPlatform, 'postText').resolves({
        success: true,
        postId: '123456789',
      });
      sandbox.stub(linkedInPlatform, 'saveSession').resolves();

      const result = await linkedInPlatform.post(content);
      
      expect(result.success).to.be.true;
      expect(result.postId).to.equal('123456789');
    });

    it.skip('should handle login requirement', async () => {
      const content = {
        text: 'Hello LinkedIn!',
        type: 'text',
      };

      sandbox.stub(linkedInPlatform, 'createPage').resolves(mockPage);
      sandbox.stub(linkedInPlatform, 'isLoggedIn').resolves(false);
      sandbox.stub(linkedInPlatform, 'login').resolves(false);

      const result = await linkedInPlatform.post(content);
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('Authentication required');
    });
  });
});