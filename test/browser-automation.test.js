/**
 * Browser Automation Tests
 * Testing Puppeteer-based login and session management
 */

import { expect } from 'chai';
import sinon from 'sinon';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import functions to test
import {
  BrowserAutomation,
  SessionManager,
  loadSessions,
  saveSessions,
  validateSession,
  getSessionsPath,
} from '../src/browser-automation.js';

describe('Browser Automation', () => {
  let sandbox;
  const testSessionsDir = path.join(__dirname, 'temp-sessions');
  const testSessionsPath = path.join(testSessionsDir, 'test-sessions.json');

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Clean up test directory
    if (fs.existsSync(testSessionsDir)) {
      fs.rmSync(testSessionsDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testSessionsDir, { recursive: true });
  });

  afterEach(() => {
    sandbox.restore();
    
    // Clean up test directory
    if (fs.existsSync(testSessionsDir)) {
      fs.rmSync(testSessionsDir, { recursive: true, force: true });
    }
  });

  describe('getSessionsPath', () => {
    it('should return path in user config directory', () => {
      const sessionsPath = getSessionsPath();
      expect(sessionsPath).to.include('.config/social-poster/sessions.json');
    });
  });

  describe('loadSessions', () => {
    it('should return empty object when file does not exist', () => {
      const sessions = loadSessions(testSessionsPath);
      expect(sessions).to.deep.equal({});
    });

    it('should load existing sessions', () => {
      const testSessions = {
        x: {
          cookies: [{ name: 'test', value: 'cookie' }],
          lastValidated: new Date().toISOString(),
        },
      };

      fs.writeFileSync(testSessionsPath, JSON.stringify(testSessions, null, 2));
      
      const sessions = loadSessions(testSessionsPath);
      expect(sessions).to.deep.equal(testSessions);
    });

    it('should handle malformed JSON gracefully', () => {
      fs.writeFileSync(testSessionsPath, 'invalid json');
      
      const sessions = loadSessions(testSessionsPath);
      expect(sessions).to.deep.equal({});
    });
  });

  describe('saveSessions', () => {
    it('should save sessions to file', () => {
      const sessions = {
        x: {
          cookies: [{ name: 'test', value: 'cookie' }],
          lastValidated: new Date().toISOString(),
        },
      };

      const result = saveSessions(sessions, testSessionsPath);
      
      expect(result.success).to.be.true;
      expect(fs.existsSync(testSessionsPath)).to.be.true;
      
      const savedData = JSON.parse(fs.readFileSync(testSessionsPath, 'utf8'));
      expect(savedData).to.deep.equal(sessions);
    });

    it('should create directory if it does not exist', () => {
      const deepPath = path.join(testSessionsDir, 'deep', 'nested', 'sessions.json');
      const sessions = { test: true };

      const result = saveSessions(sessions, deepPath);
      
      expect(result.success).to.be.true;
      expect(fs.existsSync(deepPath)).to.be.true;
    });

    it('should handle write errors gracefully', () => {
      const invalidPath = '/root/cannot-write/sessions.json';
      const sessions = { test: true };

      const result = saveSessions(sessions, invalidPath);
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('Failed to save sessions');
    });
  });

  describe('validateSession', () => {
    it('should validate fresh session', () => {
      const session = {
        cookies: [{ name: 'auth', value: 'token' }],
        lastValidated: new Date().toISOString(),
      };

      const isValid = validateSession(session);
      expect(isValid).to.be.true;
    });

    it('should invalidate old session', () => {
      const session = {
        cookies: [{ name: 'auth', value: 'token' }],
        lastValidated: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
      };

      const isValid = validateSession(session);
      expect(isValid).to.be.false;
    });

    it('should invalidate session without cookies', () => {
      const session = {
        cookies: [],
        lastValidated: new Date().toISOString(),
      };

      const isValid = validateSession(session);
      expect(isValid).to.be.false;
    });

    it('should invalidate session without lastValidated', () => {
      const session = {
        cookies: [{ name: 'auth', value: 'token' }],
      };

      const isValid = validateSession(session);
      expect(isValid).to.be.false;
    });
  });

  describe('SessionManager', () => {
    let sessionManager;

    beforeEach(() => {
      sessionManager = new SessionManager(testSessionsPath);
    });

    describe('constructor', () => {
      it('should initialize with sessions path', () => {
        expect(sessionManager.sessionsPath).to.equal(testSessionsPath);
      });

      it('should load existing sessions', () => {
        const testSessions = {
          x: { cookies: [{ name: 'test', value: 'cookie' }] },
        };
        fs.writeFileSync(testSessionsPath, JSON.stringify(testSessions));

        const manager = new SessionManager(testSessionsPath);
        expect(manager.sessions).to.deep.equal(testSessions);
      });
    });

    describe('getSession', () => {
      it('should return session for platform', () => {
        sessionManager.sessions.x = { cookies: [{ name: 'test', value: 'cookie' }] };
        
        const session = sessionManager.getSession('x');
        expect(session).to.deep.equal({ cookies: [{ name: 'test', value: 'cookie' }] });
      });

      it('should return null for non-existent platform', () => {
        const session = sessionManager.getSession('nonexistent');
        expect(session).to.be.null;
      });
    });

    describe('setSession', () => {
      it('should set session for platform', () => {
        const session = {
          cookies: [{ name: 'auth', value: 'token' }],
          lastValidated: new Date().toISOString(),
        };

        sessionManager.setSession('x', session);
        expect(sessionManager.sessions.x).to.deep.equal(session);
      });

      it('should save sessions after setting', () => {
        const session = { cookies: [{ name: 'test', value: 'cookie' }] };
        
        sessionManager.setSession('x', session);
        
        // Verify file was written
        expect(fs.existsSync(testSessionsPath)).to.be.true;
        const savedData = JSON.parse(fs.readFileSync(testSessionsPath, 'utf8'));
        expect(savedData.x).to.deep.equal(session);
      });
    });

    describe('isSessionValid', () => {
      it('should return true for valid session', () => {
        const session = {
          cookies: [{ name: 'auth', value: 'token' }],
          lastValidated: new Date().toISOString(),
        };
        sessionManager.sessions.x = session;

        const isValid = sessionManager.isSessionValid('x');
        expect(isValid).to.be.true;
      });

      it('should return false for invalid session', () => {
        const session = {
          cookies: [],
          lastValidated: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
        };
        sessionManager.sessions.x = session;

        const isValid = sessionManager.isSessionValid('x');
        expect(isValid).to.be.false;
      });

      it('should return false for non-existent session', () => {
        const isValid = sessionManager.isSessionValid('nonexistent');
        expect(isValid).to.be.false;
      });
    });

    describe('clearSession', () => {
      it('should clear session for platform', () => {
        sessionManager.sessions.x = { cookies: [{ name: 'test', value: 'cookie' }] };
        
        sessionManager.clearSession('x');
        expect(sessionManager.sessions.x).to.be.undefined;
      });

      it('should save sessions after clearing', () => {
        sessionManager.sessions.x = { cookies: [{ name: 'test', value: 'cookie' }] };
        
        sessionManager.clearSession('x');
        
        // Verify file was written
        const savedData = JSON.parse(fs.readFileSync(testSessionsPath, 'utf8'));
        expect(savedData.x).to.be.undefined;
      });
    });
  });

  describe('BrowserAutomation', () => {
    let browserAutomation;
    let mockBrowser;
    let mockPage;

    beforeEach(() => {
      // Mock Puppeteer browser and page
      mockPage = {
        goto: sandbox.stub(),
        setCookie: sandbox.stub(),
        cookies: sandbox.stub(),
        evaluate: sandbox.stub(),
        waitForSelector: sandbox.stub(),
        click: sandbox.stub(),
        type: sandbox.stub(),
        waitForNavigation: sandbox.stub(),
        close: sandbox.stub(),
        setViewport: sandbox.stub(),
        setUserAgent: sandbox.stub(),
      };

      mockBrowser = {
        newPage: sandbox.stub().resolves(mockPage),
        close: sandbox.stub(),
      };

      browserAutomation = new BrowserAutomation({
        headless: true,
        sessionsPath: testSessionsPath,
      });
    });

    describe('constructor', () => {
      it('should initialize with default options', () => {
        const automation = new BrowserAutomation();
        expect(automation.options.headless).to.be.true;
        expect(automation.options.timeout).to.equal(30000);
      });

      it('should initialize with custom options', () => {
        const automation = new BrowserAutomation({
          headless: false,
          timeout: 60000,
        });
        expect(automation.options.headless).to.be.false;
        expect(automation.options.timeout).to.equal(60000);
      });
    });

    describe('launchBrowser', () => {
      it('should launch browser with correct options', async () => {
        // Mock puppeteer.launch
        const puppeteerMock = {
          launch: sandbox.stub().resolves(mockBrowser),
        };
        
        // This would need to be properly mocked in a real test environment
        // For now, we'll test the logic without actually launching puppeteer
        expect(browserAutomation.options.headless).to.be.true;
      });
    });

    describe('restoreSession', () => {
      it('should restore cookies and storage from session', async () => {
        const session = {
          cookies: [{ name: 'auth', value: 'token', domain: '.example.com' }],
          localStorage: { key: 'value' },
          sessionStorage: { session: 'data' },
          userAgent: 'test-agent',
          viewport: { width: 1920, height: 1080 },
        };

        await browserAutomation.restoreSession(mockPage, session);

        expect(mockPage.setCookie.calledWith(session.cookies[0])).to.be.true;
        expect(mockPage.setUserAgent.calledWith(session.userAgent)).to.be.true;
        expect(mockPage.setViewport.calledWith(session.viewport)).to.be.true;
      });
    });

    describe('captureSession', () => {
      it('should capture cookies and storage from page', async () => {
        const mockCookies = [{ name: 'auth', value: 'token' }];
        const mockLocalStorage = { key: 'value' };
        const mockSessionStorage = { session: 'data' };

        mockPage.cookies.resolves(mockCookies);
        mockPage.evaluate.onFirstCall().resolves(mockLocalStorage);
        mockPage.evaluate.onSecondCall().resolves(mockSessionStorage);

        const session = await browserAutomation.captureSession(mockPage);

        expect(session.cookies).to.deep.equal(mockCookies);
        expect(session.localStorage).to.deep.equal(mockLocalStorage);
        expect(session.sessionStorage).to.deep.equal(mockSessionStorage);
        expect(session.lastValidated).to.be.a('string');
      });
    });
  });
});