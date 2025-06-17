/**
 * CLI Tests
 * Testing command-line interface functionality
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import CLI functions to test
import {
  parsePostContent,
  validatePostOptions,
  formatPlatformList,
  handlePostCommand,
  handleLoginCommand,
  handleStatusCommand,
  handlePlatformsCommand,
} from '../bin/social-poster.js';

describe('CLI', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('parsePostContent', () => {
    it('should parse text-only post', () => {
      const argv = {
        _: ['post', 'Hello world!'],
        text: undefined,
        link: undefined,
      };

      const content = parsePostContent(argv);
      
      expect(content.text).to.equal('Hello world!');
      expect(content.link).to.be.undefined;
      expect(content.type).to.equal('text');
    });

    it('should parse text and link from options', () => {
      const argv = {
        _: ['post'],
        text: 'Check out my site',
        link: 'https://example.com',
      };

      const content = parsePostContent(argv);
      
      expect(content.text).to.equal('Check out my site');
      expect(content.link).to.equal('https://example.com');
      expect(content.type).to.equal('link');
    });

    it('should parse link-only post', () => {
      const argv = {
        _: ['post'],
        text: undefined,
        link: 'https://example.com',
      };

      const content = parsePostContent(argv);
      
      expect(content.text).to.be.undefined;
      expect(content.link).to.equal('https://example.com');
      expect(content.type).to.equal('link');
    });

    it('should prioritize options over positional arguments', () => {
      const argv = {
        _: ['post', 'Positional text'],
        text: 'Option text',
        link: 'https://example.com',
      };

      const content = parsePostContent(argv);
      
      expect(content.text).to.equal('Option text');
      expect(content.link).to.equal('https://example.com');
    });
  });

  describe('validatePostOptions', () => {
    it('should validate valid text post', () => {
      const content = {
        text: 'Hello world!',
        type: 'text',
      };

      const result = validatePostOptions(content);
      
      expect(result.valid).to.be.true;
      expect(result.errors).to.be.empty;
    });

    it('should validate valid link post', () => {
      const content = {
        text: 'Check this out',
        link: 'https://example.com',
        type: 'link',
      };

      const result = validatePostOptions(content);
      
      expect(result.valid).to.be.true;
      expect(result.errors).to.be.empty;
    });

    it('should reject empty content', () => {
      const content = {
        type: 'text',
      };

      const result = validatePostOptions(content);
      
      expect(result.valid).to.be.false;
      expect(result.errors).to.include('Post content cannot be empty');
    });

    it('should reject invalid URL', () => {
      const content = {
        text: 'Check this out',
        link: 'not-a-url',
        type: 'link',
      };

      const result = validatePostOptions(content);
      
      expect(result.valid).to.be.false;
      expect(result.errors).to.include('Invalid URL format');
    });

    it('should reject text that is too long', () => {
      const content = {
        text: 'a'.repeat(300), // Assuming 280 character limit
        type: 'text',
      };

      const result = validatePostOptions(content);
      
      expect(result.valid).to.be.false;
      expect(result.errors).to.include('Text is too long (maximum 280 characters)');
    });
  });

  describe('formatPlatformList', () => {
    it('should format platform list with status', () => {
      const platforms = [
        { name: 'x', displayName: 'X (Twitter)', enabled: true, loggedIn: true },
        { name: 'linkedin', displayName: 'LinkedIn', enabled: true, loggedIn: false },
        { name: 'reddit', displayName: 'Reddit', enabled: false, loggedIn: false },
      ];

      const formatted = formatPlatformList(platforms);
      
      expect(formatted).to.include('X (Twitter)');
      expect(formatted).to.include('✅'); // Logged in
      expect(formatted).to.include('❌'); // Not logged in
      expect(formatted).to.include('⚪'); // Disabled
    });

    it('should handle empty platform list', () => {
      const platforms = [];
      const formatted = formatPlatformList(platforms);
      
      expect(formatted).to.include('No platforms configured');
    });
  });

  describe('handlePostCommand', () => {
    let mockPostService;

    beforeEach(() => {
      mockPostService = {
        post: sandbox.stub(),
        getAvailablePlatforms: sandbox.stub(),
      };
    });

    it('should post to all platforms by default', async () => {
      const argv = {
        _: ['post', 'Hello world!'],
        platforms: undefined,
      };

      mockPostService.getAvailablePlatforms.resolves(['x', 'linkedin']);
      mockPostService.post.resolves({
        success: true,
        results: {
          x: { success: true, postId: '123' },
          linkedin: { success: true, postId: '456' },
        },
      });

      // Mock console.log to capture output
      const consoleStub = sandbox.stub(console, 'log');

      await handlePostCommand(argv, mockPostService);

      expect(mockPostService.post.calledOnce).to.be.true;
      expect(consoleStub.called).to.be.true;
    });

    it('should post to specific platforms when specified', async () => {
      const argv = {
        _: ['post', 'Hello world!'],
        platforms: 'x,linkedin',
      };

      mockPostService.post.resolves({
        success: true,
        results: {
          x: { success: true, postId: '123' },
          linkedin: { success: true, postId: '456' },
        },
      });

      const consoleStub = sandbox.stub(console, 'log');

      await handlePostCommand(argv, mockPostService);

      const postCall = mockPostService.post.getCall(0);
      expect(postCall.args[1]).to.deep.equal(['x', 'linkedin']);
    });

    it('should handle post failures gracefully', async () => {
      const argv = {
        _: ['post', 'Hello world!'],
      };

      mockPostService.getAvailablePlatforms.resolves(['x']);
      mockPostService.post.resolves({
        success: false,
        results: {
          x: { success: false, error: 'Authentication failed' },
        },
      });

      const consoleStub = sandbox.stub(console, 'error');

      await handlePostCommand(argv, mockPostService);

      expect(consoleStub.called).to.be.true;
    });
  });

  describe('handleLoginCommand', () => {
    let mockBrowserAutomation;

    beforeEach(() => {
      mockBrowserAutomation = {
        login: sandbox.stub(),
        sessionManager: {
          getValidPlatforms: sandbox.stub(),
        },
      };
    });

    it('should login to specific platform', async () => {
      const argv = {
        _: ['login', 'x'],
      };

      mockBrowserAutomation.login.resolves(true);

      const consoleStub = sandbox.stub(console, 'log');

      await handleLoginCommand(argv, mockBrowserAutomation);

      expect(mockBrowserAutomation.login.calledWith('x')).to.be.true;
      expect(consoleStub.called).to.be.true;
    });

    it('should login to all platforms when none specified', async () => {
      const argv = {
        _: ['login'],
      };

      const platforms = ['x', 'linkedin', 'reddit'];
      mockBrowserAutomation.login.resolves(true);

      const consoleStub = sandbox.stub(console, 'log');

      // This would need to be implemented to handle multiple platforms
      await handleLoginCommand(argv, mockBrowserAutomation);

      expect(consoleStub.called).to.be.true;
    });

    it('should handle login failures', async () => {
      const argv = {
        _: ['login', 'x'],
      };

      mockBrowserAutomation.login.rejects(new Error('Login failed'));

      const consoleStub = sandbox.stub(console, 'error');

      await handleLoginCommand(argv, mockBrowserAutomation);

      expect(consoleStub.called).to.be.true;
    });
  });

  describe('handleStatusCommand', () => {
    let mockSessionManager;
    let mockConfig;

    beforeEach(() => {
      mockSessionManager = {
        isSessionValid: sandbox.stub(),
        getValidPlatforms: sandbox.stub(),
      };

      mockConfig = {
        platforms: {
          x: { enabled: true },
          linkedin: { enabled: true },
          reddit: { enabled: false },
        },
      };
    });

    it('should show status for all platforms', async () => {
      mockSessionManager.isSessionValid.withArgs('x').returns(true);
      mockSessionManager.isSessionValid.withArgs('linkedin').returns(false);
      mockSessionManager.isSessionValid.withArgs('reddit').returns(false);
      mockSessionManager.getValidPlatforms.returns(['x']);

      const consoleStub = sandbox.stub(console, 'log');

      await handleStatusCommand({}, mockSessionManager, mockConfig);

      expect(consoleStub.called).to.be.true;
      // Should show status for each platform
    });
  });

  describe('handlePlatformsCommand', () => {
    it('should list all available platforms', async () => {
      const consoleStub = sandbox.stub(console, 'log');

      await handlePlatformsCommand({});

      expect(consoleStub.called).to.be.true;
      // Should list platform information
    });

    it('should show detailed platform information with --details flag', async () => {
      const argv = { details: true };
      const consoleStub = sandbox.stub(console, 'log');

      await handlePlatformsCommand(argv);

      expect(consoleStub.called).to.be.true;
    });
  });
});