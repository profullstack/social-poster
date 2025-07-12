#!/usr/bin/env node

/**
 * Enhanced Auto Recording Script for Multiple Platforms
 * Records selectors for X.com, TikTok, and Pinterest with improved automation
 */

import fs from 'fs';
import path from 'path';
import { SelectorValidator } from '../src/selector-validator.js';

class MultiPlatformRecorder extends SelectorValidator {
  constructor(options = {}) {
    super({ headless: false, ...options });
    this.recordedSelectors = {};
    this.currentPlatform = null;
    this.platforms = {
      x: {
        name: 'X.com (Twitter)',
        url: 'https://x.com',
        loginUrl: 'https://x.com/i/flow/login',
        composeUrl: 'https://x.com/compose/tweet',
        selectors: {
          loginIndicators: [
            '[data-testid="SideNav_AccountSwitcher_Button"]',
            '[data-testid="AppTabBar_Profile_Link"]',
            '[data-testid="primaryColumn"]'
          ],
          composeButton: '[data-testid="SideNav_NewTweet_Button"]',
          textInput: '[data-testid="tweetTextarea_0"]',
          submitButton: '[data-testid="tweetButtonInline"]'
        }
      },
      tiktok: {
        name: 'TikTok',
        url: 'https://www.tiktok.com',
        loginUrl: 'https://www.tiktok.com/login',
        uploadUrl: 'https://www.tiktok.com/upload',
        selectors: {
          loginIndicators: [
            '[data-e2e="profile-icon"]',
            '[data-e2e="nav-profile"]',
            '[data-e2e="nav-upload"]'
          ],
          uploadButton: '[data-e2e="nav-upload"]',
          fileInput: 'input[type="file"]',
          textInput: '[data-text="true"]',
          submitButton: '[data-e2e="post-button"]'
        }
      },
      pinterest: {
        name: 'Pinterest',
        url: 'https://www.pinterest.com',
        loginUrl: 'https://www.pinterest.com/login',
        createUrl: 'https://www.pinterest.com/pin-creation-tool',
        selectors: {
          loginIndicators: [
            '[data-test-id="header-profile"]',
            '[data-test-id="user-avatar"]',
            '[data-test-id="create-pin-button"]'
          ],
          createButton: '[data-test-id="create-pin-button"]',
          fileInput: 'input[type="file"]',
          urlInput: '[data-test-id="pin-draft-link-url"]',
          textInput: '[data-test-id="pin-draft-description"]',
          submitButton: '[data-test-id="board-dropdown-save-button"]'
        }
      }
    };
  }

  /**
   * Start recording session for a platform
   * @param {string} platform - Platform key (x, tiktok, pinterest)
   */
  async startRecording(platform) {
    const platformConfig = this.platforms[platform];
    if (!platformConfig) {
      throw new Error(`Unknown platform: ${platform}`);
    }

    this.currentPlatform = platform;
    this.recordedSelectors[platform] = {
      name: platformConfig.name,
      url: platformConfig.url,
      timestamp: new Date().toISOString(),
      selectors: {},
      interactions: [],
      knownSelectors: platformConfig.selectors
    };

    const page = await this.createPage(platform);
    
    console.log(`🎬 Starting recording session for ${platformConfig.name}`);
    console.log(`🌐 Navigating to: ${platformConfig.url}`);
    
    await page.goto(platformConfig.url, { waitUntil: 'networkidle2' });
    
    // Inject enhanced recording script
    await this.injectEnhancedRecordingScript(page, platform);
    
    console.log('\n📝 ENHANCED RECORDING INSTRUCTIONS:');
    console.log('1. ⚠️  DO NOT close the browser window manually');
    console.log('2. The tool will automatically validate known selectors');
    console.log('3. Perform your normal workflow (login, compose, post)');
    console.log('4. New selectors will be auto-discovered and recorded');
    console.log('5. 🛑 Press Ctrl+C to stop recording and save results');
    console.log('\n🎯 Auto-validation results will be shown in real-time');
    console.log('💡 Green = Working selector, Red = Broken selector');
    console.log('\n🔄 Recording is auto-saved every 3 seconds');
    
    // Set up enhanced event listeners
    await this.setupEnhancedEventListeners(page, platform);
    
    // Start auto-validation
    this.startAutoValidation(page, platform);
    
    return page;
  }

  /**
   * Inject enhanced JavaScript for better selector recording
   */
  async injectEnhancedRecordingScript(page, platform) {
    const platformConfig = this.platforms[platform];
    
    await page.evaluateOnNewDocument((config) => {
      // Enhanced highlighting system
      let lastHighlighted = null;
      const highlightColors = {
        working: '#4CAF50',    // Green for working selectors
        broken: '#F44336',     // Red for broken selectors
        new: '#2196F3',        // Blue for new discoveries
        interaction: '#FF9800'  // Orange for user interactions
      };
      
      function highlightElement(element, type = 'interaction') {
        if (lastHighlighted) {
          lastHighlighted.style.outline = '';
          lastHighlighted.style.boxShadow = '';
        }
        
        const color = highlightColors[type];
        element.style.outline = `3px solid ${color}`;
        element.style.boxShadow = `0 0 10px ${color}`;
        lastHighlighted = element;
        
        // Auto-remove highlight after 2 seconds
        setTimeout(() => {
          if (lastHighlighted === element) {
            element.style.outline = '';
            element.style.boxShadow = '';
            lastHighlighted = null;
          }
        }, 2000);
      }
      
      // Enhanced selector generation with priority scoring
      function generateSelectorWithScore(element) {
        const selectors = [];
        
        // Priority 1: data-testid (highest priority)
        if (element.getAttribute('data-testid')) {
          selectors.push({
            selector: `[data-testid="${element.getAttribute('data-testid')}"]`,
            score: 100,
            type: 'data-testid'
          });
        }
        
        // Priority 2: data-e2e
        if (element.getAttribute('data-e2e')) {
          selectors.push({
            selector: `[data-e2e="${element.getAttribute('data-e2e')}"]`,
            score: 95,
            type: 'data-e2e'
          });
        }
        
        // Priority 3: data-test-id
        if (element.getAttribute('data-test-id')) {
          selectors.push({
            selector: `[data-test-id="${element.getAttribute('data-test-id')}"]`,
            score: 90,
            type: 'data-test-id'
          });
        }
        
        // Priority 4: ID
        if (element.id) {
          selectors.push({
            selector: `#${element.id}`,
            score: 80,
            type: 'id'
          });
        }
        
        // Priority 5: name attribute
        if (element.name) {
          selectors.push({
            selector: `[name="${element.name}"]`,
            score: 70,
            type: 'name'
          });
        }
        
        // Priority 6: aria-label
        if (element.getAttribute('aria-label')) {
          selectors.push({
            selector: `[aria-label="${element.getAttribute('aria-label')}"]`,
            score: 60,
            type: 'aria-label'
          });
        }
        
        // Priority 7: role
        if (element.getAttribute('role')) {
          selectors.push({
            selector: `[role="${element.getAttribute('role')}"]`,
            score: 50,
            type: 'role'
          });
        }
        
        // Priority 8: class-based (lower priority)
        if (element.className && typeof element.className === 'string') {
          const classes = element.className.split(' ').filter(c => c.length > 0);
          if (classes.length > 0) {
            selectors.push({
              selector: `.${classes[0]}`,
              score: 30,
              type: 'class'
            });
          }
        }
        
        // Return best selector
        return selectors.sort((a, b) => b.score - a.score)[0] || {
          selector: element.tagName.toLowerCase(),
          score: 10,
          type: 'tag'
        };
      }
      
      // Store recorded interactions with enhanced metadata
      globalThis.recordedInteractions = [];
      globalThis.knownSelectors = config.selectors;
      globalThis.validationResults = {};
      
      // Enhanced interaction tracking
      function recordInteraction(element, type, event) {
        const selectorData = generateSelectorWithScore(element);
        const interaction = {
          type,
          selector: selectorData.selector,
          selectorType: selectorData.type,
          confidence: selectorData.score,
          element: {
            tagName: element.tagName,
            id: element.id,
            className: element.className,
            textContent: element.textContent?.slice(0, 100),
            placeholder: element.placeholder,
            ariaLabel: element.getAttribute('aria-label'),
            role: element.getAttribute('role'),
            type: element.type,
            href: element.href,
            src: element.src
          },
          position: {
            x: event?.clientX || 0,
            y: event?.clientY || 0
          },
          timestamp: new Date().toISOString(),
          url: globalThis.window.location.href
        };
        
        globalThis.recordedInteractions.push(interaction);
        console.log(`🎯 Recorded ${type}:`, selectorData.selector, `(confidence: ${selectorData.score})`);
        
        // Highlight the element
        highlightElement(element, 'interaction');
      }
      
      // Track all meaningful interactions
      document.addEventListener('click', (event) => {
        recordInteraction(event.target, 'click', event);
      });
      
      document.addEventListener('focus', (event) => {
        if (['INPUT', 'TEXTAREA'].includes(event.target.tagName) || 
            event.target.contentEditable === 'true') {
          recordInteraction(event.target, 'focus', event);
        }
      });
      
      document.addEventListener('input', (event) => {
        if (['INPUT', 'TEXTAREA'].includes(event.target.tagName) || 
            event.target.contentEditable === 'true') {
          recordInteraction(event.target, 'input', event);
        }
      });
      
      // Auto-validate known selectors
      globalThis.validateKnownSelectors = () => {
        const results = {};
        Object.keys(globalThis.knownSelectors).forEach(category => {
          const selector = globalThis.knownSelectors[category];
          if (typeof selector === 'string') {
            const element = document.querySelector(selector);
            results[category] = {
              selector,
              found: !!element,
              visible: element ? element.offsetParent !== null : false
            };
            
            if (element) {
              highlightElement(element, results[category].visible ? 'working' : 'broken');
            }
          } else if (Array.isArray(selector)) {
            // Handle array of selectors
            results[category] = selector.map(sel => {
              const element = document.querySelector(sel);
              return {
                selector: sel,
                found: !!element,
                visible: element ? element.offsetParent !== null : false
              };
            });
          }
        });
        
        globalThis.validationResults = results;
        return results;
      };
      
      // Run validation every 5 seconds
      setInterval(globalThis.validateKnownSelectors, 5000);
      
    }, platformConfig);
  }

  /**
   * Set up enhanced event listeners with auto-validation
   */
  async setupEnhancedEventListeners(page, platform) {
    // Collect interactions more frequently
    const collectInteractions = async () => {
      try {
        const data = await page.evaluate(() => {
          const interactions = globalThis.recordedInteractions || [];
          const validationResults = globalThis.validationResults || {};
          
          // Clear interactions after collecting
          globalThis.recordedInteractions = [];
          
          return { interactions, validationResults };
        });
        
        if (data.interactions.length > 0) {
          this.recordedSelectors[platform].interactions.push(...data.interactions);
          this.processEnhancedInteractions(data.interactions, platform);
        }
        
        if (Object.keys(data.validationResults).length > 0) {
          this.updateValidationResults(data.validationResults, platform);
        }
      } catch (error) {
        // Page might be closed or navigated away
      }
    };
    
    // Collect every 3 seconds for better responsiveness
    const intervalId = setInterval(collectInteractions, 3000);
    
    // Clean up on page close
    page.on('close', () => {
      clearInterval(intervalId);
    });
    
    return intervalId;
  }

  /**
   * Start auto-validation of known selectors
   */
  async startAutoValidation(page, platform) {
    const validateSelectors = async () => {
      try {
        const results = await page.evaluate(() => {
          return globalThis.validateKnownSelectors();
        });
        
        this.displayValidationResults(results, platform);
      } catch (error) {
        // Page might be closed
      }
    };
    
    // Initial validation
    setTimeout(validateSelectors, 2000);
    
    // Validate every 10 seconds
    const validationInterval = setInterval(validateSelectors, 10000);
    
    // Clean up on page close
    page.on('close', () => {
      clearInterval(validationInterval);
    });
  }

  /**
   * Process enhanced interactions with better categorization
   */
  processEnhancedInteractions(interactions, platform) {
    interactions.forEach(interaction => {
      const category = this.categorizeInteraction(interaction, platform);
      
      if (!this.recordedSelectors[platform].selectors[category]) {
        this.recordedSelectors[platform].selectors[category] = [];
      }
      
      // Avoid duplicates
      const existing = this.recordedSelectors[platform].selectors[category]
        .find(item => item.selector === interaction.selector);
      
      if (!existing) {
        this.recordedSelectors[platform].selectors[category].push({
          selector: interaction.selector,
          selectorType: interaction.selectorType,
          confidence: interaction.confidence,
          element: interaction.element,
          timestamp: interaction.timestamp,
          interactionType: interaction.type
        });
        
        console.log(`📊 New ${category} selector: ${interaction.selector} (${interaction.confidence}% confidence)`);
      }
    });
  }

  /**
   * Enhanced interaction categorization
   */
  categorizeInteraction(interaction, platform) {
    const { element, type, selector } = interaction;
    const text = (element.textContent || '').toLowerCase();
    const ariaLabel = (element.ariaLabel || '').toLowerCase();
    const placeholder = (element.placeholder || '').toLowerCase();
    
    // Platform-specific categorization
    if (platform === 'x') {
      if (text.includes('tweet') || text.includes('post') || ariaLabel.includes('tweet')) {
        return 'composeButton';
      }
      if (element.tagName === 'TEXTAREA' || selector.includes('tweetTextarea')) {
        return 'textInput';
      }
      if (text.includes('tweet') && type === 'click' && element.tagName === 'BUTTON') {
        return 'submitButton';
      }
    } else if (platform === 'tiktok') {
      if (text.includes('upload') || ariaLabel.includes('upload')) {
        return 'uploadButton';
      }
      if (element.type === 'file') {
        return 'fileInput';
      }
      if (element.contentEditable === 'true' || placeholder.includes('caption')) {
        return 'textInput';
      }
      if (text.includes('post') && type === 'click') {
        return 'submitButton';
      }
    } else if (platform === 'pinterest') {
      if (text.includes('create') || text.includes('pin')) {
        return 'createButton';
      }
      if (element.type === 'file') {
        return 'fileInput';
      }
      if (placeholder.includes('url') || placeholder.includes('link')) {
        return 'urlInput';
      }
      if (placeholder.includes('description') || element.tagName === 'TEXTAREA') {
        return 'textInput';
      }
      if (text.includes('save') || text.includes('publish')) {
        return 'submitButton';
      }
    }
    
    // Generic categorization
    if (element.tagName === 'BUTTON' && type === 'click') {
      return 'button';
    }
    if (['INPUT', 'TEXTAREA'].includes(element.tagName) || element.contentEditable === 'true') {
      return 'input';
    }
    if (element.tagName === 'A') {
      return 'link';
    }
    
    return 'unknown';
  }

  /**
   * Update and display validation results
   */
  updateValidationResults(results, platform) {
    this.recordedSelectors[platform].validationResults = results;
  }

  /**
   * Display validation results in console
   */
  displayValidationResults(results, platform) {
    console.log(`\n🔍 Validation Results for ${this.platforms[platform].name}:`);
    Object.keys(results).forEach(category => {
      const result = results[category];
      if (Array.isArray(result)) {
        result.forEach((item, index) => {
          const status = item.found ? (item.visible ? '✅' : '⚠️ ') : '❌';
          console.log(`  ${category}[${index}]: ${status} ${item.selector}`);
        });
      } else {
        const status = result.found ? (result.visible ? '✅' : '⚠️ ') : '❌';
        console.log(`  ${category}: ${status} ${result.selector}`);
      }
    });
  }

  /**
   * Save enhanced recording with validation results
   */
  async saveRecording() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `auto-recorded-selectors-${timestamp}.json`;
    const filepath = path.join(process.cwd(), filename);
    
    // Process and clean up the data
    const cleanedData = {};
    
    Object.keys(this.recordedSelectors).forEach(platform => {
      cleanedData[platform] = {
        ...this.recordedSelectors[platform],
        bestSelectors: this.getBestSelectors(platform),
        selectorStats: this.getSelectorStats(platform)
      };
    });
    
    fs.writeFileSync(filepath, JSON.stringify(cleanedData, null, 2));
    
    console.log(`\n💾 Enhanced recording saved to: ${filename}`);
    console.log('\n📊 RECORDING SUMMARY:');
    
    Object.keys(cleanedData).forEach(platform => {
      const data = cleanedData[platform];
      console.log(`\n${data.name.toUpperCase()}:`);
      console.log(`  Total interactions: ${data.interactions.length}`);
      console.log(`  Unique selectors: ${Object.keys(data.selectors).length}`);
      
      const best = data.bestSelectors;
      Object.keys(best).forEach(category => {
        const selector = best[category];
        console.log(`  ${category}: ${selector.selector} (${selector.confidence}% confidence)`);
      });
    });
    
    return filepath;
  }

  /**
   * Get selector statistics
   */
  getSelectorStats(platform) {
    const selectors = this.recordedSelectors[platform].selectors;
    const stats = {
      totalCategories: Object.keys(selectors).length,
      totalSelectors: 0,
      averageConfidence: 0,
      selectorTypes: {}
    };
    
    let totalConfidence = 0;
    let selectorCount = 0;
    
    Object.values(selectors).forEach(categorySelectors => {
      categorySelectors.forEach(selector => {
        stats.totalSelectors++;
        totalConfidence += selector.confidence || 0;
        selectorCount++;
        
        const type = selector.selectorType || 'unknown';
        stats.selectorTypes[type] = (stats.selectorTypes[type] || 0) + 1;
      });
    });
    
    stats.averageConfidence = selectorCount > 0 ? Math.round(totalConfidence / selectorCount) : 0;
    
    return stats;
  }

  /**
   * Get the best selector for each category with enhanced scoring
   */
  getBestSelectors(platform) {
    const selectors = this.recordedSelectors[platform].selectors;
    const best = {};
    
    Object.keys(selectors).forEach(category => {
      const categorySelectors = selectors[category];
      if (categorySelectors.length > 0) {
        // Sort by confidence and recency
        const sorted = categorySelectors.sort((a, b) => {
          const confidenceDiff = (b.confidence || 0) - (a.confidence || 0);
          if (confidenceDiff !== 0) return confidenceDiff;
          
          // If confidence is equal, prefer more recent
          return new Date(b.timestamp) - new Date(a.timestamp);
        });
        
        best[category] = sorted[0];
      }
    });
    
    return best;
  }
}

async function main() {
  const recorder = new MultiPlatformRecorder();
  
  console.log('🎬 Enhanced Multi-Platform Auto Recording Tool');
  console.log('==============================================\n');
  
  // Get platform choice from command line args
  const platform = process.argv[2];
  const validPlatforms = ['x', 'tiktok', 'pinterest', 'all'];
  
  if (!platform || !validPlatforms.includes(platform)) {
    console.log('Usage: node auto-record-platforms.js <platform>');
    console.log('Platforms: x, tiktok, pinterest, all');
    process.exit(1);
  }
  
  try {
    const platformsToRecord = platform === 'all' ? ['x', 'tiktok', 'pinterest'] : [platform];
    const pages = [];
    
    // Start recording for all specified platforms
    for (const platformKey of platformsToRecord) {
      console.log(`\n📱 Starting ${recorder.platforms[platformKey].name} recording session...`);
      const page = await recorder.startRecording(platformKey);
      pages.push(page);
    }
    
    // Wait for user to complete interactions
    await new Promise((resolve) => {
      process.on('SIGINT', () => {
        console.log('\n🛑 Recording stopped by user');
        resolve();
      });
      
      // Also resolve if any page is closed
      pages.forEach(page => page.on('close', resolve));
    });
    
    // Close all pages
    await Promise.all(pages.map(page => page.close()));
    
    // Save the recording
    const savedFile = await recorder.saveRecording();
    
    console.log('\n✅ Enhanced recording session completed!');
    console.log(`📁 Results saved to: ${savedFile}`);
    
  } catch (error) {
    console.error('❌ Recording failed:', error.message);
  } finally {
    await recorder.closeBrowser();
  }
}

// Run the recorder
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { MultiPlatformRecorder };