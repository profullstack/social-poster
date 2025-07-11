/**
 * Selector Validator Utility
 * Helps validate and discover HTML selectors for social media platforms
 */

import fs from 'fs';
import path from 'path';
import { BrowserAutomation } from './browser-automation.js';

/**
 * Selector Validator class for testing and discovering platform selectors
 */
export class SelectorValidator extends BrowserAutomation {
  constructor(options = {}) {
    super(options);
  }

  /**
   * Scrape and analyze selectors for a platform
   * @param {string} platform - Platform name
   * @param {string} url - URL to scrape
   * @param {object} selectors - Selectors to test
   * @returns {Promise<object>} Validation results
   */
  async validateSelectors(platform, url, selectors) {
    const page = await this.createPage(platform);
    const results = {
      platform,
      url,
      timestamp: new Date().toISOString(),
      selectors: {},
      suggestions: [],
    };

    try {
      console.log(`🔍 Validating selectors for ${platform} at ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2' });

      // Test each selector
      for (const [name, selector] of Object.entries(selectors)) {
        try {
          const element = await page.$(selector);
          const exists = element !== null;
          
          results.selectors[name] = {
            selector,
            exists,
            element: exists ? await this.getElementInfo(page, selector) : null,
          };

          console.log(`${exists ? '✅' : '❌'} ${name}: ${selector}`);
        } catch (error) {
          results.selectors[name] = {
            selector,
            exists: false,
            error: error.message,
          };
          console.log(`❌ ${name}: ${selector} - Error: ${error.message}`);
        }
      }

      // Generate suggestions for missing selectors
      results.suggestions = await this.generateSelectorSuggestions(page, platform);

      return results;
    } catch (error) {
      console.error(`Failed to validate selectors for ${platform}:`, error.message);
      results.error = error.message;
      return results;
    } finally {
      await page.close();
    }
  }

  /**
   * Get detailed information about an element
   * @param {Page} page - Puppeteer page instance
   * @param {string} selector - CSS selector
   * @returns {Promise<object>} Element information
   */
  async getElementInfo(page, selector) {
    return await page.evaluate((sel) => {
      const element = globalThis.document.querySelector(sel);
      if (!element) return null;

      return {
        tagName: element.tagName,
        id: element.id,
        className: element.className,
        textContent: element.textContent?.slice(0, 100),
        attributes: Array.from(element.attributes).reduce((acc, attr) => {
          acc[attr.name] = attr.value;
          return acc;
        }, {}),
        visible: element.offsetParent !== null,
      };
    }, selector);
  }

  /**
   * Generate selector suggestions based on common patterns
   * @param {Page} page - Puppeteer page instance
   * @param {string} platform - Platform name
   * @returns {Promise<string[]>} Suggested selectors
   */
  async generateSelectorSuggestions(page, platform) {
    const suggestions = [];

    try {
      // Common patterns for different platforms
      const patterns = {
        x: [
          '[data-testid*="tweet"]',
          '[data-testid*="compose"]',
          '[data-testid*="post"]',
          '[role="textbox"]',
          'textarea[placeholder*="tweet"]',
          'button[data-testid*="tweet"]',
        ],
        linkedin: [
          '[data-control-name*="share"]',
          '[data-control-name*="post"]',
          '.ql-editor',
          '[contenteditable="true"]',
          'button[data-control-name*="post"]',
        ],
        reddit: [
          '[name="title"]',
          '[name="url"]',
          '[name="text"]',
          'textarea[name="text"]',
          '[data-testid*="submit"]',
          'button[type="submit"]',
        ],
        facebook: [
          '[data-testid*="status"]',
          '[data-testid*="post"]',
          '[contenteditable="true"]',
          '[role="textbox"]',
          'button[data-testid*="post"]',
        ],
      };

      const platformPatterns = patterns[platform] || [];
      
      for (const pattern of platformPatterns) {
        const elements = await page.$$(pattern);
        if (elements.length > 0) {
          suggestions.push({
            pattern,
            count: elements.length,
            type: 'discovered',
          });
        }
      }

      // Look for common form elements
      const formElements = await page.evaluate(() => {
        const inputs = Array.from(globalThis.document.querySelectorAll('input, textarea, button'));
        return inputs.map(el => ({
          tagName: el.tagName,
          type: el.type,
          name: el.name,
          id: el.id,
          className: el.className,
          placeholder: el.placeholder,
          textContent: el.textContent?.slice(0, 50),
        })).filter(el => 
          el.placeholder?.toLowerCase().includes('post') ||
          el.placeholder?.toLowerCase().includes('tweet') ||
          el.placeholder?.toLowerCase().includes('share') ||
          el.textContent?.toLowerCase().includes('post') ||
          el.textContent?.toLowerCase().includes('tweet') ||
          el.textContent?.toLowerCase().includes('share')
        );
      });

      suggestions.push(...formElements.map(el => ({
        element: el,
        type: 'form_element',
      })));

    } catch (error) {
      console.warn(`Failed to generate suggestions: ${error.message}`);
    }

    return suggestions;
  }

  /**
   * Validate X.com selectors
   * @returns {Promise<object>} Validation results
   */
  async validateXSelectors() {
    const selectors = {
      composeButton: '[data-testid="SideNav_NewTweet_Button"]',
      tweetTextarea: '[data-testid="tweetTextarea_0"]',
      tweetButton: '[data-testid="tweetButtonInline"]',
      accountSwitcher: '[data-testid="SideNav_AccountSwitcher_Button"]',
      profileButton: '[data-testid="AppTabBar_Profile_Link"]',
      homeTimeline: '[data-testid="primaryColumn"]',
    };

    return await this.validateSelectors('x', 'https://x.com', selectors);
  }

  /**
   * Validate LinkedIn selectors
   * @returns {Promise<object>} Validation results
   */
  async validateLinkedInSelectors() {
    const selectors = {
      startPostButton: '[data-control-name="share_via_linkedin"]',
      textEditor: '.ql-editor',
      postButton: '[data-control-name="share.post"]',
      profileMenu: '.global-nav__me',
      feedPage: '.feed-identity-module',
      globalNav: '.global-nav',
    };

    return await this.validateSelectors('linkedin', 'https://www.linkedin.com', selectors);
  }

  /**
   * Validate Reddit selectors
   * @returns {Promise<object>} Validation results
   */
  async validateRedditSelectors() {
    const selectors = {
      titleField: '[name="title"]',
      textArea: 'textarea[name="text"]',
      urlField: '[name="url"]',
      submitButton: 'button[type="submit"]',
      textPostButton: '[data-name="post"]',
      linkPostButton: '[data-name="link"]',
      userDropdown: '[data-testid="user-dropdown-button"]',
    };

    return await this.validateSelectors('reddit', 'https://www.reddit.com/submit', selectors);
  }

  /**
   * Run validation for all platforms
   * @returns {Promise<object[]>} All validation results
   */
  async validateAllPlatforms() {
    const results = [];

    try {
      console.log('🚀 Starting selector validation for all platforms...\n');

      // Validate X.com
      console.log('📱 Validating X.com selectors...');
      results.push(await this.validateXSelectors());

      // Validate LinkedIn
      console.log('\n💼 Validating LinkedIn selectors...');
      results.push(await this.validateLinkedInSelectors());

      // Validate Reddit
      console.log('\n🔴 Validating Reddit selectors...');
      results.push(await this.validateRedditSelectors());

      console.log('\n✅ Selector validation complete!');
      return results;
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      throw error;
    } finally {
      await this.closeBrowser();
    }
  }
}

// Export default instance
export const selectorValidator = new SelectorValidator();

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new SelectorValidator({ headless: false });
  
  validator.validateAllPlatforms()
    .then(results => {
      console.log('\n📊 Validation Results Summary:');
      results.forEach(result => {
        const total = Object.keys(result.selectors).length;
        const valid = Object.values(result.selectors).filter(s => s.exists).length;
        console.log(`${result.platform}: ${valid}/${total} selectors valid`);
      });
      
      // Save results to file
      const resultsPath = path.join(process.cwd(), 'selector-validation-results.json');
      fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
      console.log(`\n💾 Results saved to: ${resultsPath}`);
    })
    .catch(console.error);
}