/**
 * AI Service Tests
 * Testing AI-powered content generation for social media posts
 */

import { expect } from 'chai';
import sinon from 'sinon';
// import { fileURLToPath } from 'url';
// import path from 'path';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// Import service to test
import { AIService } from '../src/ai-service.js';

// The OpenAI tests below exercise the fallback path; c0mpute is covered in
// its own block with a stub router.
process.env.C0MPUTE_DISABLED = '1';

describe('AI Service', () => {
  let sandbox;
  let aiService;
  let mockOpenAI;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Mock OpenAI client
    mockOpenAI = {
      chat: {
        completions: {
          create: sandbox.stub(),
        },
      },
    };

    aiService = new AIService({
      apiKey: 'test-api-key',
      model: 'gpt-4o-mini',
      maxTokens: 500,
      temperature: 0.7,
    });

    // Replace the OpenAI client with our mock
    aiService.openai = mockOpenAI;
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const service = new AIService({ apiKey: 'test-key' });
      expect(service.options.model).to.equal('gpt-4o-mini');
      expect(service.options.maxTokens).to.equal(500);
      expect(service.options.temperature).to.equal(0.7);
    });

    it('should throw error without API key', () => {
      expect(() => new AIService()).to.throw('OpenAI API key is required');
    });
  });

  describe('generateViralPost', () => {
    it('should generate viral content for a link', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '🚀 Just discovered this game-changing website that\'s revolutionizing how we think about online experiences! The innovation here is absolutely mind-blowing. You NEED to see this! 🔥 #Innovation #GameChanger',
          },
        }],
      };

      mockOpenAI.chat.completions.create.resolves(mockResponse);

      const result = await aiService.generateViralPost({
        prompt: 'This post is about Example.com, please write a more elegant viral type post for all socials',
        link: 'https://example.com',
      });

      expect(result.success).to.be.true;
      expect(result.content.text).to.include('🚀');
      expect(result.content.link).to.equal('https://example.com');
      expect(result.content.type).to.equal('link');
    });

    it('should generate text-only viral content', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '💡 Here\'s a mindset shift that changed everything for me: Success isn\'t about perfection, it\'s about progress. Every small step counts! 🌟 #Motivation #Growth',
          },
        }],
      };

      mockOpenAI.chat.completions.create.resolves(mockResponse);

      const result = await aiService.generateViralPost({
        prompt: 'Write a motivational post about success and progress',
      });

      expect(result.success).to.be.true;
      expect(result.content.text).to.include('💡');
      expect(result.content.type).to.equal('text');
      expect(result.content.link).to.be.undefined;
    });

    it('should handle OpenAI API errors', async () => {
      mockOpenAI.chat.completions.create.rejects(new Error('API rate limit exceeded'));

      const result = await aiService.generateViralPost({
        prompt: 'Test prompt',
      });

      expect(result.success).to.be.false;
      expect(result.error).to.include('Failed to generate content');
    });

    it('should validate prompt length', async () => {
      const result = await aiService.generateViralPost({
        prompt: '', // Empty prompt
      });

      expect(result.success).to.be.false;
      expect(result.error).to.include('Prompt cannot be empty');
    });
  });

  describe('generatePlatformSpecificContent', () => {
    it('should generate Twitter-optimized content', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '🔥 THREAD: Why Example.com is changing the game (1/3)\n\nJust spent hours exploring this platform and I\'m blown away...',
          },
        }],
      };

      mockOpenAI.chat.completions.create.resolves(mockResponse);

      const result = await aiService.generatePlatformSpecificContent({
        prompt: 'Create content about Example.com',
        platform: 'x',
        link: 'https://example.com',
      });

      expect(result.success).to.be.true;
      expect(result.content.text).to.include('THREAD');
    });

    it('should generate LinkedIn-optimized content', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'I recently discovered Example.com and wanted to share some insights with my network.\n\nThis platform represents a significant advancement in...',
          },
        }],
      };

      mockOpenAI.chat.completions.create.resolves(mockResponse);

      const result = await aiService.generatePlatformSpecificContent({
        prompt: 'Create professional content about Example.com',
        platform: 'linkedin',
        link: 'https://example.com',
      });

      expect(result.success).to.be.true;
      expect(result.content.text).to.include('network');
    });
  });

  describe('optimizeForPlatform', () => {
    it('should optimize content for Twitter character limit', () => {
      const longText = 'a'.repeat(300); // 300 characters, definitely over limit
      const optimized = aiService.optimizeForPlatform(longText, 'x');
      
      expect(optimized.length).to.be.at.most(280);
      expect(optimized).to.include('...');
    });

    it('should keep short content unchanged', () => {
      const shortText = 'Short post';
      const optimized = aiService.optimizeForPlatform(shortText, 'x');
      
      expect(optimized).to.equal(shortText);
    });

    it('should handle LinkedIn longer limits', () => {
      const mediumText = 'a'.repeat(500);
      const optimized = aiService.optimizeForPlatform(mediumText, 'linkedin');
      
      expect(optimized).to.equal(mediumText); // Should not be truncated
    });
  });

  describe('extractHashtags', () => {
    it('should extract hashtags from content', () => {
      const content = 'Check out this amazing tool! #Innovation #Tech #Startup';
      const hashtags = aiService.extractHashtags(content);
      
      expect(hashtags).to.deep.equal(['#Innovation', '#Tech', '#Startup']);
    });

    it('should return empty array for content without hashtags', () => {
      const content = 'No hashtags here';
      const hashtags = aiService.extractHashtags(content);
      
      expect(hashtags).to.deep.equal([]);
    });
  });

  describe('validateApiKey', () => {
    it('should validate API key format', () => {
      expect(aiService.validateApiKey('sk-1234567890abcdef')).to.be.true;
      expect(aiService.validateApiKey('invalid-key')).to.be.false;
      expect(aiService.validateApiKey('')).to.be.false;
    });
  });

  describe('getUsageStats', () => {
    it('should track usage statistics', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Generated content' } }],
        usage: {
          prompt_tokens: 50,
          completion_tokens: 30,
          total_tokens: 80,
        },
      };

      mockOpenAI.chat.completions.create.resolves(mockResponse);

      await aiService.generateViralPost({
        prompt: 'Test prompt',
      });

      const stats = aiService.getUsageStats();
      expect(stats.totalRequests).to.equal(1);
      expect(stats.totalTokens).to.equal(80);
    });
  });

  describe('c0mpute first', () => {
    const stubRouter = (impl) => ({ generateText: sinon.stub().callsFake(impl) });

    it('does not need an OpenAI key when c0mpute is available', () => {
      const service = new AIService({ c0mpute: stubRouter(async () => ({})) });
      expect(service.openai).to.equal(null);
    });

    it('uses c0mpute and never calls OpenAI when c0mpute answers', async () => {
      const router = stubRouter(async () => ({
        text: 'Hello from c0mpute #ai',
        provider: 'c0mpute',
        model: 'qwen',
        usage: { inputTokens: 10, outputTokens: 5 },
      }));
      const service = new AIService({ apiKey: 'sk-test', c0mpute: router });
      service.openai = mockOpenAI;

      const result = await service.generateViralPost({ prompt: 'launch' });

      expect(result.success).to.equal(true);
      expect(result.content.text).to.equal('Hello from c0mpute #ai');
      expect(result.metadata.provider).to.equal('c0mpute');
      expect(result.metadata.tokens).to.equal(15);
      expect(router.generateText.calledOnce).to.equal(true);
      expect(mockOpenAI.chat.completions.create.called).to.equal(false);
    });

    it('falls back to OpenAI when c0mpute fails', async () => {
      const router = stubRouter(async () => {
        throw new Error('no node');
      });
      mockOpenAI.chat.completions.create.resolves({
        choices: [{ message: { content: 'From OpenAI' } }],
        usage: { total_tokens: 7 },
      });
      const service = new AIService({ apiKey: 'sk-test', c0mpute: router });
      service.openai = mockOpenAI;

      const result = await service.generateViralPost({ prompt: 'launch' });

      expect(result.success).to.equal(true);
      expect(result.content.text).to.equal('From OpenAI');
      expect(result.metadata.provider).to.equal('openai');
    });

    it('reports the c0mpute error when there is no OpenAI fallback', async () => {
      const service = new AIService({
        c0mpute: stubRouter(async () => {
          throw new Error('no node');
        }),
      });

      const result = await service.generateViralPost({ prompt: 'launch' });

      expect(result.success).to.equal(false);
      expect(result.error).to.include('no node');
    });
  });
});
