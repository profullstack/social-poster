/**
 * AI Service
 * Handles AI-powered content generation for social media posts using OpenAI
 */

import OpenAI from 'openai';

/**
 * AI Service class for generating viral social media content
 */
export class AIService {
  constructor(options = {}) {
    if (!options.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.options = {
      model: 'gpt-4o-mini',
      maxTokens: 500,
      temperature: 0.7,
      ...options,
    };

    this.openai = new OpenAI({
      apiKey: this.options.apiKey,
    });

    // Usage tracking
    this.stats = {
      totalRequests: 0,
      totalTokens: 0,
      successfulRequests: 0,
      failedRequests: 0,
    };

    // Platform-specific limits
    this.platformLimits = {
      x: 280,
      linkedin: 3000,
      reddit: 40000,
      facebook: 63206,
      default: 280,
    };
  }

  /**
   * Generate viral social media content
   * @param {object} options - Generation options
   * @param {string} options.prompt - User prompt describing the content
   * @param {string} [options.link] - Optional link to include
   * @param {string} [options.style] - Content style (viral, professional, casual)
   * @returns {Promise<object>} Generated content result
   */
  async generateViralPost(options) {
    try {
      const { prompt, link, style = 'viral' } = options;

      // Validate input
      if (!prompt || prompt.trim().length === 0) {
        return {
          success: false,
          error: 'Prompt cannot be empty',
        };
      }

      // Build system prompt for viral content
      const systemPrompt = this.buildSystemPrompt(style, !!link);
      
      // Build user prompt
      const userPrompt = this.buildUserPrompt(prompt, link);

      console.log('🤖 Generating viral content with AI...');

      // Call OpenAI API
      const response = await this.openai.chat.completions.create({
        model: this.options.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: this.options.maxTokens,
        temperature: this.options.temperature,
      });

      // Update stats
      this.updateStats(response, true);

      const generatedText = response.choices[0]?.message?.content?.trim();
      
      if (!generatedText) {
        throw new Error('No content generated');
      }

      // Create content object
      const content = {
        text: generatedText,
        type: link ? 'link' : 'text',
      };

      if (link) {
        content.link = link;
      }

      return {
        success: true,
        content,
        metadata: {
          model: this.options.model,
          tokens: response.usage?.total_tokens || 0,
          hashtags: this.extractHashtags(generatedText),
        },
      };

    } catch (error) {
      this.updateStats(null, false);
      return {
        success: false,
        error: `Failed to generate content: ${error.message}`,
      };
    }
  }

  /**
   * Generate platform-specific content
   * @param {object} options - Generation options
   * @param {string} options.prompt - User prompt
   * @param {string} options.platform - Target platform
   * @param {string} [options.link] - Optional link
   * @returns {Promise<object>} Generated content result
   */
  async generatePlatformSpecificContent(options) {
    const { platform, ...otherOptions } = options;
    
    // Get platform-specific style
    const platformStyle = this.getPlatformStyle(platform);
    
    // Generate content with platform-specific optimizations
    const result = await this.generateViralPost({
      ...otherOptions,
      style: platformStyle,
    });

    if (result.success) {
      // Optimize for platform character limits
      result.content.text = this.optimizeForPlatform(result.content.text, platform);
    }

    return result;
  }

  /**
   * Build system prompt for content generation
   * @param {string} style - Content style
   * @param {boolean} hasLink - Whether content includes a link
   * @returns {string} System prompt
   */
  buildSystemPrompt(style, hasLink) {
    const basePrompt = `You are an expert social media content creator specializing in viral, engaging posts.`;
    
    const stylePrompts = {
      viral: `Create content that is:
- Attention-grabbing and shareable
- Uses emojis strategically
- Includes power words and emotional triggers
- Has a hook in the first line
- Encourages engagement (likes, shares, comments)
- Uses trending language and phrases`,
      
      professional: `Create content that is:
- Professional and authoritative
- Informative and valuable
- Uses industry-appropriate language
- Builds credibility and trust
- Suitable for business networks`,
      
      casual: `Create content that is:
- Conversational and friendly
- Relatable and authentic
- Uses everyday language
- Feels personal and genuine`,
    };

    const linkGuidance = hasLink 
      ? `The content should naturally lead to the provided link without being overly promotional.`
      : `Focus on creating standalone engaging content.`;

    return `${basePrompt}

${stylePrompts[style] || stylePrompts.viral}

${linkGuidance}

Keep the content concise, impactful, and optimized for social media engagement. Use line breaks for readability when appropriate.`;
  }

  /**
   * Build user prompt from input
   * @param {string} prompt - User prompt
   * @param {string} [link] - Optional link
   * @returns {string} Formatted user prompt
   */
  buildUserPrompt(prompt, link) {
    let userPrompt = `Create a viral social media post based on this prompt: "${prompt}"`;
    
    if (link) {
      userPrompt += `\n\nInclude this link naturally in the content: ${link}`;
    }

    userPrompt += `\n\nMake it engaging, shareable, and optimized for maximum reach across social platforms.`;

    return userPrompt;
  }

  /**
   * Get platform-specific content style
   * @param {string} platform - Platform name
   * @returns {string} Style for the platform
   */
  getPlatformStyle(platform) {
    const platformStyles = {
      x: 'viral', // Twitter/X loves viral content
      linkedin: 'professional', // LinkedIn is business-focused
      reddit: 'casual', // Reddit prefers authentic, conversational content
      facebook: 'casual', // Facebook is more personal
      default: 'viral',
    };

    return platformStyles[platform] || platformStyles.default;
  }

  /**
   * Optimize content for platform character limits
   * @param {string} text - Original text
   * @param {string} platform - Platform name
   * @returns {string} Optimized text
   */
  optimizeForPlatform(text, platform) {
    const limit = this.platformLimits[platform] || this.platformLimits.default;
    
    if (text.length <= limit) {
      return text;
    }

    // Truncate and add ellipsis
    const truncated = text.substring(0, limit - 3).trim();
    
    // Try to break at a word boundary
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > limit * 0.8) { // Only break at word if we're not losing too much
      return truncated.substring(0, lastSpace) + '...';
    }
    
    return truncated + '...';
  }

  /**
   * Extract hashtags from content
   * @param {string} content - Content text
   * @returns {string[]} Array of hashtags
   */
  extractHashtags(content) {
    const hashtagRegex = /#[\w]+/g;
    return content.match(hashtagRegex) || [];
  }

  /**
   * Validate OpenAI API key format
   * @param {string} apiKey - API key to validate
   * @returns {boolean} True if valid format
   */
  validateApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }
    
    // OpenAI API keys start with 'sk-' and are followed by alphanumeric characters
    return /^sk-[a-zA-Z0-9]+$/.test(apiKey);
  }

  /**
   * Update usage statistics
   * @param {object} response - OpenAI response
   * @param {boolean} success - Whether request was successful
   */
  updateStats(response, success) {
    this.stats.totalRequests++;
    
    if (success) {
      this.stats.successfulRequests++;
      if (response?.usage?.total_tokens) {
        this.stats.totalTokens += response.usage.total_tokens;
      }
    } else {
      this.stats.failedRequests++;
    }
  }

  /**
   * Get usage statistics
   * @returns {object} Usage stats
   */
  getUsageStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalRequests > 0 
        ? Math.round((this.stats.successfulRequests / this.stats.totalRequests) * 100)
        : 0,
    };
  }

  /**
   * Reset usage statistics
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      totalTokens: 0,
      successfulRequests: 0,
      failedRequests: 0,
    };
  }

  /**
   * Test API connection
   * @returns {Promise<boolean>} True if connection successful
   */
  async testConnection() {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.options.model,
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 5,
      });
      
      return !!response.choices?.[0]?.message?.content;
    } catch (error) {
      console.error('OpenAI API connection test failed:', error.message);
      return false;
    }
  }
}

// Export default instance (will be initialized when API key is available)
export let aiService = null;

/**
 * Initialize AI service with API key
 * @param {string} apiKey - OpenAI API key
 * @param {object} [options] - Additional options
 * @returns {AIService} Initialized AI service
 */
export function initializeAIService(apiKey, options = {}) {
  aiService = new AIService({ apiKey, ...options });
  return aiService;
}

/**
 * Get AI service instance
 * @returns {AIService|null} AI service instance or null if not initialized
 */
export function getAIService() {
  return aiService;
}