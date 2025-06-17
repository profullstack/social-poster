/**
 * Configuration Manager Tests
 * Testing configuration loading, saving, and validation
 */

import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import functions to test
import {
  getConfigPath,
  getDefaultConfig,
  validateConfig,
  loadConfig,
  saveConfig,
  mergeConfig,
  getConfigValue,
  setConfigValue,
} from '../src/config-manager.js';

describe('Config Manager', () => {
  const testConfigDir = path.join(__dirname, 'temp-config');
  const testConfigPath = path.join(testConfigDir, 'test-config.json');

  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testConfigDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  describe('getConfigPath', () => {
    it('should return path in user home directory', () => {
      const configPath = getConfigPath();
      const expectedPath = path.join(os.homedir(), '.config', 'social-poster', 'config.json');
      expect(configPath).to.equal(expectedPath);
    });
  });

  describe('getDefaultConfig', () => {
    it('should return default configuration structure', () => {
      const config = getDefaultConfig();
      
      expect(config).to.have.property('platforms');
      expect(config).to.have.property('general');
      expect(config.platforms).to.have.property('x');
      expect(config.platforms).to.have.property('linkedin');
      expect(config.platforms).to.have.property('reddit');
      expect(config.platforms).to.have.property('stackerNews');
      expect(config.platforms).to.have.property('primal');
      expect(config.platforms).to.have.property('facebook');
      expect(config.platforms).to.have.property('hackerNews');
    });

    it('should have all platforms disabled by default', () => {
      const config = getDefaultConfig();
      
      Object.values(config.platforms).forEach(platform => {
        expect(platform.enabled).to.be.false;
      });
    });

    it('should have reasonable default values', () => {
      const config = getDefaultConfig();
      
      expect(config.general.retryAttempts).to.equal(3);
      expect(config.general.timeout).to.equal(30000);
      expect(config.general.logLevel).to.equal('info');
    });
  });

  describe('validateConfig', () => {
    it('should validate a valid configuration', () => {
      const validConfig = {
        platforms: {
          x: {
            enabled: true,
            accessToken: 'valid-token',
            refreshToken: 'valid-refresh',
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
          },
        },
        general: {
          retryAttempts: 3,
          timeout: 30000,
        },
      };

      const result = validateConfig(validConfig);
      expect(result.valid).to.be.true;
      expect(result.errors).to.be.empty;
    });

    it('should detect missing required fields', () => {
      const invalidConfig = {
        platforms: {
          x: {
            enabled: true,
            // Missing accessToken
          },
        },
      };

      const result = validateConfig(invalidConfig);
      expect(result.valid).to.be.false;
      expect(result.errors).to.include('X platform is enabled but missing access token');
    });

    it('should validate numeric values', () => {
      const invalidConfig = {
        general: {
          retryAttempts: -1,
          timeout: 'invalid',
        },
      };

      const result = validateConfig(invalidConfig);
      expect(result.valid).to.be.false;
      expect(result.errors).to.include('Retry attempts must be a non-negative integer');
      expect(result.errors).to.include('Timeout must be a positive integer');
    });

    it('should validate expired tokens', () => {
      const expiredConfig = {
        platforms: {
          x: {
            enabled: true,
            accessToken: 'token',
            expiresAt: new Date(Date.now() - 3600000).toISOString(), // Expired
          },
        },
      };

      const result = validateConfig(expiredConfig);
      expect(result.valid).to.be.false;
      expect(result.errors).to.include('X platform access token has expired');
    });
  });

  describe('loadConfig', () => {
    it('should return default config when file does not exist', () => {
      const config = loadConfig(testConfigPath);
      const defaultConfig = getDefaultConfig();
      
      expect(config).to.deep.equal(defaultConfig);
    });

    it('should load and merge existing config', () => {
      const customConfig = {
        platforms: {
          x: {
            enabled: true,
            accessToken: 'test-token',
          },
        },
        general: {
          retryAttempts: 5,
        },
      };

      fs.writeFileSync(testConfigPath, JSON.stringify(customConfig, null, 2));
      
      const loadedConfig = loadConfig(testConfigPath);
      
      expect(loadedConfig.platforms.x.enabled).to.be.true;
      expect(loadedConfig.platforms.x.accessToken).to.equal('test-token');
      expect(loadedConfig.general.retryAttempts).to.equal(5);
      expect(loadedConfig.general.timeout).to.equal(30000); // Should keep default
    });

    it('should handle malformed JSON gracefully', () => {
      fs.writeFileSync(testConfigPath, 'invalid json');
      
      const config = loadConfig(testConfigPath);
      const defaultConfig = getDefaultConfig();
      
      expect(config).to.deep.equal(defaultConfig);
    });
  });

  describe('saveConfig', () => {
    it('should save configuration to file', () => {
      const config = {
        platforms: {
          x: {
            enabled: true,
            accessToken: 'test-token',
          },
        },
      };

      const result = saveConfig(config, testConfigPath);
      
      expect(result.success).to.be.true;
      expect(fs.existsSync(testConfigPath)).to.be.true;
      
      const savedData = JSON.parse(fs.readFileSync(testConfigPath, 'utf8'));
      expect(savedData.platforms.x.accessToken).to.equal('test-token');
    });

    it('should create directory if it does not exist', () => {
      const deepPath = path.join(testConfigDir, 'deep', 'nested', 'config.json');
      const config = { test: true };

      const result = saveConfig(config, deepPath);
      
      expect(result.success).to.be.true;
      expect(fs.existsSync(deepPath)).to.be.true;
    });

    it('should handle write errors gracefully', () => {
      const invalidPath = '/root/cannot-write/config.json';
      const config = { test: true };

      const result = saveConfig(config, invalidPath);
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('Failed to save config');
    });
  });

  describe('mergeConfig', () => {
    it('should merge configurations deeply', () => {
      const defaultConfig = {
        platforms: {
          x: { enabled: false, accessToken: '' },
          linkedin: { enabled: false, accessToken: '' },
        },
        general: { retryAttempts: 3, timeout: 30000 },
      };

      const userConfig = {
        platforms: {
          x: { enabled: true, accessToken: 'token' },
        },
        general: { retryAttempts: 5 },
      };

      const merged = mergeConfig(defaultConfig, userConfig);
      
      expect(merged.platforms.x.enabled).to.be.true;
      expect(merged.platforms.x.accessToken).to.equal('token');
      expect(merged.platforms.linkedin.enabled).to.be.false; // Should keep default
      expect(merged.general.retryAttempts).to.equal(5);
      expect(merged.general.timeout).to.equal(30000); // Should keep default
    });

    it('should not modify original objects', () => {
      const original = { test: { value: 1 } };
      const override = { test: { value: 2 } };
      
      const merged = mergeConfig(original, override);
      
      expect(original.test.value).to.equal(1);
      expect(merged.test.value).to.equal(2);
    });
  });

  describe('getConfigValue', () => {
    it('should get nested values using dot notation', () => {
      const config = {
        platforms: {
          x: {
            accessToken: 'test-token',
          },
        },
      };

      const value = getConfigValue(config, 'platforms.x.accessToken');
      expect(value).to.equal('test-token');
    });

    it('should return default value for missing paths', () => {
      const config = {};
      
      const value = getConfigValue(config, 'missing.path', 'default');
      expect(value).to.equal('default');
    });

    it('should return null for missing paths without default', () => {
      const config = {};
      
      const value = getConfigValue(config, 'missing.path');
      expect(value).to.be.null;
    });
  });

  describe('setConfigValue', () => {
    it('should set nested values using dot notation', () => {
      const config = {};
      
      setConfigValue(config, 'platforms.x.accessToken', 'new-token');
      
      expect(config.platforms.x.accessToken).to.equal('new-token');
    });

    it('should create nested objects as needed', () => {
      const config = {};
      
      setConfigValue(config, 'deep.nested.value', 'test');
      
      expect(config.deep.nested.value).to.equal('test');
    });

    it('should overwrite existing values', () => {
      const config = {
        platforms: {
          x: {
            accessToken: 'old-token',
          },
        },
      };
      
      setConfigValue(config, 'platforms.x.accessToken', 'new-token');
      
      expect(config.platforms.x.accessToken).to.equal('new-token');
    });
  });
});