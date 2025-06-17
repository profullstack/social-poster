#!/usr/bin/env node

/**
 * AI Content Generation Example
 * Demonstrates how to use the AI service to generate viral social media content
 */

import { initializeAIService } from '../src/ai-service.js';
import { loadConfig, getAIConfig, isAIReady } from '../src/config-manager.js';

async function demonstrateAIContentGeneration() {
  console.log('🤖 AI Content Generation Demo\n');

  // Load configuration
  const config = loadConfig();

  // Check if AI is configured
  if (!isAIReady(config)) {
    console.log('❌ AI is not configured. Please run "social-poster setup" first.');
    console.log('   You need an OpenAI API key to use AI features.');
    return;
  }

  // Initialize AI service
  const aiConfig = getAIConfig(config);
  const aiService = initializeAIService(aiConfig.apiKey, aiConfig);

  console.log('✅ AI service initialized successfully!\n');

  // Example 1: Generate viral content for a link
  console.log('📝 Example 1: Generating viral content for a link...');
  const linkResult = await aiService.generateViralPost({
    prompt: 'This post is about a new JavaScript framework that makes web development 10x faster',
    link: 'https://example.com/new-framework',
    style: 'viral'
  });

  if (linkResult.success) {
    console.log('✨ Generated content:');
    console.log(`   Text: ${linkResult.content.text}`);
    console.log(`   Link: ${linkResult.content.link}`);
    if (linkResult.metadata.hashtags.length > 0) {
      console.log(`   Hashtags: ${linkResult.metadata.hashtags.join(' ')}`);
    }
    console.log(`   Tokens used: ${linkResult.metadata.tokens}\n`);
  } else {
    console.log(`❌ Failed: ${linkResult.error}\n`);
  }

  // Example 2: Generate professional content for LinkedIn
  console.log('📝 Example 2: Generating professional content for LinkedIn...');
  const linkedinResult = await aiService.generatePlatformSpecificContent({
    prompt: 'Share insights about the future of remote work and its impact on productivity',
    platform: 'linkedin'
  });

  if (linkedinResult.success) {
    console.log('✨ Generated LinkedIn content:');
    console.log(`   Text: ${linkedinResult.content.text}`);
    console.log(`   Tokens used: ${linkedinResult.metadata.tokens}\n`);
  } else {
    console.log(`❌ Failed: ${linkedinResult.error}\n`);
  }

  // Example 3: Generate casual content for Twitter/X
  console.log('📝 Example 3: Generating casual content for Twitter/X...');
  const twitterResult = await aiService.generatePlatformSpecificContent({
    prompt: 'Funny observation about developers and coffee addiction',
    platform: 'x'
  });

  if (twitterResult.success) {
    console.log('✨ Generated Twitter content:');
    console.log(`   Text: ${twitterResult.content.text}`);
    console.log(`   Tokens used: ${twitterResult.metadata.tokens}\n`);
  } else {
    console.log(`❌ Failed: ${twitterResult.error}\n`);
  }

  // Show usage statistics
  const stats = aiService.getUsageStats();
  console.log('📊 Usage Statistics:');
  console.log(`   Total requests: ${stats.totalRequests}`);
  console.log(`   Successful requests: ${stats.successfulRequests}`);
  console.log(`   Failed requests: ${stats.failedRequests}`);
  console.log(`   Success rate: ${stats.successRate}%`);
  console.log(`   Total tokens used: ${stats.totalTokens}`);

  console.log('\n🎉 Demo completed! You can now use these commands:');
  console.log('   social-poster post --prompt "Your prompt here" --link "https://example.com"');
  console.log('   social-poster post --prompt "Your prompt here" --style professional');
  console.log('   social-poster post --prompt "Your prompt here" --platforms x,linkedin');
}

// Run the demo
demonstrateAIContentGeneration().catch(error => {
  console.error('❌ Demo failed:', error.message);
  process.exit(1);
});