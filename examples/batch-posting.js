/**
 * Batch Posting Example
 * Demonstrates how to post multiple pieces of content
 */

import { SocialPoster, PostService } from '../index.js';

async function batchPostingExample() {
  console.log('🚀 Social Poster - Batch Posting Example\n');

  const poster = new SocialPoster({
    headless: true,
    timeout: 30000,
  });

  try {
    // Check available platforms
    const availablePlatforms = poster.getAvailablePlatforms();
    console.log(`📱 Available platforms: ${availablePlatforms.join(', ') || 'None (login required)'}\n`);

    if (availablePlatforms.length === 0) {
      console.log('💡 No platforms available. Please login first:');
      console.log('   sp login x');
      console.log('   sp login linkedin');
      return;
    }

    // Example batch content
    const batchContent = [
      {
        text: '🚀 Excited to announce our new social media automation tool!',
        type: 'text',
        platforms: ['x', 'linkedin'],
      },
      {
        text: 'Check out our latest blog post about social media automation',
        link: 'https://profullstack.com/blog/social-automation',
        type: 'link',
        platforms: ['x', 'linkedin'],
      },
      {
        text: 'Just shipped a new feature! 🎉 Multi-platform posting is now live.',
        type: 'text',
        platforms: ['x'],
      },
      {
        text: 'Professional tip: Automate your social media posting to save time and maintain consistency across platforms.',
        type: 'text',
        platforms: ['linkedin'],
      },
    ];

    console.log(`📝 Posting ${batchContent.length} pieces of content...\n`);

    // Post each piece of content
    const results = [];
    for (let i = 0; i < batchContent.length; i++) {
      const content = batchContent[i];
      const targetPlatforms = content.platforms || availablePlatforms;
      
      console.log(`📤 Post ${i + 1}/${batchContent.length}:`);
      console.log(`   Text: ${content.text}`);
      if (content.link) {
        console.log(`   Link: ${content.link}`);
      }
      console.log(`   Platforms: ${targetPlatforms.join(', ')}`);

      try {
        const result = await poster.post(content, targetPlatforms);
        results.push({ content, result });

        if (result.success) {
          console.log(`   ✅ Posted successfully to ${result.successCount}/${result.totalPlatforms} platforms`);
        } else {
          console.log(`   ❌ Failed: ${result.error}`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        results.push({ content, result: { success: false, error: error.message } });
      }

      // Add delay between posts to avoid rate limiting
      if (i < batchContent.length - 1) {
        console.log('   ⏳ Waiting 5 seconds before next post...\n');
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.log('');
      }
    }

    // Summary
    console.log('📊 Batch Posting Summary:');
    const successfulPosts = results.filter(r => r.result.success).length;
    const failedPosts = results.length - successfulPosts;
    
    console.log(`   Total posts: ${results.length}`);
    console.log(`   Successful: ${successfulPosts}`);
    console.log(`   Failed: ${failedPosts}`);
    console.log(`   Success rate: ${Math.round((successfulPosts / results.length) * 100)}%`);

    // Detailed results
    if (failedPosts > 0) {
      console.log('\n❌ Failed Posts:');
      results.forEach((result, index) => {
        if (!result.result.success) {
          console.log(`   Post ${index + 1}: ${result.result.error}`);
        }
      });
    }

    // Platform-specific statistics
    const platformStats = {};
    results.forEach(({ result }) => {
      if (result.results) {
        Object.entries(result.results).forEach(([platform, platformResult]) => {
          if (!platformStats[platform]) {
            platformStats[platform] = { success: 0, failed: 0 };
          }
          if (platformResult.success) {
            platformStats[platform].success++;
          } else {
            platformStats[platform].failed++;
          }
        });
      }
    });

    if (Object.keys(platformStats).length > 0) {
      console.log('\n📈 Platform Statistics:');
      Object.entries(platformStats).forEach(([platform, stats]) => {
        const total = stats.success + stats.failed;
        const rate = Math.round((stats.success / total) * 100);
        console.log(`   ${platform}: ${stats.success}/${total} successful (${rate}%)`);
      });
    }

  } catch (error) {
    console.error('❌ Batch posting failed:', error.message);
  } finally {
    await poster.close();
  }
}

async function scheduledPostingExample() {
  console.log('\n⏰ Scheduled Posting Example\n');

  // Example of how you might implement scheduled posting
  const scheduledPosts = [
    {
      content: {
        text: 'Good morning! Starting the day with some productivity tips 🌅',
        type: 'text',
      },
      scheduledTime: new Date(Date.now() + 5000), // 5 seconds from now
      platforms: ['x', 'linkedin'],
    },
    {
      content: {
        text: 'Lunch break! Time to share some interesting articles',
        link: 'https://example.com/article',
        type: 'link',
      },
      scheduledTime: new Date(Date.now() + 10000), // 10 seconds from now
      platforms: ['x'],
    },
  ];

  console.log(`📅 Scheduled ${scheduledPosts.length} posts:`);
  scheduledPosts.forEach((post, index) => {
    console.log(`   ${index + 1}. "${post.content.text}" at ${post.scheduledTime.toLocaleTimeString()}`);
  });

  // Simple scheduler implementation
  for (const scheduledPost of scheduledPosts) {
    const delay = scheduledPost.scheduledTime.getTime() - Date.now();
    
    if (delay > 0) {
      console.log(`\n⏳ Waiting ${Math.round(delay / 1000)} seconds for next scheduled post...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    console.log(`\n📤 Posting scheduled content: "${scheduledPost.content.text}"`);
    
    // In a real implementation, you would use the poster here
    console.log('   ✅ Scheduled post would be sent now');
  }

  console.log('\n✅ All scheduled posts completed!');
}

// Run examples
async function main() {
  try {
    await batchPostingExample();
    await scheduledPostingExample();
    
    console.log('\n🎉 Batch posting examples completed!');
    console.log('\nNext steps:');
    console.log('1. Login to platforms: sp login');
    console.log('2. Try batch posting: node examples/batch-posting.js');
    console.log('3. Implement your own batch posting logic');
    
  } catch (error) {
    console.error('❌ Example failed:', error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { batchPostingExample, scheduledPostingExample };