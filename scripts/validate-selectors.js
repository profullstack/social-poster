#!/usr/bin/env node

/**
 * Selector Validation Script
 * Tests current platform selectors against live websites
 */

import { SelectorValidator } from '../src/selector-validator.js';

async function main() {
  console.log('🔍 Social Media Selector Validation\n');
  
  const validator = new SelectorValidator({ 
    headless: false, // Show browser for debugging
    timeout: 15000 
  });

  try {
    // Test X.com selectors
    console.log('📱 Testing X.com selectors...');
    const xResults = await validator.validateXSelectors();
    printResults(xResults);

    // Test LinkedIn selectors
    console.log('\n💼 Testing LinkedIn selectors...');
    const linkedinResults = await validator.validateLinkedInSelectors();
    printResults(linkedinResults);

    // Test Reddit selectors
    console.log('\n🔴 Testing Reddit selectors...');
    const redditResults = await validator.validateRedditSelectors();
    printResults(redditResults);

    // Generate summary report
    const allResults = [xResults, linkedinResults, redditResults];
    generateSummaryReport(allResults);

  } catch (error) {
    console.error('❌ Validation failed:', error.message);
  } finally {
    await validator.closeBrowser();
  }
}

function printResults(results) {
  console.log(`\n📊 Results for ${results.platform}:`);
  console.log(`🌐 URL: ${results.url}`);
  console.log(`⏰ Timestamp: ${results.timestamp}\n`);

  const selectors = Object.entries(results.selectors);
  const validCount = selectors.filter(([, data]) => data.exists).length;
  const totalCount = selectors.length;

  console.log(`✅ Valid selectors: ${validCount}/${totalCount}\n`);

  // Show detailed results
  selectors.forEach(([name, data]) => {
    const status = data.exists ? '✅' : '❌';
    console.log(`${status} ${name}: ${data.selector}`);
    
    if (data.exists && data.element) {
      console.log(`   └─ ${data.element.tagName}${data.element.id ? `#${data.element.id}` : ''}${data.element.className ? `.${data.element.className.split(' ')[0]}` : ''}`);
    } else if (data.error) {
      console.log(`   └─ Error: ${data.error}`);
    }
  });

  // Show suggestions if any
  if (results.suggestions && results.suggestions.length > 0) {
    console.log('\n💡 Suggestions:');
    results.suggestions.slice(0, 5).forEach((suggestion, index) => {
      if (suggestion.pattern) {
        console.log(`${index + 1}. Pattern: ${suggestion.pattern} (${suggestion.count} elements)`);
      } else if (suggestion.element) {
        const el = suggestion.element;
        console.log(`${index + 1}. Element: ${el.tagName}${el.id ? `#${el.id}` : ''}${el.placeholder ? ` [${el.placeholder}]` : ''}`);
      }
    });
  }
}

function generateSummaryReport(allResults) {
  console.log('\n📋 SUMMARY REPORT');
  console.log('='.repeat(50));

  let totalValid = 0;
  let totalSelectors = 0;

  allResults.forEach(result => {
    const selectors = Object.entries(result.selectors);
    const validCount = selectors.filter(([, data]) => data.exists).length;
    const totalCount = selectors.length;
    
    totalValid += validCount;
    totalSelectors += totalCount;

    const percentage = Math.round((validCount / totalCount) * 100);
    console.log(`${result.platform.toUpperCase()}: ${validCount}/${totalCount} (${percentage}%)`);
  });

  const overallPercentage = Math.round((totalValid / totalSelectors) * 100);
  console.log(`\nOVERALL: ${totalValid}/${totalSelectors} (${overallPercentage}%)`);

  // Recommendations
  console.log('\n🔧 RECOMMENDATIONS:');
  if (overallPercentage < 80) {
    console.log('❗ Selector validation is below 80%. Consider updating selectors.');
  } else if (overallPercentage < 90) {
    console.log('⚠️  Some selectors need attention. Review failed selectors.');
  } else {
    console.log('✅ Most selectors are working well!');
  }

  console.log('\n📝 Next steps:');
  console.log('1. Review failed selectors and update platform implementations');
  console.log('2. Test posting functionality with updated selectors');
  console.log('3. Add fallback selectors for better reliability');
  console.log('4. Consider implementing dynamic selector detection');
}

// Run the validation
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}