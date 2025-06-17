/**
 * Primal (Nostr) Platform Tests
 * Testing Primal/Nostr posting functionality with private key authentication
 */

import { expect } from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';

describe('Primal Platform', () => {
  let sandbox;
  let PrimalPlatform;
  let mockPage;
  let primalPlatform;

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

    // Mock crypto functions for Nostr
    global.crypto = {
      getRandomValues: sandbox.stub().returns(new Uint8Array(32)),
      subtle: {
        importKey: sandbox.stub(),
        sign: sandbox.stub(),
        digest: sandbox.stub(),
      },
    };

    // Import the Primal platform
    const module = await esmock('../../src/platforms/primal.js', {
      puppeteer: {
        launch: () => ({ newPage: () => mockPage }),
      },
    });
    PrimalPlatform = module.PrimalPlatform;

    primalPlatform = new PrimalPlatform({
      headless: true,
      timeout: 5000,
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const platform = new PrimalPlatform();
      expect(platform.options.headless).to.be.true;
      expect(platform.options.timeout).to.equal(30000);
    });

    it('should initialize with custom options', () => {
      const platform = new PrimalPlatform({
        headless: false,
        timeout: 10000,
      });
      expect(platform.options.headless).to.be.false;
      expect(platform.options.timeout).to.equal(10000);
    });
  });

  describe('generateKeyPair', () => {
    it('should generate a valid Nostr key pair', () => {
      const keyPair = primalPlatform.generateKeyPair();
      
      expect(keyPair).to.have.property('privateKey');
      expect(keyPair).to.have.property('publicKey');
      expect(keyPair.privateKey).to.be.a('string');
      expect(keyPair.publicKey).to.be.a('string');
      expect(keyPair.privateKey).to.have.length(64); // 32 bytes in hex
      expect(keyPair.publicKey).to.have.length(64); // 32 bytes in hex
    });
  });

  describe('validatePrivateKey', () => {
    it('should validate correct private key format', () => {
      const validKey = 'a'.repeat(64); // 64 hex characters
      const result = primalPlatform.validatePrivateKey(validKey);
      
      expect(result).to.be.true;
    });

    it('should reject invalid private key format', () => {
      const invalidKey = 'invalid';
      const result = primalPlatform.validatePrivateKey(invalidKey);
      
      expect(result).to.be.false;
    });

    it('should reject private key with wrong length', () => {
      const shortKey = 'a'.repeat(32); // Too short
      const result = primalPlatform.validatePrivateKey(shortKey);
      
      expect(result).to.be.false;
    });
  });

  describe('getPublicKeyFromPrivate', () => {
    it('should derive public key from private key', () => {
      const privateKey = 'a'.repeat(64);
      const publicKey = primalPlatform.getPublicKeyFromPrivate(privateKey);
      
      expect(publicKey).to.be.a('string');
      expect(publicKey).to.have.length(64);
    });
  });

  describe('createNostrEvent', () => {
    it('should create a valid Nostr event', () => {
      const privateKey = 'a'.repeat(64);
      const content = 'Hello Nostr!';
      
      const event = primalPlatform.createNostrEvent(privateKey, content);
      
      expect(event).to.have.property('id');
      expect(event).to.have.property('pubkey');
      expect(event).to.have.property('created_at');
      expect(event).to.have.property('kind');
      expect(event).to.have.property('tags');
      expect(event).to.have.property('content');
      expect(event).to.have.property('sig');
      expect(event.kind).to.equal(1); // Text note
      expect(event.content).to.equal(content);
    });

    it('should create event with tags', () => {
      const privateKey = 'a'.repeat(64);
      const content = 'Hello #nostr!';
      const tags = [['t', 'nostr']];
      
      const event = primalPlatform.createNostrEvent(privateKey, content, tags);
      
      expect(event.tags).to.deep.equal(tags);
    });
  });

  describe('isLoggedIn', () => {
    it('should return true when user is logged in', async () => {
      mockPage.url.returns('https://primal.net/');
      mockPage.$.resolves({ textContent: 'testuser' }); // User profile

      const result = await primalPlatform.isLoggedIn(mockPage);
      expect(result).to.be.true;
    });

    it('should return false when user is not logged in', async () => {
      mockPage.url.returns('https://primal.net/');
      mockPage.$.resolves(null); // No user profile

      const result = await primalPlatform.isLoggedIn(mockPage);
      expect(result).to.be.false;
    });
  });

  describe('navigateToLogin', () => {
    it('should navigate to login page', async () => {
      await primalPlatform.navigateToLogin(mockPage);
      
      expect(mockPage.goto).to.have.been.calledWith('https://primal.net/login');
    });
  });

  describe('performLogin', () => {
    it('should perform login with private key', async () => {
      const credentials = {
        privateKey: 'a'.repeat(64),
      };

      mockPage.waitForSelector.resolves();
      mockPage.type.resolves();
      mockPage.click.resolves();
      mockPage.waitForNavigation.resolves();

      console.log('Starting Primal login with private key...');
      await primalPlatform.performLogin(mockPage, credentials);

      expect(mockPage.waitForSelector).to.have.been.calledWith('input[name="privateKey"], [data-testid="private-key-input"]');
      expect(mockPage.type).to.have.been.calledWith('input[name="privateKey"], [data-testid="private-key-input"]', credentials.privateKey);
      expect(mockPage.click).to.have.been.calledWith('button[type="submit"], [data-testid="login-button"]');
    });

    it('should handle login errors', async () => {
      const credentials = {
        privateKey: 'invalid',
      };

      mockPage.waitForSelector.rejects(new Error('Element not found'));

      console.log('Starting Primal login with private key...');
      try {
        await primalPlatform.performLogin(mockPage, credentials);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Primal login failed');
      }
    });
  });

  describe('navigateToCompose', () => {
    it('should navigate to compose page', async () => {
      await primalPlatform.navigateToCompose(mockPage);
      
      expect(mockPage.goto).to.have.been.calledWith('https://primal.net/compose');
    });
  });

  describe('postNote', () => {
    it('should post text note', async () => {
      const content = {
        text: 'Hello Nostr world!',
      };

      mockPage.waitForSelector.resolves();
      mockPage.type.resolves();
      mockPage.click.resolves();

      await primalPlatform.postNote(mockPage, content);

      expect(mockPage.waitForSelector).to.have.been.calledWith('textarea[name="content"], [data-testid="note-input"]');
      expect(mockPage.type).to.have.been.calledWith('textarea[name="content"], [data-testid="note-input"]', content.text);
      expect(mockPage.click).to.have.been.calledWith('button[type="submit"], [data-testid="post-button"]');
    });

    it('should handle posting errors', async () => {
      const content = {
        text: 'Test note',
      };

      mockPage.waitForSelector.rejects(new Error('Element not found'));

      try {
        await primalPlatform.postNote(mockPage, content);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Failed to post to Primal');
      }
    });

    it('should handle text that is too long', async () => {
      const content = {
        text: 'a'.repeat(10000), // Very long text
      };

      try {
        await primalPlatform.postNote(mockPage, content);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Text is too long');
      }
    });
  });

  describe('extractNoteId', () => {
    it('should extract note ID from Primal URL', () => {
      const url = 'https://primal.net/e/note1abc123def456';
      const noteId = primalPlatform.extractNoteId(url);
      
      expect(noteId).to.equal('note1abc123def456');
    });

    it('should return null for invalid URL', () => {
      const url = 'https://example.com/invalid';
      const noteId = primalPlatform.extractNoteId(url);
      
      expect(noteId).to.be.null;
    });
  });

  describe('waitForNoteToLoad', () => {
    it('should wait for note to be published', async () => {
      mockPage.waitForSelector.resolves();
      mockPage.url.returns('https://primal.net/e/note1abc123def456');

      const result = await primalPlatform.waitForNoteToLoad(mockPage);
      
      expect(result).to.be.true;
      expect(mockPage.waitForSelector).to.have.been.calledWith('.note, [data-testid="note"]');
    });

    it('should timeout if note does not load', async () => {
      mockPage.waitForSelector.rejects(new Error('Timeout'));

      console.log('Note loading timed out: Timeout');
      const result = await primalPlatform.waitForNoteToLoad(mockPage);
      
      expect(result).to.be.false;
    });
  });

  describe('post', () => {
    it('should handle complete posting flow', async () => {
      const content = {
        text: 'Hello Nostr!',
        type: 'text',
      };

      // Mock successful login check
      primalPlatform.isLoggedIn = sandbox.stub().resolves(true);
      primalPlatform.navigateToCompose = sandbox.stub().resolves();
      primalPlatform.postNote = sandbox.stub().resolves();
      primalPlatform.waitForNoteToLoad = sandbox.stub().resolves(true);
      primalPlatform.extractNoteId = sandbox.stub().returns('note1abc123def456');
      mockPage.url.returns('https://primal.net/e/note1abc123def456');

      const result = await primalPlatform.post(mockPage, content);

      expect(result.success).to.be.true;
      expect(result.postId).to.equal('note1abc123def456');
    });

    it('should handle login requirement', async () => {
      const content = {
        text: 'Test note',
        type: 'text',
      };

      // Mock not logged in
      primalPlatform.isLoggedIn = sandbox.stub().resolves(false);

      const result = await primalPlatform.post(mockPage, content);

      expect(result.success).to.be.false;
      expect(result.error).to.include('authentication required');
    });

    it('should require text content', async () => {
      const content = {
        type: 'text',
      };

      // Mock logged in
      primalPlatform.isLoggedIn = sandbox.stub().resolves(true);

      const result = await primalPlatform.post(mockPage, content);

      expect(result.success).to.be.false;
      expect(result.error).to.include('Text content is required');
    });
  });
});