#!/usr/bin/env node

/**
 * Interactive Selector Recording Script
 * Opens a browser window and records selectors as the user interacts with elements
 */

import fs from 'fs';
import path from 'path';
import { SelectorValidator } from '../src/selector-validator.js';

class SelectorRecorder extends SelectorValidator {
  constructor(options = {}) {
    super({ headless: false, ...options });
    this.recordedSelectors = {};
    this.currentPlatform = null;
  }

  /**
   * Start recording session for a platform
   * @param {string} platform - Platform name
   * @param {string} url - Platform URL
   */
  async startRecording(platform, url) {
    this.currentPlatform = platform;
    this.recordedSelectors[platform] = {
      url,
      timestamp: new Date().toISOString(),
      selectors: {},
      interactions: []
    };

    const page = await this.createPage(platform);
    
    console.log(`🎬 Starting recording session for ${platform}`);
    console.log(`🌐 Navigating to: ${url}`);
    
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // Inject recording script into the page
    await this.injectRecordingScript(page);
    
    console.log('\n📝 INSTRUCTIONS:');
    console.log('1. ⚠️  DO NOT close the browser window manually - it will lose your recording!');
    console.log('2. Perform your normal login and posting workflow');
    console.log('3. Click on elements you want to record (compose buttons, text areas, etc.)');
    console.log('4. Type in text fields to record input selectors');
    console.log('5. 🛑 When finished, press Ctrl+C in THIS TERMINAL to stop recording');
    console.log('6. The tool will automatically save your recording and close the browser');
    console.log('\n🎯 Elements will be automatically recorded as you interact with them');
    console.log('💡 Tip: Look for elements that get highlighted in red when you hover over them');
    console.log('\n🔄 The recording is saved every 2 seconds, so your data is safe!');
    
    // Set up event listeners
    await this.setupEventListeners(page);
    
    return page;
  }

  /**
   * Inject JavaScript into the page to track interactions
   */
  async injectRecordingScript(page) {
    await page.evaluateOnNewDocument(() => {
      // Highlight elements on hover
      let lastHighlighted = null;
      
      function highlightElement(element) {
        if (lastHighlighted) {
          lastHighlighted.style.outline = '';
        }
        element.style.outline = '2px solid #ff6b6b';
        lastHighlighted = element;
      }
      
      function removeHighlight() {
        if (lastHighlighted) {
          lastHighlighted.style.outline = '';
          lastHighlighted = null;
        }
      }
      
      // Generate unique selector for element
      function generateSelector(element) {
        // Try data-testid first
        if (element.getAttribute('data-testid')) {
          return `[data-testid="${element.getAttribute('data-testid')}"]`;
        }
        
        // Try ID
        if (element.id) {
          return `#${element.id}`;
        }
        
        // Try name attribute
        if (element.name) {
          return `[name="${element.name}"]`;
        }
        
        // Try aria-label
        if (element.getAttribute('aria-label')) {
          return `[aria-label="${element.getAttribute('aria-label')}"]`;
        }
        
        // Try class-based selector
        if (element.className && typeof element.className === 'string') {
          const classes = element.className.split(' ').filter(c => c.length > 0);
          if (classes.length > 0) {
            return `.${classes[0]}`;
          }
        }
        
        // Try role
        if (element.getAttribute('role')) {
          return `[role="${element.getAttribute('role')}"]`;
        }
        
        // Fallback to tag name
        return element.tagName.toLowerCase();
      }
      
      // Store recorded interactions
      globalThis.recordedInteractions = [];
      
      // Track clicks
      document.addEventListener('click', (event) => {
        const element = event.target;
        const selector = generateSelector(element);
        
        globalThis.recordedInteractions.push({
          type: 'click',
          selector,
          element: {
            tagName: element.tagName,
            id: element.id,
            className: element.className,
            textContent: element.textContent?.slice(0, 100),
            placeholder: element.placeholder,
            ariaLabel: element.getAttribute('aria-label'),
            role: element.getAttribute('role'),
            type: element.type
          },
          timestamp: new Date().toISOString()
        });
        
        console.log('🎯 Recorded click:', selector);
      });
      
      // Track focus (for input fields)
      document.addEventListener('focus', (event) => {
        const element = event.target;
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.contentEditable === 'true') {
          const selector = generateSelector(element);
          
          globalThis.recordedInteractions.push({
            type: 'focus',
            selector,
            element: {
              tagName: element.tagName,
              id: element.id,
              className: element.className,
              placeholder: element.placeholder,
              ariaLabel: element.getAttribute('aria-label'),
              role: element.getAttribute('role'),
              type: element.type,
              contentEditable: element.contentEditable
            },
            timestamp: new Date().toISOString()
          });
          
          console.log('📝 Recorded focus:', selector);
        }
      });
      
      // Highlight on hover
      document.addEventListener('mouseover', (event) => {
        if (event.target.tagName !== 'BODY' && event.target.tagName !== 'HTML') {
          highlightElement(event.target);
        }
      });
      
      document.addEventListener('mouseout', removeHighlight);
    });
  }

  /**
   * Set up event listeners to capture interactions
   */
  async setupEventListeners(page) {
    // Periodically collect recorded interactions
    const collectInteractions = async () => {
      try {
        const interactions = await page.evaluate(() => {
          const recorded = globalThis.recordedInteractions || [];
          globalThis.recordedInteractions = []; // Clear after collecting
          return recorded;
        });
        
        if (interactions.length > 0) {
          this.recordedSelectors[this.currentPlatform].interactions.push(...interactions);
          this.processInteractions(interactions);
        }
      } catch (error) {
        // Page might be closed or navigated away
      }
    };
    
    // Collect interactions every 2 seconds
    const intervalId = setInterval(collectInteractions, 2000);
    
    // Clean up on page close
    page.on('close', () => {
      clearInterval(intervalId);
    });
    
    return intervalId;
  }

  /**
   * Process recorded interactions and categorize selectors
   */
  processInteractions(interactions) {
    interactions.forEach(interaction => {
      const { element, selector, type } = interaction;
      
      // Categorize based on element properties
      let category = 'unknown';
      
      if (element.textContent?.toLowerCase().includes('tweet') || 
          element.textContent?.toLowerCase().includes('post') ||
          element.ariaLabel?.toLowerCase().includes('tweet') ||
          element.ariaLabel?.toLowerCase().includes('post')) {
        category = 'composeButton';
      } else if (element.tagName === 'TEXTAREA' || 
                 (element.tagName === 'DIV' && element.contentEditable === 'true')) {
        if (element.placeholder?.toLowerCase().includes('tweet') ||
            element.placeholder?.toLowerCase().includes('post') ||
            element.ariaLabel?.toLowerCase().includes('tweet')) {
          category = 'textInput';
        }
      } else if (element.textContent?.toLowerCase().includes('submit') ||
                 element.textContent?.toLowerCase().includes('send') ||
                 element.type === 'submit') {
        category = 'submitButton';
      } else if (element.role === 'button' && type === 'click') {
        category = 'button';
      } else if (element.tagName === 'INPUT') {
        if (element.type === 'text' || element.type === 'url') {
          category = 'textInput';
        }
      }
      
      // Store the selector
      if (!this.recordedSelectors[this.currentPlatform].selectors[category]) {
        this.recordedSelectors[this.currentPlatform].selectors[category] = [];
      }
      
      this.recordedSelectors[this.currentPlatform].selectors[category].push({
        selector,
        element,
        confidence: this.calculateConfidence(element, category),
        timestamp: interaction.timestamp
      });
      
      console.log(`📊 Categorized as ${category}: ${selector}`);
    });
  }

  /**
   * Calculate confidence score for a selector based on element properties
   */
  calculateConfidence(element, category) {
    let score = 0.5; // Base score
    
    // Higher confidence for data-testid
    if (element.id && element.id.includes('testid')) score += 0.3;
    
    // Higher confidence for specific attributes
    if (element.ariaLabel) score += 0.2;
    if (element.role) score += 0.1;
    
    // Category-specific scoring
    if (category === 'composeButton') {
      if (element.textContent?.toLowerCase().includes('tweet')) score += 0.2;
      if (element.ariaLabel?.toLowerCase().includes('compose')) score += 0.2;
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Save recorded selectors to file
   */
  async saveRecording() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `recorded-selectors-${timestamp}.json`;
    const filepath = path.join(process.cwd(), filename);
    
    // Process and clean up the data
    const cleanedData = {};
    
    Object.keys(this.recordedSelectors).forEach(platform => {
      cleanedData[platform] = {
        ...this.recordedSelectors[platform],
        bestSelectors: this.getBestSelectors(platform)
      };
    });
    
    fs.writeFileSync(filepath, JSON.stringify(cleanedData, null, 2));
    
    console.log(`\n💾 Recording saved to: ${filename}`);
    console.log('\n📊 SUMMARY:');
    
    Object.keys(cleanedData).forEach(platform => {
      console.log(`\n${platform.toUpperCase()}:`);
      const best = cleanedData[platform].bestSelectors;
      Object.keys(best).forEach(category => {
        console.log(`  ${category}: ${best[category].selector} (confidence: ${best[category].confidence.toFixed(2)})`);
      });
    });
    
    return filepath;
  }

  /**
   * Get the best selector for each category
   */
  getBestSelectors(platform) {
    const selectors = this.recordedSelectors[platform].selectors;
    const best = {};
    
    Object.keys(selectors).forEach(category => {
      const categorySelectors = selectors[category];
      if (categorySelectors.length > 0) {
        // Sort by confidence and take the best one
        const sorted = categorySelectors.sort((a, b) => b.confidence - a.confidence);
        best[category] = sorted[0];
      }
    });
    
    return best;
  }
}

async function main() {
  const recorder = new SelectorRecorder();
  
  console.log('🎬 Interactive Selector Recording Tool');
  console.log('=====================================\n');
  
  try {
    // Record X.com selectors
    console.log('📱 Starting X.com recording session...');
    const xPage = await recorder.startRecording('x', 'https://x.com');
    
    // Wait for user to complete interactions
    await new Promise((resolve) => {
      process.on('SIGINT', () => {
        console.log('\n🛑 Recording stopped by user');
        resolve();
      });
      
      // Also resolve if page is closed
      xPage.on('close', resolve);
    });
    
    await xPage.close();
    
    // Save the recording
    const savedFile = await recorder.saveRecording();
    
    console.log('\n✅ Recording session completed!');
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

export { SelectorRecorder };