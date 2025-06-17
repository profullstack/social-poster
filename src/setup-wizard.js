/**
 * Setup Wizard
 * Interactive setup wizard for configuring social media platforms
 */

import inquirer from 'inquirer';
import { PostService } from './post-service.js';
import { loadConfig, saveConfig, setConfigValue } from './config-manager.js';

export class SetupWizard {
  constructor(options = {}) {
    this.platforms = options.platforms || [
      'x',
      'linkedin', 
      'reddit',
      'hacker-news',
      'stacker-news',
      'primal',
      'facebook'
    ];
    this.postService = new PostService();
  }

  /**
   * Display welcome message and get user confirmation
   * @returns {Promise<boolean>} True if user wants to continue
   */
  async welcome() {
    console.log('\n🚀 Welcome to Social Poster Setup Wizard!\n');
    console.log('This wizard will help you configure social media platforms for posting.');
    console.log('You can set up authentication, configure general settings, and enable AI features.\n');

    const { continue: shouldContinue } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continue',
        message: 'Would you like to continue with the setup?',
        default: true,
      },
    ]);

    return shouldContinue;
  }

  /**
   * Let user select which platforms to configure
   * @returns {Promise<string[]>} Selected platform names
   */
  async selectPlatforms() {
    console.log('\n📱 Platform Selection\n');
    
    const platformInfo = this.getPlatformInfo();

    const { platforms } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'platforms',
        message: 'Select the platforms you want to configure:',
        choices: platformInfo,
        validate: (input) => {
          if (input.length === 0) {
            return 'Please select at least one platform.';
          }
          return true;
        },
      },
    ]);

    return platforms;
  }

  /**
   * Configure general application settings
   * @returns {Promise<Object>} General configuration
   */
  async configureGeneral() {
    console.log('\n⚙️  General Settings\n');

    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'headless',
        message: 'Run browser automation in headless mode? (recommended for production)',
        default: true,
      },
      {
        type: 'number',
        name: 'timeout',
        message: 'Browser timeout in milliseconds:',
        default: 30000,
        validate: (input) => {
          if (input < 5000) {
            return 'Timeout must be at least 5000ms (5 seconds).';
          }
          if (input > 120000) {
            return 'Timeout cannot exceed 120000ms (2 minutes).';
          }
          return true;
        },
      },
      {
        type: 'number',
        name: 'retryAttempts',
        message: 'Number of retry attempts for failed posts:',
        default: 3,
        validate: (input) => {
          if (input < 0 || input > 10) {
            return 'Retry attempts must be between 0 and 10.';
          }
          return true;
        },
      },
      {
        type: 'checkbox',
        name: 'defaultPlatforms',
        message: 'Select default platforms for posting (when no --platforms specified):',
        choices: this.getPlatformInfo(),
        default: ['x', 'linkedin'],
      },
    ]);

    return answers;
  }

  /**
   * Configure AI settings
   * @returns {Promise<Object>} AI configuration
   */
  async configureAI() {
    console.log('\n🤖 AI Content Generation\n');

    const { enableAI } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'enableAI',
        message: 'Enable AI-powered content generation?',
        default: false,
      },
    ]);

    if (!enableAI) {
      return { enabled: false };
    }

    const aiConfig = await inquirer.prompt([
      {
        type: 'password',
        name: 'openaiApiKey',
        message: 'Enter your OpenAI API key:',
        mask: '*',
        validate: (input) => {
          if (!input) {
            return 'API key is required for AI features.';
          }
          if (!input.startsWith('sk-')) {
            return 'OpenAI API key should start with "sk-".';
          }
          if (input.length < 20) {
            return 'API key appears to be too short.';
          }
          return true;
        },
      },
      {
        type: 'list',
        name: 'defaultStyle',
        message: 'Default content style for AI generation:',
        choices: [
          { name: 'Viral - Engaging and shareable', value: 'viral' },
          { name: 'Professional - Business-focused', value: 'professional' },
          { name: 'Casual - Friendly and conversational', value: 'casual' },
          { name: 'Technical - Developer-focused', value: 'technical' },
        ],
        default: 'viral',
      },
      {
        type: 'number',
        name: 'maxTokens',
        message: 'Maximum tokens for AI responses:',
        default: 150,
        validate: (input) => {
          if (input < 50 || input > 500) {
            return 'Max tokens must be between 50 and 500.';
          }
          return true;
        },
      },
    ]);

    return {
      enabled: true,
      ...aiConfig,
    };
  }

  /**
   * Login to selected platforms
   * @param {string[]} platforms - Platform names to login to
   * @returns {Promise<Object>} Login results for each platform
   */
  async loginToPlatforms(platforms) {
    console.log('\n🔐 Platform Authentication\n');

    const { loginNow } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'loginNow',
        message: 'Would you like to login to the selected platforms now?',
        default: true,
      },
    ]);

    if (!loginNow) {
      console.log('\nSkipping authentication. You can login later using: sp login [platform]');
      return {};
    }

    const loginResults = {};

    for (const platform of platforms) {
      console.log(`\n🔑 Logging in to ${this.getPlatformDisplayName(platform)}...`);
      
      try {
        const success = await this.postService.loginToPlatform(platform);
        loginResults[platform] = success;
        
        if (success) {
          console.log(`✅ Successfully logged in to ${this.getPlatformDisplayName(platform)}`);
        } else {
          console.log(`❌ Failed to login to ${this.getPlatformDisplayName(platform)}`);
        }
      } catch (error) {
        console.log(`❌ Error logging in to ${this.getPlatformDisplayName(platform)}: ${error.message}`);
        loginResults[platform] = false;
      }
    }

    return loginResults;
  }

  /**
   * Save configuration to file
   * @param {Object} config - Complete configuration object
   */
  async saveConfiguration(config) {
    console.log('\n💾 Saving Configuration...\n');

    // Save platform settings
    for (const platform of config.platforms) {
      setConfigValue(`platforms.${platform}.enabled`, true);
    }

    // Save general settings
    for (const [key, value] of Object.entries(config.general)) {
      setConfigValue(`general.${key}`, value);
    }

    // Save AI settings
    for (const [key, value] of Object.entries(config.ai)) {
      setConfigValue(`ai.${key}`, value);
    }

    // Save to file
    saveConfig();
    console.log('✅ Configuration saved successfully!');
  }

  /**
   * Run the complete setup wizard
   * @returns {Promise<Object>} Setup results
   */
  async run() {
    try {
      // Welcome and confirmation
      const shouldContinue = await this.welcome();
      if (!shouldContinue) {
        return {
          success: false,
          message: 'Setup cancelled by user.',
        };
      }

      // Platform selection
      const selectedPlatforms = await this.selectPlatforms();
      console.log(`\n✅ Selected platforms: ${selectedPlatforms.join(', ')}`);

      // General configuration
      const generalConfig = await this.configureGeneral();
      console.log('\n✅ General settings configured');

      // AI configuration
      const aiConfig = await this.configureAI();
      console.log(`\n✅ AI features ${aiConfig.enabled ? 'enabled' : 'disabled'}`);

      // Platform authentication
      const loginResults = await this.loginToPlatforms(selectedPlatforms);

      // Save configuration
      const completeConfig = {
        platforms: selectedPlatforms,
        general: generalConfig,
        ai: aiConfig,
      };

      await this.saveConfiguration(completeConfig);

      // Summary
      console.log('\n🎉 Setup Complete!\n');
      console.log('Summary:');
      console.log(`• Platforms configured: ${selectedPlatforms.length}`);
      console.log(`• AI features: ${aiConfig.enabled ? 'Enabled' : 'Disabled'}`);
      
      const successfulLogins = Object.values(loginResults).filter(Boolean).length;
      const totalLogins = Object.keys(loginResults).length;
      if (totalLogins > 0) {
        console.log(`• Authentication: ${successfulLogins}/${totalLogins} successful`);
      }

      console.log('\nYou can now start posting with: sp post "Your message here"');
      console.log('For help, run: sp --help\n');

      return {
        success: true,
        platforms: selectedPlatforms,
        loginResults,
        config: completeConfig,
      };

    } catch (error) {
      console.error('\n❌ Setup failed:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get platform information for display
   * @returns {Array} Platform info objects
   */
  getPlatformInfo() {
    return [
      {
        name: 'X (Twitter) - Microblogging platform',
        value: 'x',
        short: 'X (Twitter)',
      },
      {
        name: 'LinkedIn - Professional networking',
        value: 'linkedin',
        short: 'LinkedIn',
      },
      {
        name: 'Reddit - Community discussions',
        value: 'reddit',
        short: 'Reddit',
      },
      {
        name: 'Hacker News - Tech news and discussions',
        value: 'hacker-news',
        short: 'Hacker News',
      },
      {
        name: 'Stacker News - Bitcoin-focused community',
        value: 'stacker-news',
        short: 'Stacker News',
      },
      {
        name: 'Primal (Nostr) - Decentralized social protocol',
        value: 'primal',
        short: 'Primal (Nostr)',
      },
      {
        name: 'Facebook - Social networking platform',
        value: 'facebook',
        short: 'Facebook',
      },
    ];
  }

  /**
   * Get display name for a platform
   * @param {string} platform - Platform identifier
   * @returns {string} Display name
   */
  getPlatformDisplayName(platform) {
    const info = this.getPlatformInfo().find(p => p.value === platform);
    return info ? info.short : platform;
  }
}

export default SetupWizard;