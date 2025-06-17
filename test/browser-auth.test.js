/**
 * Browser Authentication Tests
 * Testing browser-based OAuth flows and token management
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import functions to test
import {
  BrowserAuth,
  generateAuthUrl,
  generateCodeChallenge,
  generateCodeVerifier,
  parseCallbackUrl,
  startLocalServer,
  openBrowser,
} from '../src/browser-auth.js';

describe('Browser Authentication', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('generateCodeVerifier', () => {
    it('should generate a code verifier of correct length', () => {
      const verifier = generateCodeVerifier();
      
      expect(verifier).to.be.a('string');
      expect(verifier.length).to.be.at.least(43);
      expect(verifier.length).to.be.at.most(128);
    });

    it('should generate different verifiers on each call', () => {
      const verifier1 = generateCodeVerifier();
      const verifier2 = generateCodeVerifier();
      
      expect(verifier1).to.not.equal(verifier2);
    });

    it('should only contain URL-safe characters', () => {
      const verifier = generateCodeVerifier();
      const urlSafeRegex = /^[A-Za-z0-9\-._~]+$/;
      
      expect(urlSafeRegex.test(verifier)).to.be.true;
    });
  });

  describe('generateCodeChallenge', () => {
    it('should generate a code challenge from verifier', () => {
      const verifier = 'test-verifier-123';
      const challenge = generateCodeChallenge(verifier);
      
      expect(challenge).to.be.a('string');
      expect(challenge.length).to.be.greaterThan(0);
    });

    it('should generate consistent challenge for same verifier', () => {
      const verifier = 'test-verifier-123';
      const challenge1 = generateCodeChallenge(verifier);
      const challenge2 = generateCodeChallenge(verifier);
      
      expect(challenge1).to.equal(challenge2);
    });

    it('should generate different challenges for different verifiers', () => {
      const challenge1 = generateCodeChallenge('verifier1');
      const challenge2 = generateCodeChallenge('verifier2');
      
      expect(challenge1).to.not.equal(challenge2);
    });
  });

  describe('generateAuthUrl', () => {
    it('should generate a valid OAuth URL', () => {
      const config = {
        authUrl: 'https://example.com/oauth/authorize',
        clientId: 'test-client-id',
        redirectUri: 'http://localhost:3000/callback',
        scope: 'read write',
        state: 'test-state',
        codeChallenge: 'test-challenge',
      };

      const url = generateAuthUrl(config);
      const parsedUrl = new URL(url);
      
      expect(parsedUrl.origin + parsedUrl.pathname).to.equal(config.authUrl);
      expect(parsedUrl.searchParams.get('client_id')).to.equal(config.clientId);
      expect(parsedUrl.searchParams.get('redirect_uri')).to.equal(config.redirectUri);
      expect(parsedUrl.searchParams.get('scope')).to.equal(config.scope);
      expect(parsedUrl.searchParams.get('state')).to.equal(config.state);
      expect(parsedUrl.searchParams.get('code_challenge')).to.equal(config.codeChallenge);
      expect(parsedUrl.searchParams.get('response_type')).to.equal('code');
      expect(parsedUrl.searchParams.get('code_challenge_method')).to.equal('S256');
    });

    it('should handle optional parameters', () => {
      const config = {
        authUrl: 'https://example.com/oauth/authorize',
        clientId: 'test-client-id',
        redirectUri: 'http://localhost:3000/callback',
      };

      const url = generateAuthUrl(config);
      const parsedUrl = new URL(url);
      
      expect(parsedUrl.searchParams.get('client_id')).to.equal(config.clientId);
      expect(parsedUrl.searchParams.get('scope')).to.be.null;
      expect(parsedUrl.searchParams.get('state')).to.be.null;
    });
  });

  describe('parseCallbackUrl', () => {
    it('should parse authorization code from callback URL', () => {
      const callbackUrl = 'http://localhost:3000/callback?code=auth-code-123&state=test-state';
      const result = parseCallbackUrl(callbackUrl);
      
      expect(result.code).to.equal('auth-code-123');
      expect(result.state).to.equal('test-state');
      expect(result.error).to.be.undefined;
    });

    it('should parse error from callback URL', () => {
      const callbackUrl = 'http://localhost:3000/callback?error=access_denied&error_description=User%20denied';
      const result = parseCallbackUrl(callbackUrl);
      
      expect(result.error).to.equal('access_denied');
      expect(result.errorDescription).to.equal('User denied');
      expect(result.code).to.be.undefined;
    });

    it('should handle malformed URLs gracefully', () => {
      const result = parseCallbackUrl('not-a-url');
      
      expect(result.error).to.equal('invalid_url');
    });
  });

  describe('BrowserAuth', () => {
    let browserAuth;

    beforeEach(() => {
      browserAuth = new BrowserAuth({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        authUrl: 'https://example.com/oauth/authorize',
        tokenUrl: 'https://example.com/oauth/token',
        redirectUri: 'http://localhost:3000/callback',
        scope: 'read write',
      });
    });

    describe('constructor', () => {
      it('should initialize with provided configuration', () => {
        expect(browserAuth.config.clientId).to.equal('test-client-id');
        expect(browserAuth.config.authUrl).to.equal('https://example.com/oauth/authorize');
      });

      it('should throw error for missing required config', () => {
        expect(() => new BrowserAuth({})).to.throw('Client ID is required');
        expect(() => new BrowserAuth({ clientId: 'test' })).to.throw('Auth URL is required');
      });
    });

    describe('generateAuthUrl', () => {
      it('should generate auth URL with PKCE', () => {
        const url = browserAuth.generateAuthUrl();
        const parsedUrl = new URL(url);
        
        expect(parsedUrl.searchParams.get('client_id')).to.equal('test-client-id');
        expect(parsedUrl.searchParams.get('code_challenge')).to.exist;
        expect(parsedUrl.searchParams.get('code_challenge_method')).to.equal('S256');
      });

      it('should store code verifier for later use', () => {
        browserAuth.generateAuthUrl();
        
        expect(browserAuth.codeVerifier).to.exist;
        expect(browserAuth.codeVerifier).to.be.a('string');
      });
    });

    describe('exchangeCodeForToken', () => {
      it('should exchange authorization code for access token', async () => {
        const mockResponse = {
          access_token: 'access-token-123',
          refresh_token: 'refresh-token-123',
          expires_in: 3600,
          token_type: 'Bearer',
        };

        // Mock fetch
        const fetchStub = sandbox.stub(global, 'fetch');
        fetchStub.resolves({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        browserAuth.codeVerifier = 'test-verifier';
        const result = await browserAuth.exchangeCodeForToken('auth-code-123');
        
        expect(result.accessToken).to.equal('access-token-123');
        expect(result.refreshToken).to.equal('refresh-token-123');
        expect(result.expiresIn).to.equal(3600);
        expect(result.tokenType).to.equal('Bearer');
      });

      it('should handle token exchange errors', async () => {
        const fetchStub = sandbox.stub(global, 'fetch');
        fetchStub.resolves({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: 'invalid_grant' }),
        });

        browserAuth.codeVerifier = 'test-verifier';
        
        try {
          await browserAuth.exchangeCodeForToken('invalid-code');
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error.message).to.include('Token exchange failed');
        }
      });

      it('should throw error if code verifier is missing', async () => {
        try {
          await browserAuth.exchangeCodeForToken('auth-code-123');
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error.message).to.include('Code verifier not found');
        }
      });
    });

    describe('refreshAccessToken', () => {
      it('should refresh access token using refresh token', async () => {
        const mockResponse = {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
        };

        const fetchStub = sandbox.stub(global, 'fetch');
        fetchStub.resolves({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await browserAuth.refreshAccessToken('refresh-token-123');
        
        expect(result.accessToken).to.equal('new-access-token');
        expect(result.refreshToken).to.equal('new-refresh-token');
      });

      it('should handle refresh token errors', async () => {
        const fetchStub = sandbox.stub(global, 'fetch');
        fetchStub.resolves({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: 'invalid_grant' }),
        });

        try {
          await browserAuth.refreshAccessToken('invalid-refresh-token');
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error.message).to.include('Token refresh failed');
        }
      });
    });
  });

  describe('startLocalServer', () => {
    it('should start server and return port', async () => {
      const server = await startLocalServer();
      
      expect(server.port).to.be.a('number');
      expect(server.port).to.be.greaterThan(0);
      expect(server.close).to.be.a('function');
      
      // Clean up
      server.close();
    });

    it('should handle callback requests', async () => {
      const server = await startLocalServer();
      
      // This is a basic test - in a real scenario we'd make an HTTP request
      expect(server.getCallbackPromise).to.be.a('function');
      
      server.close();
    });
  });

  describe('openBrowser', () => {
    it('should attempt to open browser with URL', async () => {
      // Mock child_process.exec
      const { exec } = await import('child_process');
      const execStub = sandbox.stub({ exec }, 'exec');
      execStub.callsArg(1); // Call callback with no error

      const url = 'https://example.com/auth';
      await openBrowser(url);
      
      // Verify exec was called (implementation may vary by platform)
      expect(execStub.called).to.be.true;
    });

    it('should handle browser open errors gracefully', async () => {
      const { exec } = await import('child_process');
      const execStub = sandbox.stub({ exec }, 'exec');
      execStub.callsArgWith(1, new Error('Command failed'));

      const url = 'https://example.com/auth';
      
      // Should not throw error, just log warning
      await openBrowser(url);
      expect(execStub.called).to.be.true;
    });
  });
});