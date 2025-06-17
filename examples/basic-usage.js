/**
 * Basic Usage Example
 * Demonstrates how to use Social Poster programmatically
 */

import { SocialPoster, quickPost, validatePostContent } from '../index.js';

async function basicExample() {
  console.log('🚀 Social Poster - Basic Usage Example\n');

  // Example 1: Quick posting
  console.log('📝 Example 1: Quick Post');
  try {
    const content = {
      text: 'Hello from Social Poster! 🚀 This is a test post.',
      type: 'text',
    };

    // Validate content first
    const validation = validatePostContent(content);
    if (!validation.valid) {
      console.error('❌ Invalid content:', validation.errors);
      return;
    }

    console.log('Content to post:', content);
    console.log('Validation:', validation.valid ? '✅ Valid' : '❌ Invalid');

    // Note: This would actually post if sessions are available
    // const result = await quickPost(content, { platforms: ['x'] });
    // console.log('Post result:', result);

    console.log('💡 To actually post, ensure you have logged in first with: sp login\n');
  } catch (error) {
    console.error('❌ Quick post failed:', error.message);
  }

  // Example 2: Advanced usage with SocialPoster class
  console.log('📝 Example 2: Advanced Usage');
  const poster = new SocialPoster({
    headless: true,
    timeout: 30000,
  });

  try {
    // Check authentication status
    const authStatus = poster.getAuthStatus();
    console.log('Authentication Status:');
    for (const [platform, status] of Object.entries(authStatus)) {
      const statusIcon = status.loggedIn ? '✅' : '❌';
      const enabledIcon = status.enabled ? '🟢' : '⚪';
      console.log(`  ${enabledIcon} ${statusIcon} ${status.displayName}`);
    }

    // Get available platforms
    const availablePlatforms = poster.getAvailablePlatforms();
    console.log(`\nAvailable platforms: ${availablePlatforms.join(', ') || 'None (login required)'}`);

    // Example content variations
    const examples = [
      {
        name: 'Text Post',
        content: {
          text: 'Just posted using Social Poster! 🎉',
          type: 'text',
        },
      },
      {
        name: 'Link Post',
        content: {
          text: 'Check out this amazing social media automation tool!',
          link: 'https://github.com/profullstack/social-poster',
          type: 'link',
        },
      },
      {
        name: 'Link Only',
        content: {
          link: 'https://profullstack.com',
          type: 'link',
        },
      },
    ];

    console.log('\n📋 Example Content Variations:');
    for (const example of examples) {
      console.log(`\n${example.name}:`);
      console.log('  Content:', JSON.stringify(example.content, null, 2));
      
      const validation = validatePostContent(example.content);
      console.log('  Validation:', validation.valid ? '✅ Valid' : '❌ Invalid');
      if (!validation.valid) {
        console.log('  Errors:', validation.errors);
      }
    }

    console.log('\n💡 To post these examples:');
    console.log('1. First login: sp login x');
    console.log('2. Then post: sp post "Your message here"');
    console.log('3. Or with link: sp post --text "Check this out!" --link "https://example.com"');

  } catch (error) {
    console.error('❌ Advanced example failed:', error.message);
  } finally {
    // Clean up
    await poster.close();
  }
}

async function demonstrateValidation() {
  console.log('\n🔍 Content Validation Examples\n');

  const testCases = [
    {
      name: 'Valid text post',
      content: { text: 'Hello world!', type: 'text' },
    },
    {
      name: 'Valid link post',
      content: { text: 'Check this out!', link: 'https://example.com', type: 'link' },
    },
    {
      name: 'Empty content',
      content: {},
    },
    {
      name: 'Invalid URL',
      content: { text: 'Bad link', link: 'not-a-url', type: 'link' },
    },
    {
      name: 'Text too long',
      content: { text: 'a'.repeat(300), type: 'text' },
    },
    {
      name: 'Link only',
      content: { link: 'https://example.com', type: 'link' },
    },
  ];

  for (const testCase of testCases) {
    const validation = validatePostContent(testCase.content);
    const status = validation.valid ? '✅' : '❌';
    
    console.log(`${status} ${testCase.name}`);
    if (!validation.valid) {
      console.log(`   Errors: ${validation.errors.join(', ')}`);
    }
    console.log('');
  }
}

// Run examples
async function main() {
  try {
    await basicExample();
    await demonstrateValidation();
    
    console.log('🎉 Examples completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Install: pnpm install -g @profullstack/social-poster');
    console.log('2. Login: sp login');
    console.log('3. Post: sp post "Hello world!"');
    
  } catch (error) {
    console.error('❌ Example failed:', error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { basicExample, demonstrateValidation };