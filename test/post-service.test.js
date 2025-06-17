/**
 * Post Service Tests
 * Testing multi-platform posting orchestration
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import service to test
import { PostService } from '../src/post-service.js';

describe('Post Service', () => {
  let sandbox;
  let postService;
  let mockXPlatform;
  let mockLinkedInPlatform;
  let mockSessionManager;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Mock platform instances
    mockXPlatform = {
      platformName: 'x',
      post: sandbox.stub(),
      login: sandbox.stub(),
    };

    mockLinkedInPlatform = {
      platformName: 'linkedin',
      post: sandbox.stub(),
      login: sandbox.stub(),
    };

    // Mock session manager
    mockSessionManager = {
      isSessionValid: sandbox.stub(),
      getValidPlatforms: sandbox.stub(),
    };

    postService = new PostService({
      platforms: {
        x: mockXPlatform,
        linkedin: mockLinkedInPlatform,
      },
      sessionManager: mockSessionManager,
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('constructor', () => {
    it('should initialize with platform instances', () => {
      expect(postService.platforms.x).to.equal(mockXPlatform);
      expect(postService.platforms.linkedin).to.equal(mockLinkedInPlatform);
    });

    it('should initialize with session manager', () => {
      expect(postService.sessionManager).to.equal(mockSessionManager);
    });
  });

  describe('getAvailablePlatforms', () => {
    it('should return platforms with valid sessions', () => {
      mockSessionManager.isSessionValid.withArgs('x').returns(true);
      mockSessionManager.isSessionValid.withArgs('linkedin').returns(false);

      const available = postService.getAvailablePlatforms();
      
      expect(available).to.deep.equal(['x']);
    });

    it('should return empty array when no platforms are available', () => {
      mockSessionManager.isSessionValid.returns(false);

      const available = postService.getAvailablePlatforms();
      
      expect(available).to.deep.equal([]);
    });
  });

  describe('validateContent', () => {
    it('should validate text content', () => {
      const content = {
        text: 'Hello world!',
        type: 'text',
      };

      const result = postService.validateContent(content);
      
      expect(result.valid).to.be.true;
      expect(result.errors).to.be.empty;
    });

    it('should validate link content', () => {
      const content = {
        text: 'Check this out!',
        link: 'https://example.com',
        type: 'link',
      };

      const result = postService.validateContent(content);
      
      expect(result.valid).to.be.true;
      expect(result.errors).to.be.empty;
    });

    it('should reject empty content', () => {
      const content = {};

      const result = postService.validateContent(content);
      
      expect(result.valid).to.be.false;
      expect(result.errors).to.include('Content must have either text or link');
    });

    it('should reject invalid URL', () => {
      const content = {
        text: 'Check this out!',
        link: 'not-a-url',
        type: 'link',
      };

      const result = postService.validateContent(content);
      
      expect(result.valid).to.be.false;
      expect(result.errors).to.include('Link must be a valid URL');
    });
  });

  describe('postToPlatform', () => {
    it('should post to a single platform successfully', async () => {
      const content = {
        text: 'Hello world!',
        type: 'text',
      };

      mockXPlatform.post.resolves({
        success: true,
        postId: '123456789',
        url: 'https://x.com/user/status/123456789',
      });

      const result = await postService.postToPlatform('x', content);
      
      expect(result.success).to.be.true;
      expect(result.postId).to.equal('123456789');
      expect(mockXPlatform.post.calledWith(content)).to.be.true;
    });

    it('should handle platform posting errors', async () => {
      const content = {
        text: 'Hello world!',
        type: 'text',
      };

      mockXPlatform.post.resolves({
        success: false,
        error: 'Authentication failed',
      });

      const result = await postService.postToPlatform('x', content);
      
      expect(result.success).to.be.false;
      expect(result.error).to.equal('Authentication failed');
    });

    it('should handle unknown platforms', async () => {
      const content = {
        text: 'Hello world!',
        type: 'text',
      };

      const result = await postService.postToPlatform('unknown', content);
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('Platform not supported');
    });
  });

  describe('postToMultiplePlatforms', () => {
    it('should post to multiple platforms successfully', async () => {
      const content = {
        text: 'Hello world!',
        type: 'text',
      };

      mockXPlatform.post.resolves({
        success: true,
        postId: '123456789',
      });

      mockLinkedInPlatform.post.resolves({
        success: true,
        postId: '987654321',
      });

      const result = await postService.postToMultiplePlatforms(['x', 'linkedin'], content);
      
      expect(result.success).to.be.true;
      expect(result.results.x.success).to.be.true;
      expect(result.results.linkedin.success).to.be.true;
      expect(result.successCount).to.equal(2);
      expect(result.failureCount).to.equal(0);
    });

    it('should handle mixed success and failure', async () => {
      const content = {
        text: 'Hello world!',
        type: 'text',
      };

      mockXPlatform.post.resolves({
        success: true,
        postId: '123456789',
      });

      mockLinkedInPlatform.post.resolves({
        success: false,
        error: 'Rate limit exceeded',
      });

      const result = await postService.postToMultiplePlatforms(['x', 'linkedin'], content);
      
      expect(result.success).to.be.true; // At least one succeeded
      expect(result.results.x.success).to.be.true;
      expect(result.results.linkedin.success).to.be.false;
      expect(result.successCount).to.equal(1);
      expect(result.failureCount).to.equal(1);
    });

    it('should handle all failures', async () => {
      const content = {
        text: 'Hello world!',
        type: 'text',
      };

      mockXPlatform.post.resolves({
        success: false,
        error: 'Authentication failed',
      });

      mockLinkedInPlatform.post.resolves({
        success: false,
        error: 'Rate limit exceeded',
      });

      const result = await postService.postToMultiplePlatforms(['x', 'linkedin'], content);
      
      expect(result.success).to.be.false;
      expect(result.successCount).to.equal(0);
      expect(result.failureCount).to.equal(2);
    });

    it('should handle concurrent posting', async () => {
      const content = {
        text: 'Hello world!',
        type: 'text',
      };

      // Add delays to test concurrency
      mockXPlatform.post.callsFake(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { success: true, postId: '123' };
      });

      mockLinkedInPlatform.post.callsFake(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { success: true, postId: '456' };
      });

      const startTime = Date.now();
      const result = await postService.postToMultiplePlatforms(['x', 'linkedin'], content);
      const endTime = Date.now();
      
      // Should complete in roughly 100ms (concurrent), not 150ms (sequential)
      expect(endTime - startTime).to.be.lessThan(130);
      expect(result.success).to.be.true;
      expect(result.successCount).to.equal(2);
    });
  });

  describe('post', () => {
    it('should post to all available platforms by default', async () => {
      const content = {
        text: 'Hello world!',
        type: 'text',
      };

      mockSessionManager.isSessionValid.withArgs('x').returns(true);
      mockSessionManager.isSessionValid.withArgs('linkedin').returns(true);

      mockXPlatform.post.resolves({ success: true, postId: '123' });
      mockLinkedInPlatform.post.resolves({ success: true, postId: '456' });

      const result = await postService.post(content);
      
      expect(result.success).to.be.true;
      expect(result.results.x.success).to.be.true;
      expect(result.results.linkedin.success).to.be.true;
    });

    it('should post to specified platforms only', async () => {
      const content = {
        text: 'Hello world!',
        type: 'text',
      };

      mockXPlatform.post.resolves({ success: true, postId: '123' });

      const result = await postService.post(content, ['x']);
      
      expect(result.success).to.be.true;
      expect(result.results.x.success).to.be.true;
      expect(result.results.linkedin).to.be.undefined;
      expect(mockLinkedInPlatform.post.called).to.be.false;
    });

    it('should validate content before posting', async () => {
      const content = {
        // Invalid content - no text or link
      };

      const result = await postService.post(content);
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('Invalid content');
      expect(mockXPlatform.post.called).to.be.false;
      expect(mockLinkedInPlatform.post.called).to.be.false;
    });

    it('should handle no available platforms', async () => {
      const content = {
        text: 'Hello world!',
        type: 'text',
      };

      mockSessionManager.isSessionValid.returns(false);

      const result = await postService.post(content);
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('No platforms available');
    });
  });

  describe('getPostingStats', () => {
    it('should return posting statistics', async () => {
      const content = {
        text: 'Hello world!',
        type: 'text',
      };

      mockXPlatform.post.resolves({ success: true, postId: '123' });
      mockLinkedInPlatform.post.resolves({ success: false, error: 'Failed' });

      const result = await postService.post(content, ['x', 'linkedin']);
      const stats = postService.getPostingStats(result);
      
      expect(stats.totalPlatforms).to.equal(2);
      expect(stats.successfulPosts).to.equal(1);
      expect(stats.failedPosts).to.equal(1);
      expect(stats.successRate).to.equal(50);
    });
  });

  describe('retryFailedPosts', () => {
    it('should retry failed posts', async () => {
      const content = {
        text: 'Hello world!',
        type: 'text',
      };

      const originalResult = {
        success: false,
        results: {
          x: { success: false, error: 'Temporary error' },
          linkedin: { success: true, postId: '456' },
        },
      };

      // Mock retry attempt
      mockXPlatform.post.resolves({ success: true, postId: '123' });

      const retryResult = await postService.retryFailedPosts(originalResult, content);
      
      expect(retryResult.success).to.be.true;
      expect(retryResult.results.x.success).to.be.true;
      expect(retryResult.results.linkedin.success).to.be.true;
    });
  });
});