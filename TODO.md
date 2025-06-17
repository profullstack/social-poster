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
- [ ] Create main entry points (index.js, bin/social-poster.js)
- [x] Set up ESLint and Prettier configuration
- [x] Create config manager for storing authentication tokens
- [ ] Set up basic CLI structure with yargs

## Phase 2: Authentication Framework (Puppeteer-based)
- [ ] Create Puppeteer-based browser automation service
- [ ] Implement session management (cookies, localStorage, etc.)
- [ ] Create sessions.json storage system
- [ ] Add login command with platform selection
- [ ] Add session validation and refresh logic
- [ ] Create authentication status checker

## Phase 3: Platform Implementations
### X.com (Twitter)
- [ ] Implement X.com authentication (OAuth 2.0)
- [ ] Create posting service for tweets
- [ ] Add support for media uploads
- [ ] Handle rate limiting

### LinkedIn
- [ ] Implement LinkedIn authentication (OAuth 2.0)
- [ ] Create posting service for LinkedIn posts
- [ ] Add support for article publishing
- [ ] Handle LinkedIn API rate limits

### Reddit
- [ ] Implement Reddit authentication (OAuth 2.0)
- [ ] Create posting service for Reddit submissions
- [ ] Add subreddit targeting
- [ ] Handle Reddit API rate limits

### Stacker.news
- [ ] Research Stacker.news API/authentication
- [ ] Implement authentication flow
- [ ] Create posting service
- [ ] Handle platform-specific requirements

### Primal.net
- [ ] Research Primal.net API/authentication
- [ ] Implement authentication flow
- [ ] Create posting service
- [ ] Handle Nostr protocol requirements

### Facebook
- [ ] Implement Facebook authentication (OAuth 2.0)
- [ ] Create posting service for Facebook posts
- [ ] Add support for Facebook pages
- [ ] Handle Facebook API rate limits

### Hacker News
- [ ] Research Hacker News API/authentication
- [ ] Implement authentication flow
- [ ] Create posting service for submissions
- [ ] Handle platform-specific requirements

## Phase 4: CLI Commands
- [ ] `setup` - Interactive setup for all platforms
- [ ] `login [platform]` - Login with Puppeteer (all platforms or specific)
- [ ] `status` - Show authentication status for all platforms
- [ ] `post <text>` - Post text to all configured platforms
- [ ] `post --text "message" --link "http://example.com"` - Post link with text
- [ ] `post <message> --platforms=x,linkedin` - Post to specific platforms
- [ ] `platforms` - List available platforms and their status
- [ ] `config` - Show current configuration

## Phase 5: Advanced Features
- [ ] Batch posting from CSV/JSON files
- [ ] Scheduled posting (cron-like functionality)
- [ ] Template system for different post types
- [ ] Media upload support (images, videos)
- [ ] Post analytics and tracking
- [ ] Webhook support for post status updates

## Phase 6: Testing & Documentation
- [ ] Unit tests for all core modules
- [ ] Integration tests for authentication flows
- [ ] CLI command tests
- [ ] Platform-specific tests (with mocking)
- [ ] README.md with usage examples
- [ ] API documentation
- [ ] Example scripts

## Phase 7: Publishing & Distribution
- [ ] Prepare for npm publishing
- [ ] Create GitHub Actions for CI/CD
- [ ] Add semantic versioning
- [ ] Create release documentation

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