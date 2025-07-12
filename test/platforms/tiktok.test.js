/**
 * TikTok Platform Tests
 * Tests for TikTok platform implementation using Mocha and Chai
 */

import { expect } from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';

describe('TikTok Platform', () => {
  let TikTokPlatform;
  let tikTokPlatform;
  let mockPage;
  let mockBrowser;

  beforeEach(async () => {
    // Mock page object
    mockPage = {
      goto: sinon.stub().resolves(),
      url: sinon.stub().returns('https://www.tiktok.com'),
      $: sinon.stub(),
      $$: sinon.stub(),
      waitForSelector: sinon.stub(),
      waitForNavigation: sinon.stub().resolves(),
      waitForTimeout: sinon.stub().resolves(),
      waitForFunction: sinon.stub().resolves(),
      evaluate: sinon.stub(),
      type: sinon.stub().resolves(),
      click: sinon.stub().resolves(),
      close: sinon.stub().resolves(),
      cookies: sinon.stub().resolves([]),
      setCookie: sinon.stub().resolves(),
      setUserAgent: sinon.stub().resolves(),
      setViewport: sinon.stub().resolves(),
      screenshot: sinon.stub().resolves(),
      viewport: sinon.stub().returns({ width: 1920, height: 1080 }),
      on: sinon.stub(),
    };

    // Mock browser object
    mockBrowser = {
      newPage: sinon.stub().resolves(mockPage),
      close: sinon.stub().resolves(),
    };

    // Mock the TikTok platform module
    const { TikTokPlatform: MockedTikTokPlatform } = await esmock(
      '../../src/platforms/tiktok.js',
      {
        puppeteer: {
          launch: sinon.stub().resolves(mockBrowser),
        },
      }
    );

    TikTokPlatform = MockedTikTokPlatform;
    tikTokPlatform = new TikTokPlatform({ headless: true });
    tikTokPlatform.browser = mockBrowser;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Constructor', () => {
    it('should initialize with correct platform properties', () => {
      expect(tikTokPlatform.platformName).to.equal('tiktok');
      expect(tikTokPlatform.baseUrl).to.equal('https://www.tiktok.com');
      expect(tikTokPlatform.loginUrl).to.equal('https://www.tiktok.com/login');
      expect(tikTokPlatform.maxTextLength).to.equal(2200);
    });

    it('should extend BrowserAutomation', () => {
      expect(tikTokPlatform).to.have.property('createPage');
      expect(tikTokPlatform).to.have.property('saveSession');
    });
  });

  describe('isLoggedIn', () => {
    it('should return true when user is logged in', async () => {
      mockPage.url.returns('https://www.tiktok.com/foryou');
      mockPage.$.withArgs('[data-e2e="profile-icon"]').resolves({ click: sinon.stub() });

      const result = await tikTokPlatform.isLoggedIn(mockPage);
      expect(result).to.be.true;
    });

    it('should return false when on login page', async () => {
      mockPage.url.returns('https://www.tiktok.com/login');

      const result = await tikTokPlatform.isLoggedIn(mockPage);
      expect(result).to.be.false;
    });

    it('should return false when profile icon not found', async () => {
      mockPage.url.returns('https://www.tiktok.com/foryou');
      mockPage.$.withArgs('[data-e2e="profile-icon"]').resolves(null);
      mockPage.$.withArgs('[data-e2e="nav-profile"]').resolves(null);

      const result = await tikTokPlatform.isLoggedIn(mockPage);
      expect(result).to.be.false;
    });

    it('should handle errors gracefully', async () => {
      mockPage.url.throws(new Error('Page error'));

      const result = await tikTokPlatform.isLoggedIn(mockPage);
      expect(result).to.be.false;
    });
  });

  describe('navigateToLogin', () => {
    it('should navigate to login page', async () => {
      await tikTokPlatform.navigateToLogin(mockPage);
      expect(mockPage.goto).to.have.been.calledWith(
        'https://www.tiktok.com/login',
        { waitUntil: 'networkidle2' }
      );
    });
  });

  describe('navigateToUpload', () => {
    it('should navigate to upload page', async () => {
      await tikTokPlatform.navigateToUpload(mockPage);
      expect(mockPage.goto).to.have.been.calledWith(
        'https://www.tiktok.com/upload',
        { waitUntil: 'networkidle2' }
      );
    });
  });

  describe('postText', () => {
    beforeEach(() => {
      mockPage.waitForSelector.resolves({ type: sinon.stub(), click: sinon.stub() });
      tikTokPlatform.typeText = sinon.stub().resolves();
      tikTokPlatform.clickElement = sinon.stub().resolves();
      tikTokPlatform.waitForPostToLoad = sinon.stub().resolves(true);
      tikTokPlatform.extractPostId = sinon.stub().returns('12345');
    });

    it('should post text content successfully', async () => {
      const content = { text: 'Test TikTok post' };
      mockPage.url.returns('https://www.tiktok.com/@user/video/12345');

      const result = await tikTokPlatform.postText(mockPage, content);

      expect(result.success).to.be.true;
      expect(result.postId).to.equal('12345');
      expect(result.url).to.equal('https://www.tiktok.com/@user/video/12345');
    });

    it('should reject text that is too long', async () => {
      const longText = 'a'.repeat(2201);
      const content = { text: longText };

      const result = await tikTokPlatform.postText(mockPage, content);

      expect(result.success).to.be.false;
      expect(result.error).to.include('Text is too long');
    });

    it('should handle posting timeout', async () => {
      const content = { text: 'Test post' };
      tikTokPlatform.waitForPostToLoad.resolves(false);

      const result = await tikTokPlatform.postText(mockPage, content);

      expect(result.success).to.be.false;
      expect(result.error).to.include('posting timed out');
    });

    it('should handle posting errors', async () => {
      const content = { text: 'Test post' };
      tikTokPlatform.typeText.rejects(new Error('Element not found'));

      const result = await tikTokPlatform.postText(mockPage, content);

      expect(result.success).to.be.false;
      expect(result.error).to.include('Failed to post text');
    });
  });

  describe('extractPostId', () => {
    it('should extract post ID from TikTok URL', () => {
      const url = 'https://www.tiktok.com/@username/video/1234567890123456789';
      const postId = tikTokPlatform.extractPostId(url);
      expect(postId).to.equal('1234567890123456789');
    });

    it('should return null for invalid URL', () => {
      const url = 'https://www.tiktok.com/foryou';
      const postId = tikTokPlatform.extractPostId(url);
      expect(postId).to.be.null;
    });
  });

  describe('waitForPostToLoad', () => {
    it('should wait for post URL to change', async () => {
      mockPage.waitForFunction.resolves();

      const result = await tikTokPlatform.waitForPostToLoad(mockPage);
      expect(result).to.be.true;
      expect(mockPage.waitForFunction).to.have.been.called;
    });

    it('should handle timeout', async () => {
      mockPage.waitForFunction.rejects(new Error('Timeout'));

      const result = await tikTokPlatform.waitForPostToLoad(mockPage);
      expect(result).to.be.false;
    });
  });

  describe('login', () => {
    beforeEach(() => {
      tikTokPlatform.createPage = sinon.stub().resolves(mockPage);
      tikTokPlatform.isLoggedIn = sinon.stub();
      tikTokPlatform.navigateToLogin = sinon.stub().resolves();
      tikTokPlatform.saveSession = sinon.stub().resolves();
    });

    it('should return true if already logged in', async () => {
      tikTokPlatform.isLoggedIn.resolves(true);

      const result = await tikTokPlatform.login();

      expect(result).to.be.true;
      expect(tikTokPlatform.saveSession).to.have.been.called;
    });

    it('should handle manual login process', async () => {
      tikTokPlatform.isLoggedIn.onFirstCall().resolves(false);
      tikTokPlatform.isLoggedIn.onSecondCall().resolves(true);

      const result = await tikTokPlatform.login();

      expect(result).to.be.true;
      expect(tikTokPlatform.navigateToLogin).to.have.been.called;
    });

    it('should handle login failure', async () => {
      tikTokPlatform.isLoggedIn.resolves(false);

      const result = await tikTokPlatform.login();

      expect(result).to.be.false;
    });
  });

  describe('post', () => {
    beforeEach(() => {
      tikTokPlatform.createPage = sinon.stub().resolves(mockPage);
      tikTokPlatform.isLoggedIn = sinon.stub().resolves(true);
      tikTokPlatform.navigateToUpload = sinon.stub().resolves();
      tikTokPlatform.postText = sinon.stub().resolves({ success: true });
      tikTokPlatform.saveSession = sinon.stub().resolves();
    });

    it('should post content successfully', async () => {
      const content = { text: 'Test post' };

      const result = await tikTokPlatform.post(content);

      expect(result.success).to.be.true;
      expect(tikTokPlatform.navigateToUpload).to.have.been.called;
      expect(tikTokPlatform.postText).to.have.been.calledWith(mockPage, content);
    });

    it('should require authentication', async () => {
      tikTokPlatform.isLoggedIn.resolves(false);
      const content = { text: 'Test post' };

      const result = await tikTokPlatform.post(content);

      expect(result.success).to.be.false;
      expect(result.error).to.include('Authentication required');
    });

    it('should handle posting errors', async () => {
      tikTokPlatform.navigateToUpload.rejects(new Error('Navigation failed'));
      const content = { text: 'Test post' };

      const result = await tikTokPlatform.post(content);

      expect(result.success).to.be.false;
      expect(result.error).to.include('Failed to post to TikTok');
    });
  });
});