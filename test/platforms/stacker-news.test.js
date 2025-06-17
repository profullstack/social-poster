/**
 * Stacker News Platform Tests
 * Testing Stacker News posting functionality with browser-based authentication
 */

import { expect } from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';

describe('Stacker News Platform', () => {
  let sandbox;
  let StackerNewsPlatform;
  let mockPage;
  let stackerNewsPlatform;

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

    // Import the Stacker News platform
    const module = await esmock('../../src/platforms/stacker-news.js', {
      puppeteer: {
        launch: () => ({ newPage: () => mockPage }),
      },
    });
    StackerNewsPlatform = module.StackerNewsPlatform;

    stackerNewsPlatform = new StackerNewsPlatform({
      headless: true,
      timeout: 5000,
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const platform = new StackerNewsPlatform();
      expect(platform.options.headless).to.be.true;
      expect(platform.options.timeout).to.equal(30000);
    });

    it('should initialize with custom options', () => {
      const platform = new StackerNewsPlatform({
        headless: false,
        timeout: 10000,
      });
      expect(platform.options.headless).to.be.false;
      expect(platform.options.timeout).to.equal(10000);
    });
  });

  describe('isLoggedIn', () => {
    it('should return true when user is logged in', async () => {
      mockPage.url.returns('https://stacker.news/');
      mockPage.$.resolves({ textContent: 'testuser' }); // User avatar/name

      const result = await stackerNewsPlatform.isLoggedIn(mockPage);
      expect(result).to.be.true;
    });

    it('should return false when user is not logged in', async () => {
      mockPage.url.returns('https://stacker.news/');
      mockPage.$.resolves(null); // No user avatar

      const result = await stackerNewsPlatform.isLoggedIn(mockPage);
      expect(result).to.be.false;
    });

    it('should return false when on login page', async () => {
      mockPage.url.returns('https://stacker.news/login');

      const result = await stackerNewsPlatform.isLoggedIn(mockPage);
      expect(result).to.be.false;
    });
  });

  describe('navigateToLogin', () => {
    it('should navigate to login page', async () => {
      await stackerNewsPlatform.navigateToLogin(mockPage);
      
      expect(mockPage.goto).to.have.been.calledWith('https://stacker.news/login');
    });
  });

  describe('performLogin', () => {
    it('should perform login with Lightning wallet', async () => {
      const credentials = {
        method: 'lightning',
      };

      mockPage.waitForSelector.resolves();
      mockPage.click.resolves();

      console.log('Starting Stacker News Lightning login process...');
      await stackerNewsPlatform.performLogin(mockPage, credentials);

      expect(mockPage.waitForSelector).to.have.been.calledWith('[data-testid="lightning-login"], .lightning-login');
      expect(mockPage.click).to.have.been.calledWith('[data-testid="lightning-login"], .lightning-login');
    });

    it('should perform login with email/password', async () => {
      const credentials = {
        method: 'email',
        email: 'test@example.com',
        password: 'testpass',
      };

      mockPage.waitForSelector.resolves();
      mockPage.click.resolves();
      mockPage.type.resolves();

      console.log('Starting Stacker News email login process...');
      await stackerNewsPlatform.performLogin(mockPage, credentials);

      expect(mockPage.type).to.have.been.calledWith('input[type="email"]', credentials.email);
      expect(mockPage.type).to.have.been.calledWith('input[type="password"]', credentials.password);
    });

    it('should handle login errors', async () => {
      const credentials = {
        method: 'email',
        email: 'test@example.com',
        password: 'wrongpass',
      };

      mockPage.waitForSelector.rejects(new Error('Element not found'));

      console.log('Starting Stacker News email login process...');
      try {
        await stackerNewsPlatform.performLogin(mockPage, credentials);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Stacker News login failed');
      }
    });
  });

  describe('navigateToSubmit', () => {
    it('should navigate to submit page for links', async () => {
      await stackerNewsPlatform.navigateToSubmit(mockPage, 'link');
      
      expect(mockPage.goto).to.have.been.calledWith('https://stacker.news/post');
    });

    it('should navigate to submit page for discussions', async () => {
      await stackerNewsPlatform.navigateToSubmit(mockPage, 'discussion');
      
      expect(mockPage.goto).to.have.been.calledWith('https://stacker.news/post?type=discussion');
    });
  });

  describe('postLink', () => {
    it('should post link with title', async () => {
      const content = {
        link: 'https://example.com',
        title: 'Check out this Bitcoin article',
      };

      mockPage.waitForSelector.resolves();
      mockPage.type.resolves();
      mockPage.click.resolves();

      await stackerNewsPlatform.postLink(mockPage, content);

      expect(mockPage.type).to.have.been.calledWith('input[name="title"]', content.title);
      expect(mockPage.type).to.have.been.calledWith('input[name="url"]', content.link);
      expect(mockPage.click).to.have.been.calledWith('button[type="submit"]');
    });

    it('should handle posting errors', async () => {
      const content = {
        link: 'https://example.com',
        title: 'Test',
      };

      mockPage.waitForSelector.rejects(new Error('Element not found'));

      try {
        await stackerNewsPlatform.postLink(mockPage, content);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Failed to post to Stacker News');
      }
    });
  });

  describe('postDiscussion', () => {
    it('should post discussion content', async () => {
      const content = {
        text: 'What do you think about Bitcoin adoption?',
        title: 'Bitcoin Discussion',
      };

      mockPage.waitForSelector.resolves();
      mockPage.type.resolves();
      mockPage.click.resolves();

      await stackerNewsPlatform.postDiscussion(mockPage, content);

      expect(mockPage.type).to.have.been.calledWith('input[name="title"]', content.title);
      expect(mockPage.click).to.have.been.calledWith('button[type="submit"]');
    });

    it('should handle text that is too long', async () => {
      const content = {
        text: 'a'.repeat(100000), // Very long text
        title: 'Test',
      };

      try {
        await stackerNewsPlatform.postDiscussion(mockPage, content);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Text is too long');
      }
    });
  });

  describe('extractPostId', () => {
    it('should extract post ID from Stacker News URL', () => {
      const url = 'https://stacker.news/items/123456';
      const postId = stackerNewsPlatform.extractPostId(url);
      
      expect(postId).to.equal('123456');
    });

    it('should return null for invalid URL', () => {
      const url = 'https://example.com/invalid';
      const postId = stackerNewsPlatform.extractPostId(url);
      
      expect(postId).to.be.null;
    });
  });

  describe('waitForPostToLoad', () => {
    it('should wait for post to be published', async () => {
      mockPage.waitForSelector.resolves();
      mockPage.url.returns('https://stacker.news/items/123456');

      const result = await stackerNewsPlatform.waitForPostToLoad(mockPage);
      
      expect(result).to.be.true;
      expect(mockPage.waitForSelector).to.have.been.calledWith('.item, [data-testid="item"]');
    });

    it('should timeout if post does not load', async () => {
      mockPage.waitForSelector.rejects(new Error('Timeout'));

      console.log('Post loading timed out: Timeout');
      const result = await stackerNewsPlatform.waitForPostToLoad(mockPage);
      
      expect(result).to.be.false;
    });
  });

  describe('post', () => {
    it('should handle complete posting flow for link', async () => {
      const content = {
        link: 'https://bitcoin.org',
        title: 'Bitcoin Whitepaper',
        type: 'link',
      };

      // Mock successful login check
      stackerNewsPlatform.isLoggedIn = sandbox.stub().resolves(true);
      stackerNewsPlatform.navigateToSubmit = sandbox.stub().resolves();
      stackerNewsPlatform.postLink = sandbox.stub().resolves();
      stackerNewsPlatform.waitForPostToLoad = sandbox.stub().resolves(true);
      stackerNewsPlatform.extractPostId = sandbox.stub().returns('123456');
      mockPage.url.returns('https://stacker.news/items/123456');

      const result = await stackerNewsPlatform.post(mockPage, content);

      expect(result.success).to.be.true;
      expect(result.postId).to.equal('123456');
    });

    it('should handle complete posting flow for discussion', async () => {
      const content = {
        text: 'Bitcoin discussion content',
        title: 'Bitcoin Talk',
        type: 'discussion',
      };

      // Mock successful login check
      stackerNewsPlatform.isLoggedIn = sandbox.stub().resolves(true);
      stackerNewsPlatform.navigateToSubmit = sandbox.stub().resolves();
      stackerNewsPlatform.postDiscussion = sandbox.stub().resolves();
      stackerNewsPlatform.waitForPostToLoad = sandbox.stub().resolves(true);
      stackerNewsPlatform.extractPostId = sandbox.stub().returns('123456');
      mockPage.url.returns('https://stacker.news/items/123456');

      const result = await stackerNewsPlatform.post(mockPage, content);

      expect(result.success).to.be.true;
      expect(result.postId).to.equal('123456');
    });

    it('should handle login requirement', async () => {
      const content = {
        link: 'https://example.com',
        title: 'Test',
        type: 'link',
      };

      // Mock not logged in
      stackerNewsPlatform.isLoggedIn = sandbox.stub().resolves(false);

      const result = await stackerNewsPlatform.post(mockPage, content);

      expect(result.success).to.be.false;
      expect(result.error).to.include('authentication required');
    });

    it('should require title for all posts', async () => {
      const content = {
        link: 'https://example.com',
        type: 'link',
      };

      // Mock logged in
      stackerNewsPlatform.isLoggedIn = sandbox.stub().resolves(true);

      const result = await stackerNewsPlatform.post(mockPage, content);

      expect(result.success).to.be.false;
      expect(result.error).to.include('Title is required');
    });
  });
});