#!/usr/bin/env node

/**
 * @profullstack/social-poster - Command-line interface
 * Social media posting tool with Puppeteer-based authentication
 */

import fs from 'fs';
import path from 'path';
import colors from 'ansi-colors';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import core modules
import { loadConfig, saveConfig, getConfigPath, getPlatformDisplayName } from '../src/config-manager.js';
import { BrowserAutomation, SessionManager } from '../src/browser-automation.js';

/**
 * Parse post content from command line arguments
 * @param {object} argv - Command line arguments
 * @returns {object} Parsed content object
 */
export function parsePostContent(argv) {
  const content = {};

  // Check for text and link options first (they take priority)
  if (argv.text || argv.link) {
    content.text = argv.text;
    content.link = argv.link;
    content.type = argv.link ? 'link' : 'text';
  } else if (argv._.length > 1) {
    // Use positional argument as text
    content.text = argv._[1];
    content.type = 'text';
  }

  return content;
}

/**
 * Validate post options
 * @param {object} content - Post content
 * @returns {object} Validation result
 */
export function validatePostOptions(content) {
  const errors = [];

  // Check if content is empty
  if (!content.text && !content.link) {
    errors.push('Post content cannot be empty');
  }

  // Validate URL if provided
  if (content.link) {
    try {
      new URL(content.link);
    } catch {
      errors.push('Invalid URL format');
    }
  }

  // Check text length (assuming Twitter-like 280 character limit)
  if (content.text && content.text.length > 280) {
    errors.push('Text is too long (maximum 280 characters)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format platform list for display
 * @param {Array} platforms - Platform objects
 * @returns {string} Formatted platform list
 */
export function formatPlatformList(platforms) {
  if (platforms.length === 0) {
    return colors.yellow('No platforms configured');
  }

  let output = '';
  for (const platform of platforms) {
    let status;
    if (!platform.enabled) {
      status = colors.gray('⚪ Disabled');
    } else if (platform.loggedIn) {
      status = colors.green('✅ Logged in');
    } else {
      status = colors.red('❌ Not logged in');
    }

    output += `${colors.cyan(platform.displayName)}: ${status}\n`;
  }

  return output;
}

/**
 * Handle post command
 * @param {object} argv - Command line arguments
 * @param {object} postService - Post service instance
 */
export async function handlePostCommand(argv, postService = null) {
  try {
    console.log(colors.green('📝 Preparing to post...'));

    // Parse and validate content
    const content = parsePostContent(argv);
    const validation = validatePostOptions(content);

    if (!validation.valid) {
      console.error(colors.red('❌ Invalid post content:'));
      validation.errors.forEach(error => console.error(`   ${error}`));
      process.exit(1);
    }

    // Determine target platforms
    let targetPlatforms;
    if (argv.platforms) {
      targetPlatforms = argv.platforms.split(',').map(p => p.trim());
    } else {
      // Use all available platforms
      if (postService) {
        targetPlatforms = await postService.getAvailablePlatforms();
      } else {
        // Fallback for testing
        targetPlatforms = ['x', 'linkedin'];
      }
    }

    console.log(colors.yellow(`📤 Posting to: ${targetPlatforms.join(', ')}`));

    if (content.type === 'link') {
      console.log(colors.cyan(`🔗 Link: ${content.link}`));
    }
    if (content.text) {
      console.log(colors.cyan(`📄 Text: ${content.text}`));
    }

    // Post content
    if (postService) {
      const result = await postService.post(content, targetPlatforms);

      // Display results
      console.log(colors.green('\n📊 Post Results:'));
      for (const [platform, platformResult] of Object.entries(result.results)) {
        const displayName = getPlatformDisplayName(platform);
        if (platformResult.success) {
          console.log(colors.green(`✅ ${displayName}: Posted successfully`));
          if (platformResult.postId) {
            console.log(colors.gray(`   Post ID: ${platformResult.postId}`));
          }
        } else {
          console.log(colors.red(`❌ ${displayName}: ${platformResult.error}`));
        }
      }
    } else {
      console.log(colors.magenta('🧪 Test mode - no actual posting performed'));
    }

    console.log(colors.green('✅ Post command completed'));
  } catch (error) {
    console.error(colors.red('❌ Post failed:'), error.message);
    if (argv.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

/**
 * Handle login command
 * @param {object} argv - Command line arguments
 * @param {object} browserAutomation - Browser automation instance
 */
export async function handleLoginCommand(argv, browserAutomation = null) {
  try {
    const targetPlatform = argv._[1];

    if (targetPlatform) {
      console.log(colors.green(`🔐 Logging in to ${getPlatformDisplayName(targetPlatform)}...`));

      if (browserAutomation) {
        const success = await browserAutomation.login(targetPlatform);
        if (success) {
          console.log(colors.green(`✅ Successfully logged in to ${getPlatformDisplayName(targetPlatform)}`));
        } else {
          console.log(colors.red(`❌ Failed to log in to ${getPlatformDisplayName(targetPlatform)}`));
        }
      } else {
        console.log(colors.magenta('🧪 Test mode - no actual login performed'));
      }
    } else {
      console.log(colors.green('🔐 Logging in to all platforms...'));
      const platforms = ['x', 'linkedin', 'reddit', 'facebook'];

      for (const platform of platforms) {
        console.log(colors.yellow(`Logging in to ${getPlatformDisplayName(platform)}...`));
        if (browserAutomation) {
          try {
            await browserAutomation.login(platform);
            console.log(colors.green(`✅ ${getPlatformDisplayName(platform)}: Success`));
          } catch (error) {
            console.log(colors.red(`❌ ${getPlatformDisplayName(platform)}: ${error.message}`));
          }
        }
      }
    }
  } catch (error) {
    console.error(colors.red('❌ Login failed:'), error.message);
    if (argv.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

/**
 * Handle status command
 * @param {object} argv - Command line arguments
 * @param {object} sessionManager - Session manager instance
 * @param {object} config - Configuration object
 */
export async function handleStatusCommand(argv, sessionManager = null, config = null) {
  try {
    console.log(colors.green('📊 Platform Status:'));
    console.log('');

    const platforms = ['x', 'linkedin', 'reddit', 'stackerNews', 'primal', 'facebook', 'hackerNews'];
    const platformData = [];

    for (const platform of platforms) {
      const displayName = getPlatformDisplayName(platform);
      const enabled = config?.platforms?.[platform]?.enabled ?? false;
      const loggedIn = sessionManager?.isSessionValid(platform) ?? false;

      platformData.push({
        name: platform,
        displayName,
        enabled,
        loggedIn,
      });
    }

    const formatted = formatPlatformList(platformData);
    console.log(formatted);

    if (sessionManager) {
      const validPlatforms = sessionManager.getValidPlatforms();
      console.log(colors.cyan(`\n📈 Summary: ${validPlatforms.length} platforms ready for posting`));
    }
  } catch (error) {
    console.error(colors.red('❌ Status check failed:'), error.message);
    process.exit(1);
  }
}

/**
 * Handle platforms command
 * @param {object} argv - Command line arguments
 */
export async function handlePlatformsCommand(argv) {
  try {
    console.log(colors.green('🌐 Available Platforms:'));
    console.log('');

    const platforms = [
      {
        name: 'x',
        displayName: 'X (Twitter)',
        description: 'Post tweets and threads',
        features: ['Text posts', 'Link sharing', 'Media uploads'],
      },
      {
        name: 'linkedin',
        displayName: 'LinkedIn',
        description: 'Professional networking posts',
        features: ['Text posts', 'Link sharing', 'Article publishing'],
      },
      {
        name: 'reddit',
        displayName: 'Reddit',
        description: 'Community discussions and link sharing',
        features: ['Text posts', 'Link posts', 'Subreddit targeting'],
      },
      {
        name: 'stackerNews',
        displayName: 'Stacker News',
        description: 'Bitcoin and tech news sharing',
        features: ['Link posts', 'Text posts', 'Bitcoin rewards'],
      },
      {
        name: 'primal',
        displayName: 'Primal (Nostr)',
        description: 'Decentralized social network',
        features: ['Text posts', 'Decentralized', 'Censorship resistant'],
      },
      {
        name: 'facebook',
        displayName: 'Facebook',
        description: 'Social networking posts',
        features: ['Text posts', 'Link sharing', 'Page posting'],
      },
      {
        name: 'hackerNews',
        displayName: 'Hacker News',
        description: 'Tech news and discussions',
        features: ['Link submissions', 'Text posts', 'Comments'],
      },
    ];

    for (const platform of platforms) {
      console.log(colors.cyan(`📱 ${platform.displayName}`));
      console.log(colors.gray(`   ${platform.description}`));

      if (argv.details) {
        console.log(colors.yellow('   Features:'));
        platform.features.forEach(feature => {
          console.log(colors.gray(`     • ${feature}`));
        });
      }
      console.log('');
    }

    console.log(colors.green(`Total platforms: ${platforms.length}`));
  } catch (error) {
    console.error(colors.red('❌ Platform listing failed:'), error.message);
    process.exit(1);
  }
}

/**
 * Configure command line arguments
 */
function configureCommandLine() {
  return yargs(hideBin(process.argv))
    .scriptName('social-poster')
    .usage('$0 <command> [options]')
    .command('post [text]', 'Post content to social media platforms', (yargs) => {
      return yargs
        .positional('text', {
          describe: 'Text content to post',
          type: 'string'
        })
        .option('text', {
          alias: 't',
          describe: 'Text content to post',
          type: 'string'
        })
        .option('link', {
          alias: 'l',
          describe: 'Link to share',
          type: 'string'
        })
        .option('platforms', {
          alias: 'p',
          describe: 'Comma-separated list of platforms (e.g., x,linkedin)',
          type: 'string'
        })
        .option('dry-run', {
          describe: 'Preview post without actually posting',
          type: 'boolean',
          default: false
        });
    })
    .command('login [platform]', 'Login to social media platforms', (yargs) => {
      return yargs
        .positional('platform', {
          describe: 'Platform to login to (omit for all platforms)',
          type: 'string',
          choices: ['x', 'linkedin', 'reddit', 'stacker-news', 'primal', 'facebook', 'hacker-news']
        })
        .option('headless', {
          describe: 'Run browser in headless mode',
          type: 'boolean',
          default: true
        });
    })
    .command('status', 'Show authentication status for all platforms')
    .command('platforms', 'List available platforms', (yargs) => {
      return yargs
        .option('details', {
          alias: 'd',
          describe: 'Show detailed platform information',
          type: 'boolean',
          default: false
        });
    })
    .command('config', 'Show current configuration')
    .option('verbose', {
      alias: 'v',
      describe: 'Enable verbose logging',
      type: 'boolean',
      default: false
    })
    .option('config-path', {
      describe: 'Path to configuration file',
      type: 'string'
    })
    .help()
    .alias('help', 'h')
    .version()
    .alias('version', 'V')
    .demandCommand(1, 'You must specify a command')
    .strict();
}

/**
 * Handle config command
 */
async function handleConfigCommand(argv) {
  try {
    const configPath = argv.configPath || getConfigPath();
    const config = loadConfig(configPath);

    console.log(colors.green('⚙️  Current Configuration:'));
    console.log('');
    console.log(colors.cyan(`Config file: ${configPath}`));
    console.log('');

    // Show platform configuration
    console.log(colors.yellow('Platforms:'));
    for (const [platform, platformConfig] of Object.entries(config.platforms)) {
      const displayName = getPlatformDisplayName(platform);
      const status = platformConfig.enabled ? colors.green('enabled') : colors.gray('disabled');
      console.log(`  ${displayName}: ${status}`);
    }

    console.log('');
    console.log(colors.yellow('General Settings:'));
    console.log(`  Default platforms: ${config.general.defaultPlatforms.join(', ') || 'none'}`);
    console.log(`  Retry attempts: ${config.general.retryAttempts}`);
    console.log(`  Timeout: ${config.general.timeout}ms`);
    console.log(`  Log level: ${config.general.logLevel}`);

  } catch (error) {
    console.error(colors.red('❌ Config display failed:'), error.message);
    process.exit(1);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    const argv = configureCommandLine().argv;

    // Initialize services
    const config = loadConfig(argv.configPath);
    const browserAutomation = new BrowserAutomation({
      headless: argv.headless ?? true,
      sessionsPath: argv.sessionsPath,
    });
    const sessionManager = new SessionManager();

    // Handle different commands
    switch (argv._[0]) {
      case 'post':
        await handlePostCommand(argv);
        break;
      case 'login':
        await handleLoginCommand(argv, browserAutomation);
        break;
      case 'status':
        await handleStatusCommand(argv, sessionManager, config);
        break;
      case 'platforms':
        await handlePlatformsCommand(argv);
        break;
      case 'config':
        await handleConfigCommand(argv);
        break;
      default:
        console.error(colors.red('Unknown command'));
        process.exit(1);
    }

    // Clean up
    await browserAutomation.closeBrowser();

  } catch (error) {
    console.error(colors.red('Unhandled error:'), error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the main function only if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(colors.red('Fatal error:'), error);
    process.exit(1);
  });
}