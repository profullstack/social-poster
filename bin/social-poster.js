#!/usr/bin/env node

/**
 * @profullstack/social-poster - Command-line interface
 * Social media posting tool with Puppeteer-based authentication
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import colors from 'ansi-colors';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import core modules
import { loadConfig, saveConfig, getConfigPath, getPlatformDisplayName, getAIConfig, isAIReady } from '../src/config-manager.js';
import { BrowserAutomation, SessionManager } from '../src/browser-automation.js';
import { PostService } from '../src/post-service.js';
import { initializeAIService } from '../src/ai-service.js';

/**
 * Parse post content from command line arguments
 * @param {object} argv - Command line arguments
 * @returns {object} Parsed content object
 */
export function parsePostContent(argv) {
  const content = {};

  // Check for AI prompt first
  if (argv.prompt) {
    content.prompt = argv.prompt;
    content.link = argv.link; // Optional link for AI-generated content
    content.type = 'ai-generated';
    content.style = argv.style || 'viral'; // Default to viral style
  } else if (argv.text || argv.link) {
    // Check for text and link options (they take priority over positional args)
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
  if (content.type === 'ai-generated') {
    if (!content.prompt) {
      errors.push('AI prompt cannot be empty');
    }
  } else if (!content.text && !content.link) {
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

  // Check text length (assuming Twitter-like 280 character limit) - only for non-AI content
  if (content.text && content.type !== 'ai-generated' && content.text.length > 280) {
    errors.push('Text is too long (maximum 280 characters)');
  }

  // Validate AI style if provided
  if (content.style && !['viral', 'professional', 'casual'].includes(content.style)) {
    errors.push('Invalid style. Must be one of: viral, professional, casual');
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
 * @param {object} config - Configuration object
 */
export async function handlePostCommand(argv, postService = null, config = null) {
  try {
    console.log(colors.green('📝 Preparing to post...'));

    // Parse and validate content
    let content = parsePostContent(argv);
    const validation = validatePostOptions(content);

    if (!validation.valid) {
      console.error(colors.red('❌ Invalid post content:'));
      validation.errors.forEach(error => console.error(`   ${error}`));
      process.exit(1);
    }

    // Handle AI-generated content
    if (content.type === 'ai-generated') {
      if (!isAIReady(config)) {
        console.error(colors.red('❌ AI is not configured. Please run setup to configure OpenAI API key.'));
        process.exit(1);
      }

      console.log(colors.yellow('🤖 Generating content with AI...'));
      console.log(colors.cyan(`💭 Prompt: ${content.prompt}`));
      if (content.link) {
        console.log(colors.cyan(`🔗 Link: ${content.link}`));
      }

      const aiConfig = getAIConfig(config);
      const aiService = initializeAIService(aiConfig.apiKey, aiConfig);

      const aiResult = await aiService.generateViralPost({
        prompt: content.prompt,
        link: content.link,
        style: content.style,
      });

      if (!aiResult.success) {
        console.error(colors.red(`❌ AI content generation failed: ${aiResult.error}`));
        process.exit(1);
      }

      // Replace content with AI-generated content
      content = aiResult.content;
      console.log(colors.green('✨ AI-generated content:'));
      console.log(colors.cyan(`📄 Text: ${content.text}`));
      if (content.link) {
        console.log(colors.cyan(`🔗 Link: ${content.link}`));
      }
      if (aiResult.metadata?.hashtags?.length > 0) {
        console.log(colors.magenta(`🏷️  Hashtags: ${aiResult.metadata.hashtags.join(' ')}`));
      }
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
    if (content.text && content.type !== 'ai-generated') {
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
        .option('prompt', {
          describe: 'AI prompt to generate viral social media content',
          type: 'string'
        })
        .option('style', {
          describe: 'Content style for AI generation',
          type: 'string',
          choices: ['viral', 'professional', 'casual'],
          default: 'viral'
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
    .command('setup', 'Configure OpenAI API key and other settings')
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

    console.log('');
    console.log(colors.yellow('AI Settings:'));
    if (config.ai?.enabled && config.ai?.openaiApiKey) {
      console.log(`  Status: ${colors.green('enabled')}`);
      console.log(`  Model: ${config.ai.model}`);
      console.log(`  Temperature: ${config.ai.temperature}`);
      console.log(`  Max tokens: ${config.ai.maxTokens}`);
      const maskedKey = `${config.ai.openaiApiKey.substring(0, 7)}...${config.ai.openaiApiKey.substring(config.ai.openaiApiKey.length - 4)}`;
      console.log(`  API key: ${maskedKey}`);
    } else {
      console.log(`  Status: ${colors.gray('disabled')}`);
      console.log(`  Run 'social-poster setup' to configure AI features`);
    }

  } catch (error) {
    console.error(colors.red('❌ Config display failed:'), error.message);
    process.exit(1);
  }
}

/**
 * Handle setup command
 */
async function handleSetupCommand(argv) {
  try {
    console.log(colors.green('🔧 Social Poster Setup'));
    console.log('');

    const configPath = argv.configPath || getConfigPath();
    let config = loadConfig(configPath);

    // Create readline interface for user input
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Helper function to ask questions
    const askQuestion = (question) => {
      return new Promise((resolve) => {
        rl.question(question, (answer) => {
          resolve(answer.trim());
        });
      });
    };

    try {
      // Check current AI configuration
      const currentApiKey = config.ai?.openaiApiKey;
      if (currentApiKey) {
        console.log(colors.yellow('🤖 AI Configuration:'));
        console.log(`   OpenAI API Key: ${currentApiKey.substring(0, 7)}...${currentApiKey.substring(currentApiKey.length - 4)}`);
        console.log(`   Model: ${config.ai.model}`);
        console.log(`   Enabled: ${config.ai.enabled ? colors.green('Yes') : colors.red('No')}`);
        console.log('');

        const updateAI = await askQuestion('Do you want to update the AI configuration? (y/N): ');
        if (updateAI.toLowerCase() !== 'y' && updateAI.toLowerCase() !== 'yes') {
          console.log(colors.green('✅ Setup completed - no changes made'));
          rl.close();
          return;
        }
      } else {
        console.log(colors.yellow('🤖 AI Configuration Setup'));
        console.log('   Configure OpenAI API key to enable AI-powered content generation.');
        console.log('   You can get an API key from: https://platform.openai.com/api-keys');
        console.log('');
      }

      // Get OpenAI API key
      const apiKey = await askQuestion('Enter your OpenAI API key (sk-...): ');
      
      if (!apiKey) {
        console.log(colors.yellow('⚠️  No API key provided. AI features will be disabled.'));
        config.ai.enabled = false;
        config.ai.openaiApiKey = '';
      } else {
        // Validate API key format
        if (!apiKey.startsWith('sk-')) {
          console.log(colors.red('❌ Invalid API key format. OpenAI API keys should start with "sk-"'));
          rl.close();
          process.exit(1);
        }

        // Test the API key
        console.log(colors.yellow('🧪 Testing API key...'));
        try {
          const { initializeAIService } = await import('../src/ai-service.js');
          const aiService = initializeAIService(apiKey);
          const isValid = await aiService.testConnection();
          
          if (!isValid) {
            console.log(colors.red('❌ API key test failed. Please check your key and try again.'));
            rl.close();
            process.exit(1);
          }
          
          console.log(colors.green('✅ API key is valid!'));
        } catch (error) {
          console.log(colors.red(`❌ API key test failed: ${error.message}`));
          rl.close();
          process.exit(1);
        }

        // Configure AI settings
        config.ai.openaiApiKey = apiKey;
        config.ai.enabled = true;

        // Ask for model preference
        console.log('');
        console.log('Available models:');
        console.log('  1. gpt-4o-mini (recommended, fast and cost-effective)');
        console.log('  2. gpt-4o (more capable, higher cost)');
        console.log('  3. gpt-3.5-turbo (legacy, lowest cost)');
        
        const modelChoice = await askQuestion('Choose model (1-3) [1]: ') || '1';
        
        const models = {
          '1': 'gpt-4o-mini',
          '2': 'gpt-4o',
          '3': 'gpt-3.5-turbo'
        };
        
        config.ai.model = models[modelChoice] || 'gpt-4o-mini';

        // Ask for temperature setting
        console.log('');
        console.log('Content creativity level:');
        console.log('  1. Conservative (0.3) - More predictable content');
        console.log('  2. Balanced (0.7) - Good mix of creativity and consistency');
        console.log('  3. Creative (1.0) - More varied and creative content');
        
        const tempChoice = await askQuestion('Choose creativity level (1-3) [2]: ') || '2';
        
        const temperatures = {
          '1': 0.3,
          '2': 0.7,
          '3': 1.0
        };
        
        config.ai.temperature = temperatures[tempChoice] || 0.7;
      }

      // Save configuration
      const saveResult = saveConfig(config, configPath);
      if (!saveResult.success) {
        console.log(colors.red(`❌ Failed to save configuration: ${saveResult.error}`));
        rl.close();
        process.exit(1);
      }

      console.log('');
      console.log(colors.green('✅ Setup completed successfully!'));
      console.log('');
      
      if (config.ai.enabled) {
        console.log(colors.cyan('🎉 AI features are now enabled!'));
        console.log('   You can now use the --prompt option to generate viral content:');
        console.log(colors.gray('   social-poster post --prompt "Write about my awesome new project" --link "https://example.com"'));
      } else {
        console.log(colors.yellow('ℹ️  AI features are disabled. You can run setup again to enable them.'));
      }

    } finally {
      rl.close();
    }

  } catch (error) {
    console.error(colors.red('❌ Setup failed:'), error.message);
    if (argv.verbose) {
      console.error(error.stack);
    }
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
    const postService = new PostService({
      platformOptions: {
        x: { headless: argv.headless ?? true },
        linkedin: { headless: argv.headless ?? true },
      },
      sessionsPath: argv.sessionsPath,
    });
    const sessionManager = postService.sessionManager;
    const browserAutomation = new BrowserAutomation({
      headless: argv.headless ?? true,
      sessionsPath: argv.sessionsPath,
    });

    // Handle different commands
    switch (argv._[0]) {
      case 'post':
        await handlePostCommand(argv, postService, config);
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
      case 'setup':
        await handleSetupCommand(argv);
        break;
      case 'config':
        await handleConfigCommand(argv);
        break;
      default:
        console.error(colors.red('Unknown command'));
        process.exit(1);
    }

    // Clean up
    await postService.close();
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