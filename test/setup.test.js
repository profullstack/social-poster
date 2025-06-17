/**
 * Setup Command Tests
 * Testing interactive setup wizard functionality
 */

import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import esmock from 'esmock';

// Use sinon-chai plugin
chai.use(sinonChai);

describe('Setup Command', () => {
  let sandbox;
  let SetupWizard;
  let mockInquirer;
  let mockConfigManager;
  let mockPostService;
  let setupWizard;

  beforeEach(async () => {
    sandbox = sinon.createSandbox();

    // Mock inquirer
    mockInquirer = {
      prompt: sandbox.stub(),
    };

    // Mock config manager
    mockConfigManager = {
      loadConfig: sandbox.stub(),
      saveConfig: sandbox.stub(),
      getConfigValue: sandbox.stub(),
      setConfigValue: sandbox.stub(),
    };

    // Mock post service
    mockPostService = {
      getPlatformStatus: sandbox.stub(),
      loginToPlatform: sandbox.stub(),
    };

    // Import the setup wizard
    const module = await esmock('../src/setup-wizard.js', {
      inquirer: mockInquirer,
      '../src/config-manager.js': mockConfigManager,
      '../src/post-service.js': { PostService() { return mockPostService; } },
    });
    SetupWizard = module.SetupWizard;

    setupWizard = new SetupWizard();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const wizard = new SetupWizard();
      expect(wizard.platforms).to.be.an('array');
      expect(wizard.platforms).to.include.members(['x', 'linkedin', 'reddit', 'hacker-news', 'stacker-news', 'primal', 'facebook']);
    });

    it('should initialize with custom platforms', () => {
      const customPlatforms = ['x', 'linkedin'];
      const wizard = new SetupWizard({ platforms: customPlatforms });
      expect(wizard.platforms).to.deep.equal(customPlatforms);
    });
  });

  describe('welcome', () => {
    it('should display welcome message', async () => {
      mockInquirer.prompt.resolves({ continue: true });

      const result = await setupWizard.welcome();

      expect(result).to.be.true;
      expect(mockInquirer.prompt).to.have.been.calledOnce;
      const promptCall = mockInquirer.prompt.getCall(0);
      expect(promptCall.args[0]).to.be.an('array');
      expect(promptCall.args[0][0]).to.have.property('type', 'confirm');
      expect(promptCall.args[0][0]).to.have.property('name', 'continue');
    });

    it('should handle user declining to continue', async () => {
      mockInquirer.prompt.resolves({ continue: false });

      const result = await setupWizard.welcome();

      expect(result).to.be.false;
    });
  });

  describe('selectPlatforms', () => {
    it('should allow user to select platforms', async () => {
      const selectedPlatforms = ['x', 'linkedin', 'reddit'];
      mockInquirer.prompt.resolves({ platforms: selectedPlatforms });

      const result = await setupWizard.selectPlatforms();

      expect(result).to.deep.equal(selectedPlatforms);
      expect(mockInquirer.prompt).to.have.been.calledOnce;
      const promptCall = mockInquirer.prompt.getCall(0);
      expect(promptCall.args[0]).to.be.an('array');
      expect(promptCall.args[0][0]).to.have.property('type', 'checkbox');
      expect(promptCall.args[0][0]).to.have.property('name', 'platforms');
    });

    it('should provide all available platforms as choices', async () => {
      mockInquirer.prompt.resolves({ platforms: [] });

      await setupWizard.selectPlatforms();

      const promptCall = mockInquirer.prompt.getCall(0);
      const {choices} = promptCall.args[0][0];
      expect(choices).to.be.an('array');
      expect(choices.length).to.equal(7); // All 7 platforms
    });
  });

  describe('configureGeneral', () => {
    it('should configure general settings', async () => {
      const generalConfig = {
        headless: true,
        timeout: 30000,
        retryAttempts: 3,
        defaultPlatforms: ['x', 'linkedin'],
      };
      mockInquirer.prompt.resolves(generalConfig);

      const result = await setupWizard.configureGeneral();

      expect(result).to.deep.equal(generalConfig);
      expect(mockInquirer.prompt).to.have.been.calledOnce;
    });

    it('should provide default values', async () => {
      mockInquirer.prompt.resolves({});

      await setupWizard.configureGeneral();

      const promptCall = mockInquirer.prompt.getCall(0);
      const questions = promptCall.args[0];
      
      // Check that default values are provided
      const headlessQuestion = questions.find(q => q.name === 'headless');
      expect(headlessQuestion).to.have.property('default', true);
      
      const timeoutQuestion = questions.find(q => q.name === 'timeout');
      expect(timeoutQuestion).to.have.property('default', 30000);
    });
  });

  describe('configureAI', () => {
    it('should configure AI settings when user wants AI', async () => {
      mockInquirer.prompt
        .onFirstCall().resolves({ enableAI: true })
        .onSecondCall().resolves({ 
          openaiApiKey: 'sk-test123',
          defaultStyle: 'viral',
          maxTokens: 150 
        });

      const result = await setupWizard.configureAI();

      expect(result).to.deep.equal({
        enabled: true,
        openaiApiKey: 'sk-test123',
        defaultStyle: 'viral',
        maxTokens: 150,
      });
      expect(mockInquirer.prompt).to.have.been.calledTwice;
    });

    it('should skip AI configuration when user declines', async () => {
      mockInquirer.prompt.resolves({ enableAI: false });

      const result = await setupWizard.configureAI();

      expect(result).to.deep.equal({ enabled: false });
      expect(mockInquirer.prompt).to.have.been.calledOnce;
    });

    it('should validate OpenAI API key format', async () => {
      mockInquirer.prompt
        .onFirstCall().resolves({ enableAI: true })
        .onSecondCall().resolves({ 
          openaiApiKey: 'invalid-key',
          defaultStyle: 'viral',
          maxTokens: 150 
        });

      await setupWizard.configureAI();

      const promptCall = mockInquirer.prompt.getCall(1);
      const questions = promptCall.args[0];
      const apiKeyQuestion = questions.find(q => q.name === 'openaiApiKey');
      
      expect(apiKeyQuestion).to.have.property('validate');
      expect(apiKeyQuestion.validate('sk-valid123456789012345')).to.be.true; // 25 chars, valid
      expect(apiKeyQuestion.validate('invalid')).to.be.a('string'); // Error message
    });
  });

  describe('loginToPlatforms', () => {
    it('should login to selected platforms', async () => {
      const platforms = ['x', 'linkedin'];
      mockInquirer.prompt.resolves({ loginNow: true });
      mockPostService.loginToPlatform.resolves(true);

      const result = await setupWizard.loginToPlatforms(platforms);

      expect(result).to.be.an('object');
      expect(result.x).to.be.true;
      expect(result.linkedin).to.be.true;
      expect(mockPostService.loginToPlatform).to.have.been.calledTwice;
      expect(mockPostService.loginToPlatform).to.have.been.calledWith('x');
      expect(mockPostService.loginToPlatform).to.have.been.calledWith('linkedin');
    });

    it('should skip login when user declines', async () => {
      const platforms = ['x', 'linkedin'];
      mockInquirer.prompt.resolves({ loginNow: false });

      const result = await setupWizard.loginToPlatforms(platforms);

      expect(result).to.deep.equal({});
      expect(mockPostService.loginToPlatform).not.to.have.been.called;
    });

    it('should handle login failures gracefully', async () => {
      const platforms = ['x'];
      mockInquirer.prompt.resolves({ loginNow: true });
      mockPostService.loginToPlatform.resolves(false);

      const result = await setupWizard.loginToPlatforms(platforms);

      expect(result.x).to.be.false;
    });
  });

  describe('saveConfiguration', () => {
    it('should save complete configuration', async () => {
      const config = {
        platforms: ['x', 'linkedin'],
        general: { headless: true, timeout: 30000 },
        ai: { enabled: true, openaiApiKey: 'sk-test123' },
      };

      await setupWizard.saveConfiguration(config);

      expect(mockConfigManager.setConfigValue).to.have.been.calledWith('platforms.x.enabled', true);
      expect(mockConfigManager.setConfigValue).to.have.been.calledWith('platforms.linkedin.enabled', true);
      expect(mockConfigManager.setConfigValue).to.have.been.calledWith('general.headless', true);
      expect(mockConfigManager.setConfigValue).to.have.been.calledWith('general.timeout', 30000);
      expect(mockConfigManager.setConfigValue).to.have.been.calledWith('ai.enabled', true);
      expect(mockConfigManager.setConfigValue).to.have.been.calledWith('ai.openaiApiKey', 'sk-test123');
      expect(mockConfigManager.saveConfig).to.have.been.calledOnce;
    });
  });

  describe('run', () => {
    it('should complete full setup workflow', async () => {
      // Mock all the steps
      setupWizard.welcome = sandbox.stub().resolves(true);
      setupWizard.selectPlatforms = sandbox.stub().resolves(['x', 'linkedin']);
      setupWizard.configureGeneral = sandbox.stub().resolves({ headless: true });
      setupWizard.configureAI = sandbox.stub().resolves({ enabled: false });
      setupWizard.loginToPlatforms = sandbox.stub().resolves({ x: true, linkedin: true });
      setupWizard.saveConfiguration = sandbox.stub().resolves();

      const result = await setupWizard.run();

      expect(result.success).to.be.true;
      expect(result.platforms).to.deep.equal(['x', 'linkedin']);
      expect(setupWizard.welcome).to.have.been.calledOnce;
      expect(setupWizard.selectPlatforms).to.have.been.calledOnce;
      expect(setupWizard.configureGeneral).to.have.been.calledOnce;
      expect(setupWizard.configureAI).to.have.been.calledOnce;
      expect(setupWizard.loginToPlatforms).to.have.been.calledOnce;
      expect(setupWizard.saveConfiguration).to.have.been.calledOnce;
    });

    it('should handle user cancellation', async () => {
      setupWizard.welcome = sandbox.stub().resolves(false);

      const result = await setupWizard.run();

      expect(result.success).to.be.false;
      expect(result.message).to.include('cancelled');
    });

    it('should handle errors gracefully', async () => {
      setupWizard.welcome = sandbox.stub().rejects(new Error('Test error'));

      const result = await setupWizard.run();

      expect(result.success).to.be.false;
      expect(result.error).to.include('Test error');
    });
  });

  describe('getPlatformInfo', () => {
    it('should return platform information', () => {
      const info = setupWizard.getPlatformInfo();

      expect(info).to.be.an('array');
      expect(info).to.have.length(7);
      
      const xInfo = info.find(p => p.value === 'x');
      expect(xInfo).to.have.property('name');
      expect(xInfo).to.have.property('value', 'x');
      expect(xInfo).to.have.property('short');
    });
  });
});