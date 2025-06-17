/**
 * Facebook Platform Tests
 * Testing Facebook posting functionality with browser-based authentication
 */

import { expect } from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';

describe('Facebook Platform', () => {
  let sandbox;
  let FacebookPlatform;
  let mockPage;
  let facebookPlatform;

  beforeEach(async () => {
    sandbox = sinon.createSandbox();

    // Mock Puppeteer page
    mockPage = {
      goto: sandbox.stub(),
      url: sandbox.stub(),
      waitForSelector: sandbox.stub(),
      click: sandbox.stub(),
      type: sandbox.stub(),
      evaluate: sandbox.stub(),
      $: sandbox.stub(),
      $$: sandbox.stub(),
      waitForNavigation: sandbox.stub(),
      screenshot: sandbox.stub(),
      keyboard: {
        press: sandbox.stub(),
      },
    };

    // Import the Facebook platform
    const module = await esmock('../../src/platforms/facebook.js', {
      puppeteer: {
        launch: () => ({ newPage: () => mockPage }),
      },
    });
    FacebookPlatform = module.FacebookPlatform;

    facebookPlatform = new FacebookPlatform({
      headless: true,
      timeout: 5000,
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const platform = new FacebookPlatform();
      expect(platform.options.headless).to.be.true;
      expect(platform.options.timeout).to.equal(30000);
    });

    it('should initialize with custom options', () => {
      const platform = new FacebookPlatform({
        headless: false,
        timeout: 10000,
      });
      expect(platform.options.headless).to.be.false;
      expect(platform.options.timeout).to.equal(10000);
    });
  });

  describe('isLoggedIn', () => {
    it('should return true when user is logged in', async () => {
      mockPage.url.returns('https://www.facebook.com/');
      mockPage.$.resolves({ textContent: 'testuser' }); // User profile

      const result = await facebookPlatform.isLoggedIn(mockPage);
      expect(result).to.be.true;
    });

    it('should return false when user is not logged in', async () => {
      mockPage.url.returns('https://www.facebook.com/');
      mockPage.$.resolves(null); // No user profile

      const result = await facebookPlatform.isLoggedIn(mockPage);
      expect(result).to.be.false;
    });

    it('should return false when on login page', async () => {
      mockPage.url.returns('https://www.facebook.com/login');

      const result = await facebookPlatform.isLoggedIn(mockPage);
      expect(result).to.be.false;
    });
  });

  describe('navigateToLogin', () => {
    it('should navigate to login page', async () => {
      await facebookPlatform.navigateToLogin(mockPage);
      
      expect(mockPage.goto).to.have.been.calledWith('https://www.facebook.com/login');
    });
  });

  describe('performLogin', () => {
    it('should perform login with credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'testpass',
      };

      mockPage.waitForSelector.resolves();
      mockPage.type.resolves();
      mockPage.click.resolves();
      mockPage.waitForNavigation.resolves();

      console.log('Starting Facebook login process...');
      await facebookPlatform.performLogin(mockPage, credentials);

      expect(mockPage.waitForSelector).to.have.been.calledWith('#email');
      expect(mockPage.type).to.have.been.calledWith('#email', credentials.email);
      expect(mockPage.type).to.have.been.calledWith('#pass', credentials.password);
      expect(mockPage.click).to.have.been.calledWith('#loginbutton');
    });

    it('should handle login errors', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpass',
      };

      mockPage.waitForSelector.rejects(new Error('Element not found'));

      console.log('Starting Facebook login process...');
      try {
        await facebookPlatform.performLogin(mockPage, credentials);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Facebook login failed');
      }
    });
  });

  describe('navigateToHome', () => {
    it('should navigate to Facebook home page', async () => {
      await facebookPlatform.navigateToHome(mockPage);
      
      expect(mockPage.goto).to.have.been.calledWith('https://www.facebook.com/');
    });
  });

  describe('postText', () => {
    it('should post text content', async () => {
      const content = {
        text: 'Hello Facebook world!',
      };

      mockPage.waitForSelector.resolves();
      mockPage.click.resolves();
      mockPage.type.resolves();
      mockPage.keyboard.press.resolves();

      await facebookPlatform.postText(mockPage, content);

      expect(mockPage.waitForSelector).to.have.been.calledWith('[data-testid="status-attachment-mentions-input"], [role="textbox"]');
      expect(mockPage.click).to.have.been.calledWith('[data-testid="status-attachment-mentions-input"], [role="textbox"]');
      expect(mockPage.type).to.have.been.calledWith('[data-testid="status-attachment-mentions-input"], [role="textbox"]', content.text);
    });

    it('should handle posting errors', async () => {
      const content = {
        text: 'Test post',
      };

      mockPage.waitForSelector.rejects(new Error('Element not found'));

      try {
        await facebookPlatform.postText(mockPage, content);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Failed to post to Facebook');
      }
    });

    it('should handle text that is too long', async () => {
      const content = {
        text: 'a'.repeat(70000), // Very long text
      };

      try {
        await facebookPlatform.postText(mockPage, content);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Text is too long');
      }
    });
  });

  describe('postLink', () => {
    it('should post link with text', async () => {
      const content = {
        link: 'https://example.com',
        text: 'Check out this link',
      };

      mockPage.waitForSelector.resolves();
      mockPage.click.resolves();
      mockPage.type.resolves();
      mockPage.keyboard.press.resolves();

      await facebookPlatform.postLink(mockPage, content);

      expect(mockPage.type).to.have.been.calledWith('[data-testid="status-attachment-mentions-input"], [role="textbox"]', `${content.text}\n\n${content.link}`);
    });

    it('should post link without text', async () => {
      const content = {
        link: 'https://example.com',
      };

      mockPage.waitForSelector.resolves();
      mockPage.click.resolves();
      mockPage.type.resolves();
      mockPage.keyboard.press.resolves();

      await facebookPlatform.postLink(mockPage, content);

      expect(mockPage.type).to.have.been.calledWith('[data-testid="status-attachment-mentions-input"], [role="textbox"]', content.link);
    });
  });

  describe('extractPostId', () => {
    it('should extract post ID from Facebook URL', () => {
      const url = 'https://www.facebook.com/testuser/posts/123456789';
      const postId = facebookPlatform.extractPostId(url);
      
      expect(postId).to.equal('123456789');
    });

    it('should extract post ID from story URL', () => {
      const url = 'https://www.facebook.com/story.php?story_fbid=123456789&id=987654321';
      const postId = facebookPlatform.extractPostId(url);
      
      expect(postId).to.equal('123456789');
    });

    it('should return null for invalid URL', () => {
      const url = 'https://example.com/invalid';
      const postId = facebookPlatform.extractPostId(url);
      
      expect(postId).to.be.null;
    });
  });

  describe('waitForPostToLoad', () => {
    it('should wait for post to be published', async () => {
      mockPage.waitForSelector.resolves();
      mockPage.url.returns('https://www.facebook.com/testuser/posts/123456789');

      const result = await facebookPlatform.waitForPostToLoad(mockPage);
      
      expect(result).to.be.true;
      expect(mockPage.waitForSelector).to.have.been.calledWith('[data-testid="post_message"], .userContent');
    });

    it('should timeout if post does not load', async () => {
      mockPage.waitForSelector.rejects(new Error('Timeout'));

      console.log('Post loading timed out: Timeout');
      const result = await facebookPlatform.waitForPostToLoad(mockPage);
      
      expect(result).to.be.false;
    });
  });

  describe('post', () => {
    it('should handle complete posting flow for text', async () => {
      const content = {
        text: 'Hello Facebook!',
        type: 'text',
      };

      // Mock successful login check
      facebookPlatform.isLoggedIn = sandbox.stub().resolves(true);
      facebookPlatform.navigateToHome = sandbox.stub().resolves();
      facebookPlatform.postText = sandbox.stub().resolves();
      facebookPlatform.waitForPostToLoad = sandbox.stub().resolves(true);
      facebookPlatform.extractPostId = sandbox.stub().returns('123456789');
      mockPage.url.returns('https://www.facebook.com/testuser/posts/123456789');

      const result = await facebookPlatform.post(mockPage, content);

      expect(result.success).to.be.true;
      expect(result.postId).to.equal('123456789');
    });

    it('should handle complete posting flow for link', async () => {
      const content = {
        link: 'https://example.com',
        text: 'Check this out',
        type: 'link',
      };

      // Mock successful login check
      facebookPlatform.isLoggedIn = sandbox.stub().resolves(true);
      facebookPlatform.navigateToHome = sandbox.stub().resolves();
      facebookPlatform.postLink = sandbox.stub().resolves();
      facebookPlatform.waitForPostToLoad = sandbox.stub().resolves(true);
      facebookPlatform.extractPostId = sandbox.stub().returns('123456789');
      mockPage.url.returns('https://www.facebook.com/testuser/posts/123456789');

      const result = await facebookPlatform.post(mockPage, content);

      expect(result.success).to.be.true;
      expect(result.postId).to.equal('123456789');
    });

    it('should handle login requirement', async () => {
      const content = {
        text: 'Test post',
        type: 'text',
      };

      // Mock not logged in
      facebookPlatform.isLoggedIn = sandbox.stub().resolves(false);

      const result = await facebookPlatform.post(mockPage, content);

      expect(result.success).to.be.false;
      expect(result.error).to.include('authentication required');
    });

    it('should require content', async () => {
      const content = {
        type: 'text',
      };

      // Mock logged in
      facebookPlatform.isLoggedIn = sandbox.stub().resolves(true);

      const result = await facebookPlatform.post(mockPage, content);

      expect(result.success).to.be.false;
      expect(result.error).to.include('Text or link content is required');
    });
  });
});