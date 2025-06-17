/**
 * Hacker News Platform Tests
 * Testing Hacker News posting functionality with browser-based authentication
 */

import { expect } from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';

describe('Hacker News Platform', () => {
  let sandbox;
  let HackerNewsPlatform;
  let mockPage;
  let hackerNewsPlatform;

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
    };

    // Import the Hacker News platform
    const module = await esmock('../../src/platforms/hacker-news.js', {
      puppeteer: {
        launch: () => ({ newPage: () => mockPage }),
      },
    });
    HackerNewsPlatform = module.HackerNewsPlatform;

    hackerNewsPlatform = new HackerNewsPlatform({
      headless: true,
      timeout: 5000,
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const platform = new HackerNewsPlatform();
      expect(platform.options.headless).to.be.true;
      expect(platform.options.timeout).to.equal(30000);
    });

    it('should initialize with custom options', () => {
      const platform = new HackerNewsPlatform({
        headless: false,
        timeout: 10000,
      });
      expect(platform.options.headless).to.be.false;
      expect(platform.options.timeout).to.equal(10000);
    });
  });

  describe('isLoggedIn', () => {
    it('should return true when user is logged in', async () => {
      mockPage.url.returns('https://news.ycombinator.com/');
      mockPage.$.resolves({ textContent: 'testuser' }); // User link

      const result = await hackerNewsPlatform.isLoggedIn(mockPage);
      expect(result).to.be.true;
    });

    it('should return false when user is not logged in', async () => {
      mockPage.url.returns('https://news.ycombinator.com/');
      mockPage.$.resolves(null); // No user link

      const result = await hackerNewsPlatform.isLoggedIn(mockPage);
      expect(result).to.be.false;
    });

    it('should return false when on login page', async () => {
      mockPage.url.returns('https://news.ycombinator.com/login');

      const result = await hackerNewsPlatform.isLoggedIn(mockPage);
      expect(result).to.be.false;
    });
  });

  describe('navigateToLogin', () => {
    it('should navigate to login page', async () => {
      await hackerNewsPlatform.navigateToLogin(mockPage);
      
      expect(mockPage.goto).to.have.been.calledWith('https://news.ycombinator.com/login');
    });
  });

  describe('performLogin', () => {
    it('should perform login with credentials', async () => {
      const credentials = {
        username: 'testuser',
        password: 'testpass',
      };

      mockPage.waitForSelector.resolves();
      mockPage.click.resolves();
      mockPage.type.resolves();
      mockPage.waitForNavigation.resolves();

      console.log('Starting Hacker News login process...');
      await hackerNewsPlatform.performLogin(mockPage, credentials);

      expect(mockPage.waitForSelector).to.have.been.calledWith('input[name="acct"]');
      expect(mockPage.type).to.have.been.calledWith('input[name="acct"]', credentials.username);
      expect(mockPage.type).to.have.been.calledWith('input[name="pw"]', credentials.password);
      expect(mockPage.click).to.have.been.calledWith('input[type="submit"]');
    });

    it('should handle login errors', async () => {
      const credentials = {
        username: 'testuser',
        password: 'wrongpass',
      };

      mockPage.waitForSelector.rejects(new Error('Element not found'));

      console.log('Starting Hacker News login process...');
      try {
        await hackerNewsPlatform.performLogin(mockPage, credentials);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Hacker News login failed');
      }
    });
  });

  describe('navigateToSubmit', () => {
    it('should navigate to submit page', async () => {
      await hackerNewsPlatform.navigateToSubmit(mockPage);
      
      expect(mockPage.goto).to.have.been.calledWith('https://news.ycombinator.com/submit');
    });
  });

  describe('postLink', () => {
    it('should post link with title', async () => {
      const content = {
        link: 'https://example.com',
        title: 'Check out this link',
      };

      mockPage.waitForSelector.resolves();
      mockPage.type.resolves();
      mockPage.click.resolves();

      await hackerNewsPlatform.postLink(mockPage, content);

      expect(mockPage.type).to.have.been.calledWith('input[name="title"]', content.title);
      expect(mockPage.type).to.have.been.calledWith('input[name="url"]', content.link);
      expect(mockPage.click).to.have.been.calledWith('input[type="submit"]');
    });

    it('should post link without title', async () => {
      const content = {
        link: 'https://example.com',
      };

      mockPage.waitForSelector.resolves();
      mockPage.type.resolves();
      mockPage.click.resolves();

      await hackerNewsPlatform.postLink(mockPage, content);

      expect(mockPage.type).to.have.been.calledWith('input[name="url"]', content.link);
    });

    it('should handle posting errors', async () => {
      const content = {
        link: 'https://example.com',
        title: 'Test',
      };

      mockPage.waitForSelector.rejects(new Error('Element not found'));

      try {
        await hackerNewsPlatform.postLink(mockPage, content);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Failed to post to Hacker News');
      }
    });
  });

  describe('postText', () => {
    it('should post text content (Ask HN)', async () => {
      const content = {
        text: 'This is a test Ask HN post',
        title: 'Ask HN: Test Question',
      };

      mockPage.waitForSelector.resolves();
      mockPage.type.resolves();
      mockPage.click.resolves();

      await hackerNewsPlatform.postText(mockPage, content);

      expect(mockPage.type).to.have.been.calledWith('input[name="title"]', content.title);
      expect(mockPage.type).to.have.been.calledWith('textarea[name="text"]', content.text);
      expect(mockPage.click).to.have.been.calledWith('input[type="submit"]');
    });

    it('should handle text that is too long', async () => {
      const content = {
        text: 'a'.repeat(10000), // Hacker News has shorter limits
        title: 'Test',
      };

      try {
        await hackerNewsPlatform.postText(mockPage, content);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Text is too long');
      }
    });
  });

  describe('extractPostId', () => {
    it('should extract post ID from Hacker News URL', () => {
      const url = 'https://news.ycombinator.com/item?id=12345678';
      const postId = hackerNewsPlatform.extractPostId(url);
      
      expect(postId).to.equal('12345678');
    });

    it('should return null for invalid URL', () => {
      const url = 'https://example.com/invalid';
      const postId = hackerNewsPlatform.extractPostId(url);
      
      expect(postId).to.be.null;
    });
  });

  describe('waitForPostToLoad', () => {
    it.skip('should wait for post to be published', async () => {
      mockPage.waitForSelector.resolves();
      mockPage.url.returns('https://news.ycombinator.com/item?id=12345678');

      const result = await hackerNewsPlatform.waitForPostToLoad(mockPage);
      
      expect(result).to.be.true;
      expect(mockPage.waitForSelector).to.have.been.calledWith('.athing');
    });

    it('should timeout if post does not load', async () => {
      mockPage.waitForSelector.rejects(new Error('Timeout'));

      console.log('Post loading timed out: Timeout');
      const result = await hackerNewsPlatform.waitForPostToLoad(mockPage);
      
      expect(result).to.be.false;
    });
  });

  describe('post', () => {
    it('should handle complete posting flow for link', async () => {
      const content = {
        link: 'https://example.com',
        title: 'Test Link',
        type: 'link',
      };

      // Mock successful login check
      hackerNewsPlatform.isLoggedIn = sandbox.stub().resolves(true);
      hackerNewsPlatform.navigateToSubmit = sandbox.stub().resolves();
      hackerNewsPlatform.postLink = sandbox.stub().resolves();
      hackerNewsPlatform.waitForPostToLoad = sandbox.stub().resolves(true);
      hackerNewsPlatform.extractPostId = sandbox.stub().returns('12345678');
      mockPage.url.returns('https://news.ycombinator.com/item?id=12345678');

      const result = await hackerNewsPlatform.post(mockPage, content);

      expect(result.success).to.be.true;
      expect(result.postId).to.equal('12345678');
    });

    it('should handle complete posting flow for text', async () => {
      const content = {
        text: 'Test Ask HN post',
        title: 'Ask HN: Test',
        type: 'text',
      };

      // Mock successful login check
      hackerNewsPlatform.isLoggedIn = sandbox.stub().resolves(true);
      hackerNewsPlatform.navigateToSubmit = sandbox.stub().resolves();
      hackerNewsPlatform.postText = sandbox.stub().resolves();
      hackerNewsPlatform.waitForPostToLoad = sandbox.stub().resolves(true);
      hackerNewsPlatform.extractPostId = sandbox.stub().returns('12345678');
      mockPage.url.returns('https://news.ycombinator.com/item?id=12345678');

      const result = await hackerNewsPlatform.post(mockPage, content);

      expect(result.success).to.be.true;
      expect(result.postId).to.equal('12345678');
    });

    it('should handle login requirement', async () => {
      const content = {
        link: 'https://example.com',
        title: 'Test',
        type: 'link',
      };

      // Mock not logged in
      hackerNewsPlatform.isLoggedIn = sandbox.stub().resolves(false);

      const result = await hackerNewsPlatform.post(mockPage, content);

      expect(result.success).to.be.false;
      expect(result.error).to.include('authentication required');
    });

    it.skip('should require title for all posts', async () => {
      const content = {
        link: 'https://example.com',
        type: 'link',
      };

      // Mock logged in
      hackerNewsPlatform.isLoggedIn = sandbox.stub().resolves(true);

      const result = await hackerNewsPlatform.post(mockPage, content);

      expect(result.success).to.be.false;
      expect(result.error).to.include('Title is required');
    });
  });
});