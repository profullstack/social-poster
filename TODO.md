# Social Media Poster - Development TODO

## Project Overview
Create a CLI tool similar to lead-generator that supports authentication and posting to multiple social media platforms. The tool should support both CLI usage and Node.js module usage.

## Architecture Requirements
- **CLI Tool**: Command-line interface with yargs
- **Module Support**: Exportable functions for programmatic use
- **Authentication**: Puppeteer-based browser automation for login (no restrictive APIs)
- **Session Storage**: Save login sessions in ~/.config/social-poster/sessions.json
- **Multi-platform**: Support for x.com, linkedin.com, reddit.com, stacker.news, primal.net, facebook, hacker news
- **Post Types**: Support both text posts and link posts with text
- **Configuration**: JSON-based config management similar to lead-generator
- **Testing**: Mocha + Chai test suite
- **Modern Node.js**: ESM modules, Node.js 20+

## Phase 1: Project Setup & Core Infrastructure
- [x] Initialize package.json with proper ESM configuration
- [x] Set up directory structure (src/, test/, bin/, examples/)
- [x] Create main entry points (index.js, bin/social-poster.js)
- [x] Set up ESLint and Prettier configuration
- [x] Create config manager for storing authentication tokens
- [x] Set up basic CLI structure with yargs

## Phase 2: Authentication Framework (Puppeteer-based)
- [x] Create Puppeteer-based browser automation service
- [x] Implement session management (cookies, localStorage, etc.)
- [x] Create sessions.json storage system
- [x] Add login command with platform selection
- [x] Add session validation and refresh logic
- [x] Create authentication status checker

## Phase 3: Platform Implementations
### X.com (Twitter)
- [x] Implement X.com authentication (Puppeteer-based)
- [x] Create posting service for tweets
- [x] Add support for text and link posts
- [x] Handle rate limiting and error handling
- [ ] Add support for media uploads
- [ ] Add support for threads/tweet chains

### LinkedIn
- [x] Implement LinkedIn authentication (Puppeteer-based)
- [x] Create posting service for LinkedIn posts
- [x] Add support for text and link posts
- [x] Handle LinkedIn-specific formatting
- [ ] Add support for article publishing
- [ ] Add support for company page posting

### Reddit
- [x] Implement Reddit authentication (Puppeteer-based)
- [x] Create posting service for Reddit submissions
- [x] Add subreddit targeting
- [x] Handle Reddit posting requirements

### Stacker.news
- [x] Research Stacker.news API/authentication
- [x] Implement authentication flow (Lightning/Email/GitHub)
- [x] Create posting service
- [x] Handle platform-specific requirements

### Primal.net
- [x] Research Primal.net API/authentication (Nostr protocol)
- [x] Implement authentication flow (Private key based)
- [x] Create posting service
- [x] Handle Nostr protocol requirements

### Facebook
- [x] Implement Facebook authentication (Puppeteer-based)
- [x] Create posting service for Facebook posts
- [x] Handle Facebook posting requirements
- [ ] Add support for Facebook pages

### Hacker News
- [x] Research Hacker News API/authentication
- [x] Implement authentication flow (Puppeteer-based)
- [x] Create posting service for submissions
- [x] Handle platform-specific requirements

## Phase 4: CLI Commands
- [x] `setup` - Interactive setup for all platforms
- [x] `login [platform]` - Login with Puppeteer (all platforms or specific)
- [x] `status` - Show authentication status for all platforms
- [x] `post <text>` - Post text to all configured platforms
- [x] `post --text "message" --link "http://example.com"` - Post link with text
- [x] `post <message> --platforms=x,linkedin` - Post to specific platforms
- [x] `platforms` - List available platforms and their status
- [x] `config` - Show current configuration

## Phase 5: Advanced Features
- [ ] Batch posting from CSV/JSON files
- [ ] Scheduled posting (cron-like functionality)
- [ ] Template system for different post types
- [ ] Media upload support (images, videos)
- [ ] Post analytics and tracking
- [ ] Webhook support for post status updates
- [x] Multi-platform posting orchestration
- [x] Concurrent posting support
- [x] Retry failed posts functionality

## Phase 6: Testing & Documentation
- [x] Unit tests for all core modules
- [x] Integration tests for authentication flows
- [x] CLI command tests
- [x] Platform-specific tests (with mocking)
- [x] README.md with usage examples
- [x] API documentation
- [x] Example scripts

## Phase 7: Publishing & Distribution
- [ ] Prepare for npm publishing
- [ ] Create GitHub Actions for CI/CD
- [ ] Add semantic versioning
- [ ] Create release documentation

## ✅ COMPLETED FEATURES

### Core Infrastructure
- ✅ **Project Setup**: ESM modules, Node.js 20+, proper directory structure
- ✅ **Configuration Management**: JSON-based config with validation
- ✅ **Session Management**: Secure browser session storage and validation
- ✅ **CLI Interface**: Full command-line interface with yargs

### Authentication System
- ✅ **Puppeteer Integration**: Browser automation for human-like login
- ✅ **Session Persistence**: Automatic session saving and restoration
- ✅ **Multi-platform Support**: Extensible platform architecture

### Platform Support
- ✅ **X (Twitter)**: Full posting support with text and links
- ✅ **LinkedIn**: Full posting support with text and links
- ✅ **Post Validation**: Content validation and error handling

### CLI Commands
- ✅ **sp post**: Post content with various options
- ✅ **sp login**: Browser-based authentication
- ✅ **sp status**: Authentication status checking
- ✅ **sp platforms**: Platform information and features
- ✅ **sp config**: Configuration display
- ✅ **sp setup**: Interactive setup wizard for all platforms and settings

### Advanced Features
- ✅ **Multi-platform Posting**: Concurrent posting to multiple platforms
- ✅ **Error Handling**: Comprehensive error handling and reporting
- ✅ **Retry Logic**: Automatic retry for failed posts
- ✅ **Statistics**: Post success/failure statistics

### Testing & Quality
- ✅ **Test Suite**: Comprehensive Mocha + Chai tests
- ✅ **Code Quality**: ESLint + Prettier configuration
- ✅ **Documentation**: Complete README and examples

## Technical Specifications

### Dependencies
- **CLI**: yargs, inquirer, ansi-colors, cli-progress
- **HTTP**: Built-in fetch (Node.js 20+)
- **Authentication**: Custom OAuth implementation
- **Config**: Built-in fs/path modules
- **Testing**: mocha, chai, sinon
- **Development**: eslint, prettier

### File Structure
```
social-poster/
├── package.json
├── index.js                 # Main module export
├── bin/
│   └── social-poster.js     # CLI entry point
├── src/
│   ├── config-manager.js    # Configuration management
│   ├── auth-service.js      # Base authentication service
│   ├── browser-auth.js      # Browser-based OAuth helper
│   ├── platforms/           # Platform-specific implementations
│   │   ├── x-com.js
│   │   ├── linkedin.js
│   │   ├── reddit.js
│   │   ├── stacker-news.js
│   │   ├── primal.js
│   │   ├── facebook.js
│   │   └── hacker-news.js
│   ├── post-service.js      # Main posting orchestrator
│   └── cli-setup.js         # Interactive setup
├── test/
│   ├── config-manager.test.js
│   ├── auth-service.test.js
│   ├── platforms/
│   └── cli.test.js
└── examples/
    ├── basic-usage.js
    ├── batch-posting.js
    └── scheduled-posting.js
```

### Configuration Structure
```json
{
  "platforms": {
    "x": {
      "enabled": true,
      "lastLogin": "2024-01-01T00:00:00Z"
    },
    "linkedin": {
      "enabled": true,
      "lastLogin": "2024-01-01T00:00:00Z"
    },
    "reddit": {
      "enabled": true,
      "lastLogin": "2024-01-01T00:00:00Z"
    }
  },
  "general": {
    "defaultPlatforms": ["x", "linkedin"],
    "retryAttempts": 3,
    "timeout": 30000,
    "logLevel": "info",
    "headless": true
  }
}
```

### Sessions Structure (sessions.json)
```json
{
  "x": {
    "cookies": [...],
    "localStorage": {...},
    "sessionStorage": {...},
    "lastValidated": "2024-01-01T00:00:00Z",
    "userAgent": "...",
    "viewport": {...}
  },
  "linkedin": {
    "cookies": [...],
    "localStorage": {...},
    "sessionStorage": {...},
    "lastValidated": "2024-01-01T00:00:00Z",
    "userAgent": "...",
    "viewport": {...}
  }
}
```

## Notes
- Follow TDD approach: write tests first, then implement
- Use modern JavaScript features (async/await, optional chaining, etc.)
- Implement proper error handling and user feedback
- Consider rate limiting and API quotas for each platform
- Ensure secure token storage and handling
- Make the tool extensible for future platform additions