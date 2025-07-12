/**
 * Pinterest Platform Tests
 * Tests for Pinterest platform implementation using Mocha and Chai
 */

import { expect } from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';

describe('Pinterest Platform', () => {
  let PinterestPlatform;
  let pinterestPlatform;
  let mockPage;
  let mockBrowser;

  beforeEach(async () => {
    // Mock page object
    mockPage = {
      goto: sinon.stub().resolves(),
      url: sinon.stub().returns('https://www.pinterest.com'),
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

    // Mock the Pinterest platform module
    const { PinterestPlatform: MockedPinterestPlatform } = await esmock(
      '../../src/platforms/pinterest.js',
      {
        puppeteer: {
          launch: sinon.stub().resolves(mockBrowser),
        },
      }
    );

    PinterestPlatform = MockedPinterestPlatform;
    pinterestPlatform = new PinterestPlatform({ headless: true });
    pinterestPlatform.browser = mockBrowser;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Constructor', () => {
    it('should initialize with correct platform properties', () => {
      expect(pinterestPlatform.platformName).to.equal('pinterest');
      expect(pinterestPlatform.baseUrl).to.equal('https://www.pinterest.com');
      expect(pinterestPlatform.loginUrl).to.equal('https://www.pinterest.com/login');
      expect(pinterestPlatform.createUrl).to.equal('https://www.pinterest.com/pin-creation-tool');
      expect(pinterestPlatform.maxTextLength).to.equal(500);
    });

    it('should extend BrowserAutomation', () => {
      expect(pinterestPlatform).to.have.property('createPage');
      expect(pinterestPlatform).to.have.property('saveSession');
    });
  });

  describe('isLoggedIn', () => {
    it('should return true when user is logged in', async () => {
      mockPage.url.returns('https://www.pinterest.com/');
      mockPage.$.withArgs('[data-test-id="header-profile"]').resolves({ click: sinon.stub() });

      const result = await pinterestPlatform.isLoggedIn(mockPage);
      expect(result).to.be.true;
    });

    it('should return false when on login page', async () => {
      mockPage.url.returns('https://www.pinterest.com/login');

      const result = await pinterestPlatform.isLoggedIn(mockPage);
      expect(result).to.be.false;
    });

    it('should return false when profile button not found', async () => {
      mockPage.url.returns('https://www.pinterest.com/');
      mockPage.$.withArgs('[data-test-id="header-profile"]').resolves(null);
      mockPage.$.withArgs('[data-test-id="user-avatar"]').resolves(null);

      const result = await pinterestPlatform.isLoggedIn(mockPage);
      expect(result).to.be.false;
    });

    it('should handle errors gracefully', async () => {
      mockPage.url.throws(new Error('Page error'));

      const result = await pinterestPlatform.isLoggedIn(mockPage);
      expect(result).to.be.false;
    });
  });

  describe('navigateToLogin', () => {
    it('should navigate to login page', async () => {
      await pinterestPlatform.navigateToLogin(mockPage);
      expect(mockPage.goto).to.have.been.calledWith(
        'https://www.pinterest.com/login',
        { waitUntil: 'networkidle2' }
      );
    });
  });

  describe('navigateToCreate', () => {
    it('should navigate to pin creation page', async () => {
      await pinterestPlatform.navigateToCreate(mockPage);
      expect(mockPage.goto).to.have.been.calledWith(
        'https://www.pinterest.com/pin-creation-tool',
        { waitUntil: 'networkidle2' }
      );
    });
  });

  describe('postPin', () => {
    beforeEach(() => {
      mockPage.waitForSelector.resolves({
        type: sinon.stub(),
        click: sinon.stub(),
        uploadFile: sinon.stub().resolves()
      });
      pinterestPlatform.typeText = sinon.stub().resolves();
      pinterestPlatform.clickElement = sinon.stub().resolves();
      pinterestPlatform.waitForPostToLoad = sinon.stub().resolves(true);
      pinterestPlatform.extractPostId = sinon.stub().returns('12345');
    });

    it('should post pin with image successfully', async () => {
      const content = { 
        text: 'Test Pinterest pin',
        imagePath: '/path/to/image.jpg'
      };
      mockPage.url.returns('https://www.pinterest.com/pin/12345');

      const result = await pinterestPlatform.postPin(mockPage, content);

      expect(result.success).to.be.true;
      expect(result.postId).to.equal('12345');
      expect(result.url).to.equal('https://www.pinterest.com/pin/12345');
    });

    it('should post pin with URL successfully', async () => {
      const content = { 
        text: 'Test Pinterest pin',
        link: 'https://example.com'
      };
      mockPage.url.returns('https://www.pinterest.com/pin/12345');

      const result = await pinterestPlatform.postPin(mockPage, content);

      expect(result.success).to.be.true;
      expect(result.postId).to.equal('12345');
    });

    it('should reject text that is too long', async () => {
      const longText = 'a'.repeat(501);
      const content = { 
        text: longText,
        imagePath: '/path/to/image.jpg'
      };

      const result = await pinterestPlatform.postPin(mockPage, content);

      expect(result.success).to.be.false;
      expect(result.error).to.include('Text is too long');
    });

    it('should require image or URL', async () => {
      const content = { text: 'Test pin' };

      const result = await pinterestPlatform.postPin(mockPage, content);

      expect(result.success).to.be.false;
      expect(result.error).to.include('Either imagePath or link is required');
    });

    it('should handle posting timeout', async () => {
      const content = {
        text: 'Test pin',
        imagePath: '/path/to/image.jpg'
      };
      pinterestPlatform.waitForPostToLoad.resolves(false);

      const result = await pinterestPlatform.postPin(mockPage, content);

      expect(result.success).to.be.false;
      expect(result.error).to.include('Pinterest posting timed out');
    });

    it('should handle posting errors', async () => {
      const content = { 
        text: 'Test pin',
        imagePath: '/path/to/image.jpg'
      };
      pinterestPlatform.typeText.rejects(new Error('Element not found'));

      const result = await pinterestPlatform.postPin(mockPage, content);

      expect(result.success).to.be.false;
      expect(result.error).to.include('Failed to post pin');
    });
  });

  describe('extractPostId', () => {
    it('should extract post ID from Pinterest URL', () => {
      const url = 'https://www.pinterest.com/pin/1234567890123456789';
      const postId = pinterestPlatform.extractPostId(url);
      expect(postId).to.equal('1234567890123456789');
    });

    it('should return null for invalid URL', () => {
      const url = 'https://www.pinterest.com/';
      const postId = pinterestPlatform.extractPostId(url);
      expect(postId).to.be.null;
    });
  });

  describe('waitForPostToLoad', () => {
    it('should wait for pin URL to change', async () => {
      mockPage.waitForFunction.resolves();

      const result = await pinterestPlatform.waitForPostToLoad(mockPage);
      expect(result).to.be.true;
      expect(mockPage.waitForFunction).to.have.been.called;
    });

    it('should handle timeout', async () => {
      mockPage.waitForFunction.rejects(new Error('Timeout'));

      const result = await pinterestPlatform.waitForPostToLoad(mockPage);
      expect(result).to.be.false;
    });
  });

  describe('login', () => {
    beforeEach(() => {
      pinterestPlatform.createPage = sinon.stub().resolves(mockPage);
      pinterestPlatform.isLoggedIn = sinon.stub();
      pinterestPlatform.navigateToLogin = sinon.stub().resolves();
      pinterestPlatform.saveSession = sinon.stub().resolves();
    });

    it('should return true if already logged in', async () => {
      pinterestPlatform.isLoggedIn.resolves(true);

      const result = await pinterestPlatform.login();

      expect(result).to.be.true;
      expect(pinterestPlatform.saveSession).to.have.been.called;
    });

    it('should handle manual login process', async () => {
      pinterestPlatform.isLoggedIn.onFirstCall().resolves(false);
      pinterestPlatform.isLoggedIn.onSecondCall().resolves(true);

      const result = await pinterestPlatform.login();

      expect(result).to.be.true;
      expect(pinterestPlatform.navigateToLogin).to.have.been.called;
    });

    it('should handle login failure', async () => {
      pinterestPlatform.isLoggedIn.resolves(false);

      const result = await pinterestPlatform.login();

      expect(result).to.be.false;
    });
  });

  describe('post', () => {
    beforeEach(() => {
      pinterestPlatform.createPage = sinon.stub().resolves(mockPage);
      pinterestPlatform.isLoggedIn = sinon.stub().resolves(true);
      pinterestPlatform.navigateToCreate = sinon.stub().resolves();
      pinterestPlatform.postPin = sinon.stub().resolves({ success: true });
      pinterestPlatform.saveSession = sinon.stub().resolves();
    });

    it('should post content successfully', async () => {
      const content = { 
        text: 'Test pin',
        imagePath: '/path/to/image.jpg'
      };

      const result = await pinterestPlatform.post(content);

      expect(result.success).to.be.true;
      expect(pinterestPlatform.navigateToCreate).to.have.been.called;
      expect(pinterestPlatform.postPin).to.have.been.calledWith(mockPage, content);
    });

    it('should require authentication', async () => {
      pinterestPlatform.isLoggedIn.resolves(false);
      const content = { 
        text: 'Test pin',
        imagePath: '/path/to/image.jpg'
      };

      const result = await pinterestPlatform.post(content);

      expect(result.success).to.be.false;
      expect(result.error).to.include('Authentication required');
    });

    it('should handle posting errors', async () => {
      pinterestPlatform.navigateToCreate.rejects(new Error('Navigation failed'));
      const content = { 
        text: 'Test pin',
        imagePath: '/path/to/image.jpg'
      };

      const result = await pinterestPlatform.post(content);

      expect(result.success).to.be.false;
      expect(result.error).to.include('Failed to post to Pinterest');
    });
  });
});