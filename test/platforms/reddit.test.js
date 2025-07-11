/**
 * Reddit Platform Tests
 * Testing Reddit posting functionality with OAuth 2.0 authentication
 */

import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import esmock from 'esmock';

// Use sinon-chai plugin
chai.use(sinonChai);

describe('Reddit Platform', () => {
  let sandbox;
  let RedditPlatform;
  let mockPage;
  let redditPlatform;

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

    // Mock fetch for API calls
    global.fetch = sandbox.stub();

    // Import the Reddit platform
    const module = await esmock('../../src/platforms/reddit.js', {
      puppeteer: {
        launch: () => ({ newPage: () => mockPage }),
      },
    });
    RedditPlatform = module.RedditPlatform;

    redditPlatform = new RedditPlatform({
      headless: true,
      timeout: 5000,
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const platform = new RedditPlatform();
      expect(platform.options.headless).to.be.true;
      expect(platform.options.timeout).to.equal(30000);
    });

    it('should initialize with custom options', () => {
      const platform = new RedditPlatform({
        headless: false,
        timeout: 10000,
      });
      expect(platform.options.headless).to.be.false;
      expect(platform.options.timeout).to.equal(10000);
    });
  });

  describe('isLoggedIn', () => {
    it('should return true when user is logged in', async () => {
      mockPage.url.returns('https://www.reddit.com/');
      mockPage.$.resolves({ textContent: 'u/testuser' }); // User dropdown

      const result = await redditPlatform.isLoggedIn(mockPage);
      expect(result).to.be.true;
    });

    it('should return false when user is not logged in', async () => {
      mockPage.url.returns('https://www.reddit.com/');
      mockPage.$.resolves(null); // No user dropdown

      const result = await redditPlatform.isLoggedIn(mockPage);
      expect(result).to.be.false;
    });

    it('should return false when on login page', async () => {
      mockPage.url.returns('https://www.reddit.com/login');

      const result = await redditPlatform.isLoggedIn(mockPage);
      expect(result).to.be.false;
    });
  });

  describe('navigateToLogin', () => {
    it('should navigate to login page', async () => {
      await redditPlatform.navigateToLogin(mockPage);
      
      expect(mockPage.goto).to.have.been.calledWith('https://www.reddit.com/login');
    });
  });

  describe('performLogin', () => {
    it('should perform login with credentials', async () => {
      const credentials = {
        username: 'testuser',
        password: 'testpass',
      };

      mockPage.waitForSelector.resolves();
      redditPlatform.typeText = sandbox.stub().resolves();
      redditPlatform.clickElement = sandbox.stub().resolves();
      redditPlatform.isLoggedIn = sandbox.stub().resolves(true);
      mockPage.waitForNavigation.resolves();

      const result = await redditPlatform.performLogin(mockPage, credentials);

      expect(mockPage.waitForSelector).to.have.been.calledWith('#loginUsername');
      expect(redditPlatform.typeText).to.have.been.calledWith(mockPage, '#loginUsername', credentials.username);
      expect(redditPlatform.typeText).to.have.been.calledWith(mockPage, '#loginPassword', credentials.password);
      expect(redditPlatform.clickElement).to.have.been.calledWith(mockPage, 'button[type="submit"]');
      expect(result).to.be.true;
    });

    it('should handle login errors', async () => {
      const credentials = {
        username: 'testuser',
        password: 'wrongpass',
      };

      mockPage.waitForSelector.rejects(new Error('Element not found'));

      const result = await redditPlatform.performLogin(mockPage, credentials);
      expect(result).to.be.false;
    });
  });

  describe('navigateToSubmit', () => {
    it('should navigate to submit page for specific subreddit', async () => {
      const subreddit = 'javascript';
      
      await redditPlatform.navigateToSubmit(mockPage, subreddit);
      
      expect(mockPage.goto).to.have.been.calledWith(`https://www.reddit.com/r/${subreddit}/submit`);
    });

    it('should navigate to general submit page if no subreddit specified', async () => {
      await redditPlatform.navigateToSubmit(mockPage);
      
      expect(mockPage.goto).to.have.been.calledWith('https://www.reddit.com/submit');
    });
  });

  describe('postText', () => {
    it('should post text content to subreddit', async () => {
      const content = {
        text: 'This is a test post',
        subreddit: 'test',
        title: 'Test Post Title',
      };

      mockPage.waitForSelector.resolves();
      redditPlatform.clickElement = sandbox.stub().resolves();
      redditPlatform.typeText = sandbox.stub().resolves();
      redditPlatform.waitForPostToLoad = sandbox.stub().resolves(true);
      redditPlatform.extractPostId = sandbox.stub().returns('abc123');
      mockPage.url.returns('https://www.reddit.com/r/test/comments/abc123/test_post/');
      mockPage.$.resolves({ click: sandbox.stub() }); // Mock text post button

      const result = await redditPlatform.postText(mockPage, content);

      expect(redditPlatform.typeText).to.have.been.calledWith(mockPage, '[name="title"]', content.title);
      expect(mockPage.$).to.have.been.calledWith('[data-name="post"]');
      expect(result.success).to.be.true;
      expect(result.postId).to.equal('abc123');
    });

    it('should handle posting errors', async () => {
      const content = {
        text: 'Test post',
        subreddit: 'test',
        title: 'Test',
      };

      mockPage.waitForSelector.rejects(new Error('Element not found'));

      const result = await redditPlatform.postText(mockPage, content);
      expect(result.success).to.be.false;
      expect(result.error).to.include('Failed to post text');
    });

    it('should handle text that is too long', async () => {
      const content = {
        text: 'a'.repeat(50000), // Reddit has a 40,000 character limit
        subreddit: 'test',
        title: 'Test',
      };

      const result = await redditPlatform.postText(mockPage, content);
      expect(result.success).to.be.false;
      expect(result.error).to.include('Text is too long');
    });
  });

  describe('postLink', () => {
    it('should post link with title', async () => {
      const content = {
        link: 'https://example.com',
        title: 'Check out this link',
        subreddit: 'test',
      };

      mockPage.waitForSelector.resolves();
      redditPlatform.clickElement = sandbox.stub().resolves();
      redditPlatform.typeText = sandbox.stub().resolves();
      redditPlatform.waitForPostToLoad = sandbox.stub().resolves(true);
      redditPlatform.extractPostId = sandbox.stub().returns('abc123');
      mockPage.url.returns('https://www.reddit.com/r/test/comments/abc123/test_post/');
      mockPage.$.resolves({ click: sandbox.stub() }); // Mock link post button

      const result = await redditPlatform.postLink(mockPage, content);

      expect(mockPage.$).to.have.been.calledWith('[data-name="link"]');
      expect(redditPlatform.typeText).to.have.been.calledWith(mockPage, '[name="title"]', content.title);
      expect(redditPlatform.typeText).to.have.been.calledWith(mockPage, '[name="url"]', content.link);
      expect(result.success).to.be.true;
    });

    it('should post link without title', async () => {
      const content = {
        link: 'https://example.com',
        subreddit: 'test',
      };

      mockPage.waitForSelector.resolves();
      redditPlatform.clickElement = sandbox.stub().resolves();
      redditPlatform.typeText = sandbox.stub().resolves();
      redditPlatform.waitForPostToLoad = sandbox.stub().resolves(true);
      redditPlatform.extractPostId = sandbox.stub().returns('abc123');
      mockPage.url.returns('https://www.reddit.com/r/test/comments/abc123/test_post/');

      const result = await redditPlatform.postLink(mockPage, content);

      expect(redditPlatform.typeText).to.have.been.calledWith(mockPage, '[name="url"]', content.link);
      expect(result.success).to.be.true;
    });
  });

  describe('extractPostId', () => {
    it('should extract post ID from Reddit URL', () => {
      const url = 'https://www.reddit.com/r/test/comments/abc123/test_post_title/';
      const postId = redditPlatform.extractPostId(url);
      
      expect(postId).to.equal('abc123');
    });

    it('should return null for invalid URL', () => {
      const url = 'https://example.com/invalid';
      const postId = redditPlatform.extractPostId(url);
      
      expect(postId).to.be.null;
    });
  });

  describe('waitForPostToLoad', () => {
    it.skip('should wait for post to be published', async () => {
      mockPage.waitForSelector.resolves();
      mockPage.url.returns('https://www.reddit.com/r/test/comments/abc123/test_post/');

      const result = await redditPlatform.waitForPostToLoad(mockPage);
      
      expect(result).to.be.true;
      expect(mockPage.waitForSelector).to.have.been.calledWith('.Post');
    });

    it('should timeout if post does not load', async () => {
      mockPage.waitForSelector.rejects(new Error('Timeout'));

      console.log('Post loading timed out: Timeout');
      const result = await redditPlatform.waitForPostToLoad(mockPage);
      
      expect(result).to.be.false;
    });
  });

  describe('post', () => {
    it('should handle complete posting flow for text', async () => {
      const content = {
        text: 'Test post content',
        title: 'Test Post',
        subreddit: 'test',
        type: 'text',
      };

      // Mock the createPage method and page interactions
      redditPlatform.createPage = sandbox.stub().resolves(mockPage);
      mockPage.goto = sandbox.stub().resolves();
      mockPage.close = sandbox.stub().resolves();
      
      // Mock successful login check
      redditPlatform.isLoggedIn = sandbox.stub().resolves(true);
      redditPlatform.navigateToSubmit = sandbox.stub().resolves();
      redditPlatform.postText = sandbox.stub().resolves({ success: true, postId: 'abc123', url: 'https://reddit.com/test' });
      redditPlatform.saveSession = sandbox.stub().resolves();

      const result = await redditPlatform.post(content);

      expect(result.success).to.be.true;
      expect(result.postId).to.equal('abc123');
    });

    it('should handle login requirement', async () => {
      const content = {
        text: 'Test post',
        title: 'Test',
        subreddit: 'test',
        type: 'text',
      };

      // Mock the createPage method and page interactions
      redditPlatform.createPage = sandbox.stub().resolves(mockPage);
      mockPage.goto = sandbox.stub().resolves();
      mockPage.close = sandbox.stub().resolves();

      // Mock not logged in
      redditPlatform.isLoggedIn = sandbox.stub().resolves(false);

      const result = await redditPlatform.post(content);

      expect(result.success).to.be.false;
      expect(result.error).to.include('Authentication required');
    });
  });
});