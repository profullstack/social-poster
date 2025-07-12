#!/usr/bin/env node

/**
 * Multi-Platform Posting Example
 * Demonstrates posting to X.com, TikTok, and Pinterest with auto recording
 */

import { XPlatform } from '../src/platforms/x-com.js';
import { TikTokPlatform } from '../src/platforms/tiktok.js';
import { PinterestPlatform } from '../src/platforms/pinterest.js';

async function demonstrateMultiPlatformPosting() {
  console.log('🚀 Multi-Platform Posting Demo');
  console.log('===============================\n');

  // Initialize platforms
  const xPlatform = new XPlatform({ headless: false });
  const tikTokPlatform = new TikTokPlatform({ headless: false });
  const pinterestPlatform = new PinterestPlatform({ headless: false });

  const platforms = [
    { name: 'X.com', platform: xPlatform },
    { name: 'TikTok', platform: tikTokPlatform },
    { name: 'Pinterest', platform: pinterestPlatform }
  ];

  try {
    // Example content for different platforms
    const content = {
      x: {
        text: 'Just discovered an amazing new tool for social media automation! 🚀 #SocialMedia #Automation'
      },
      tiktok: {
        text: 'Check out this cool automation tool! Perfect for content creators 🎥✨',
        // videoPath: './path/to/your/video.mp4' // Uncomment and provide video path
      },
      pinterest: {
        text: 'Amazing social media automation tool for content creators',
        // imagePath: './path/to/your/image.jpg', // Uncomment and provide image path
        link: 'https://github.com/profullstack/social-poster'
      }
    };

    // Post to each platform
    for (const { name, platform } of platforms) {
      console.log(`\n📱 Posting to ${name}...`);
      
      try {
        const platformKey = name.toLowerCase().replace('.com', '').replace('x', 'x');
        const result = await platform.post(content[platformKey] || content.x);
        
        if (result.success) {
          console.log(`✅ Successfully posted to ${name}`);
          console.log(`   Post URL: ${result.url}`);
          console.log(`   Post ID: ${result.postId}`);
        } else {
          console.log(`❌ Failed to post to ${name}: ${result.error}`);
        }
      } catch (error) {
        console.log(`❌ Error posting to ${name}: ${error.message}`);
      }
    }

    console.log('\n🎉 Multi-platform posting completed!');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  } finally {
    // Clean up
    await Promise.all(platforms.map(({ platform }) => platform.closeBrowser()));
  }
}

async function demonstrateAutoRecording() {
  console.log('\n🎬 Auto Recording Demo');
  console.log('======================\n');

  console.log('To use the auto recording feature:');
  console.log('1. Record selectors for a single platform:');
  console.log('   pnpm run auto-record x');
  console.log('   pnpm run auto-record tiktok');
  console.log('   pnpm run auto-record pinterest');
  console.log('');
  console.log('2. Record selectors for all platforms:');
  console.log('   pnpm run auto-record all');
  console.log('');
  console.log('3. The tool will:');
  console.log('   - Open browser windows for each platform');
  console.log('   - Auto-validate known selectors');
  console.log('   - Record new interactions');
  console.log('   - Save results to JSON file');
  console.log('');
  console.log('4. Features:');
  console.log('   - Real-time selector validation');
  console.log('   - Confidence scoring');
  console.log('   - Enhanced categorization');
  console.log('   - Auto-save every 3 seconds');
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2] || 'posting';
  
  if (mode === 'recording') {
    demonstrateAutoRecording();
  } else {
    demonstrateMultiPlatformPosting().catch(console.error);
  }
}

export { demonstrateMultiPlatformPosting, demonstrateAutoRecording };