/**
 * Configuration Manager
 * Handles user configuration for social media poster
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Get the path to the configuration file
 * @returns {string} Full path to config.json
 */
export function getConfigPath() {
  return path.join(os.homedir(), '.config', 'social-poster', 'config.json');
}

/**
 * Get default configuration structure
 * @returns {object} Default configuration object
 */
export function getDefaultConfig() {
  return {
    platforms: {
      x: {
        enabled: false,
        accessToken: '',
        refreshToken: '',
        expiresAt: '',
        clientId: '',
        clientSecret: '',
      },
      linkedin: {
        enabled: false,
        accessToken: '',
        refreshToken: '',
        expiresAt: '',
        clientId: '',
        clientSecret: '',
      },
      reddit: {
        enabled: false,
        accessToken: '',
        refreshToken: '',
        expiresAt: '',
        clientId: '',
        clientSecret: '',
        username: '',
      },
      stackerNews: {
        enabled: false,
        accessToken: '',
        refreshToken: '',
        expiresAt: '',
        apiKey: '',
      },
      primal: {
        enabled: false,
        privateKey: '',
        publicKey: '',
        relays: ['wss://relay.primal.net'],
      },
      facebook: {
        enabled: false,
        accessToken: '',
        refreshToken: '',
        expiresAt: '',
        clientId: '',
        clientSecret: '',
        pageId: '',
      },
      hackerNews: {
        enabled: false,
        username: '',
        password: '',
        sessionCookie: '',
      },
    },
    general: {
      defaultPlatforms: [],
      retryAttempts: 3,
      timeout: 30000,
      logLevel: 'info',
      rateLimitDelay: 1000,
    },
  };
}

/**
 * Validate configuration object
 * @param {object} config - Configuration to validate
 * @returns {object} Validation result with valid flag and errors array
 */
export function validateConfig(config) {
  const errors = [];

  if (!config || typeof config !== 'object') {
    errors.push('Configuration must be an object');
    return { valid: false, errors };
  }

  // Validate platforms
  if (config.platforms) {
    for (const [platformName, platformConfig] of Object.entries(config.platforms)) {
      if (platformConfig?.enabled) {
        // Check for required tokens/credentials
        if (platformName === 'x' || platformName === 'linkedin' || platformName === 'facebook') {
          if (!platformConfig.accessToken?.trim()) {
            errors.push(
              `${platformName.charAt(0).toUpperCase() + platformName.slice(1)} platform is enabled but missing access token`
            );
          }
          // Check token expiration
          if (platformConfig.expiresAt) {
            const expiryDate = new Date(platformConfig.expiresAt);
            if (expiryDate < new Date()) {
              errors.push(
                `${platformName.charAt(0).toUpperCase() + platformName.slice(1)} platform access token has expired`
              );
            }
          }
        }

        if (platformName === 'reddit') {
          if (!platformConfig.accessToken?.trim()) {
            errors.push('Reddit platform is enabled but missing access token');
          }
          if (!platformConfig.username?.trim()) {
            errors.push('Reddit platform is enabled but missing username');
          }
        }

        if (platformName === 'stackerNews') {
          if (!platformConfig.apiKey?.trim()) {
            errors.push('Stacker News platform is enabled but missing API key');
          }
        }

        if (platformName === 'primal') {
          if (!platformConfig.privateKey?.trim()) {
            errors.push('Primal platform is enabled but missing private key');
          }
        }

        if (platformName === 'hackerNews') {
          if (!platformConfig.username?.trim() || !platformConfig.password?.trim()) {
            errors.push('Hacker News platform is enabled but missing username or password');
          }
        }
      }
    }
  }

  // Validate general settings
  if (config.general) {
    const { retryAttempts, timeout, rateLimitDelay } = config.general;

    if (retryAttempts !== undefined) {
      if (!Number.isInteger(retryAttempts) || retryAttempts < 0) {
        errors.push('Retry attempts must be a non-negative integer');
      }
    }

    if (timeout !== undefined) {
      if (!Number.isInteger(timeout) || timeout <= 0) {
        errors.push('Timeout must be a positive integer');
      }
    }

    if (rateLimitDelay !== undefined) {
      if (!Number.isInteger(rateLimitDelay) || rateLimitDelay < 0) {
        errors.push('Rate limit delay must be a non-negative integer');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Load configuration from file
 * @param {string} [configPath] - Optional custom config path
 * @returns {object} Configuration object
 */
export function loadConfig(configPath = getConfigPath()) {
  try {
    if (!fs.existsSync(configPath)) {
      return getDefaultConfig();
    }

    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);

    // Merge with defaults to ensure all fields exist
    return mergeConfig(getDefaultConfig(), config);
  } catch (error) {
    console.warn(`Failed to load config from ${configPath}: ${error.message}`);
    return getDefaultConfig();
  }
}

/**
 * Save configuration to file
 * @param {object} config - Configuration object to save
 * @param {string} [configPath] - Optional custom config path
 * @returns {object} Result with success flag and optional error message
 */
export function saveConfig(config, configPath = getConfigPath()) {
  try {
    // Ensure directory exists
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Save config (validation is optional and done elsewhere)
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to save config: ${error.message}`,
    };
  }
}

/**
 * Merge configuration objects (deep merge)
 * @param {object} defaultConfig - Default configuration
 * @param {object} userConfig - User configuration to merge
 * @returns {object} Merged configuration
 */
export function mergeConfig(defaultConfig, userConfig) {
  const merged = JSON.parse(JSON.stringify(defaultConfig)); // Deep clone

  function deepMerge(target, source) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  deepMerge(merged, userConfig);
  return merged;
}

/**
 * Get configuration value by dot notation path
 * @param {object} config - Configuration object
 * @param {string} path - Dot notation path (e.g., 'platforms.x.accessToken')
 * @param {*} defaultValue - Default value if path not found
 * @returns {*} Configuration value
 */
export function getConfigValue(config, path, defaultValue = null) {
  return path.split('.').reduce((obj, key) => obj?.[key], config) ?? defaultValue;
}

/**
 * Set configuration value by dot notation path
 * @param {object} config - Configuration object to modify
 * @param {string} path - Dot notation path (e.g., 'platforms.x.accessToken')
 * @param {*} value - Value to set
 * @returns {object} Modified configuration object
 */
export function setConfigValue(config, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((obj, key) => {
    if (!obj[key]) obj[key] = {};
    return obj[key];
  }, config);

  target[lastKey] = value;
  return config;
}

/**
 * Check if platform is enabled and properly configured
 * @param {object} config - Configuration object
 * @param {string} platformName - Platform name
 * @returns {boolean} True if platform is ready to use
 */
export function isPlatformReady(config, platformName) {
  const platform = config?.platforms?.[platformName];
  if (!platform?.enabled) {
    return false;
  }

  const validation = validateConfig({ platforms: { [platformName]: platform } });
  return validation.valid;
}

/**
 * Get list of enabled and ready platforms
 * @param {object} config - Configuration object
 * @returns {string[]} Array of platform names that are ready
 */
export function getReadyPlatforms(config) {
  const platforms = [];
  
  if (config?.platforms) {
    for (const platformName of Object.keys(config.platforms)) {
      if (isPlatformReady(config, platformName)) {
        platforms.push(platformName);
      }
    }
  }

  return platforms;
}

/**
 * Get platform display name
 * @param {string} platformName - Internal platform name
 * @returns {string} Display name
 */
export function getPlatformDisplayName(platformName) {
  const displayNames = {
    x: 'X (Twitter)',
    linkedin: 'LinkedIn',
    reddit: 'Reddit',
    stackerNews: 'Stacker News',
    primal: 'Primal (Nostr)',
    facebook: 'Facebook',
    hackerNews: 'Hacker News',
  };

  return displayNames[platformName] || platformName;
}