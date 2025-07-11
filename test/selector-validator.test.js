/**
 * Tests for Selector Validator
 * Testing HTML selector validation and discovery functionality
 */

import { expect } from 'chai';
import { SelectorValidator } from '../src/selector-validator.js';

describe('SelectorValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new SelectorValidator({ headless: true });
  });

  afterEach(async () => {
    await validator.closeBrowser();
  });

  describe('constructor', () => {
    it('should create validator instance with default options', () => {
      expect(validator).to.be.instanceOf(SelectorValidator);
      expect(validator.options.headless).to.be.true;
    });

    it('should accept custom options', () => {
      const customValidator = new SelectorValidator({ headless: false, timeout: 60000 });
      expect(customValidator.options.headless).to.be.false;
      expect(customValidator.options.timeout).to.equal(60000);
    });
  });

  describe('validateSelectors', () => {
    it('should validate selectors for a basic HTML page', async function() {
      this.timeout(30000); // Increase timeout for browser operations

      const testSelectors = {
        body: 'body',
        title: 'title',
        nonExistent: '.non-existent-selector'
      };

      const result = await validator.validateSelectors(
        'test',
        'data:text/html,<html><head><title>Test</title></head><body><h1>Test Page</h1></body></html>',
        testSelectors
      );

      expect(result).to.have.property('platform', 'test');
      expect(result).to.have.property('selectors');
      expect(result.selectors.body.exists).to.be.true;
      expect(result.selectors.title.exists).to.be.true;
      expect(result.selectors.nonExistent.exists).to.be.false;
    });

    it('should handle invalid URLs gracefully', async function() {
      this.timeout(30000);

      const result = await validator.validateSelectors(
        'test',
        'invalid-url',
        { body: 'body' }
      );

      expect(result).to.have.property('error');
    });
  });

  describe('getElementInfo', () => {
    it('should return detailed element information', async function() {
      this.timeout(30000);

      const page = await validator.createPage('test');
      await page.goto('data:text/html,<html><body><div id="test" class="test-class" data-testid="test-element">Test Content</div></body></html>');

      const elementInfo = await validator.getElementInfo(page, '#test');

      expect(elementInfo).to.have.property('tagName', 'DIV');
      expect(elementInfo).to.have.property('id', 'test');
      expect(elementInfo).to.have.property('className', 'test-class');
      expect(elementInfo.textContent).to.include('Test Content');
      expect(elementInfo.attributes).to.have.property('data-testid', 'test-element');

      await page.close();
    });

    it('should return null for non-existent elements', async function() {
      this.timeout(30000);

      const page = await validator.createPage('test');
      await page.goto('data:text/html,<html><body></body></html>');

      const elementInfo = await validator.getElementInfo(page, '#non-existent');

      expect(elementInfo).to.be.null;

      await page.close();
    });
  });

  describe('generateSelectorSuggestions', () => {
    it('should generate suggestions for form elements', async function() {
      this.timeout(30000);

      const page = await validator.createPage('test');
      await page.goto('data:text/html,<html><body><input placeholder="What\'s on your mind?" /><button>Post</button></body></html>');

      const suggestions = await validator.generateSelectorSuggestions(page, 'test');

      expect(suggestions).to.be.an('array');
      expect(suggestions.some(s => s.type === 'form_element')).to.be.true;

      await page.close();
    });

    it('should handle pages with no relevant elements', async function() {
      this.timeout(30000);

      const page = await validator.createPage('test');
      await page.goto('data:text/html,<html><body><p>Simple text</p></body></html>');

      const suggestions = await validator.generateSelectorSuggestions(page, 'test');

      expect(suggestions).to.be.an('array');
      // Should not crash even with no relevant elements

      await page.close();
    });
  });

  describe('platform-specific validation methods', () => {
    it('should have validateXSelectors method', () => {
      expect(validator.validateXSelectors).to.be.a('function');
    });

    it('should have validateLinkedInSelectors method', () => {
      expect(validator.validateLinkedInSelectors).to.be.a('function');
    });

    it('should have validateRedditSelectors method', () => {
      expect(validator.validateRedditSelectors).to.be.a('function');
    });
  });

  describe('validateAllPlatforms', () => {
    it('should be a function that returns a promise', () => {
      expect(validator.validateAllPlatforms).to.be.a('function');
      // Note: We don't actually run this in tests as it would try to access real websites
      // and could be flaky/slow. This would be better as an integration test.
    });
  });
});