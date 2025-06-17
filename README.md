# Social Poster

A powerful CLI tool for posting to multiple social media platforms with Puppeteer-based authentication. No restrictive APIs - just browser automation that works like a human.

## Features

- 🚀 **Multi-platform posting**: Support for X (Twitter), LinkedIn, Reddit, Facebook, and more
- 🔐 **Browser-based authentication**: Uses Puppeteer to login like a human - no API restrictions
- 💾 **Session management**: Saves login sessions to avoid repeated authentication
- 📝 **Text and link posts**: Support for both text-only and link sharing posts
- 🎯 **Platform targeting**: Post to specific platforms or all at once
- 🧪 **Dry run mode**: Preview posts without actually posting
- 📊 **Status monitoring**: Check authentication status across all platforms

## Installation

```bash
# Install globally with pnpm (recommended)
pnpm install -g @profullstack/social-poster

# Or with npm
npm install -g @profullstack/social-poster
```

## Quick Start

1. **Login to platforms**:
```bash
# Login to all platforms
sp login

# Login to specific platform
sp login x
sp login linkedin
```

2. **Post content**:
```bash
# Post text to all platforms
sp post "Hello world! 🚀"

# Post with link
sp post --text "Check out this amazing tool!" --link "https://github.com/profullstack/social-poster"

# Post to specific platforms
sp post "Hello X and LinkedIn!" --platforms x,linkedin
```

3. **Check status**:
```bash
# View authentication status
sp status

# List available platforms
sp platforms
```

## CLI Commands

### `sp post [text]`

Post content to social media platforms.

```bash
# Text post
sp post "Your message here"

# Link post with text
sp post --text "Check this out!" --link "https://example.com"

# Link only
sp post --link "https://example.com"

# Target specific platforms
sp post "Hello!" --platforms x,linkedin,reddit

# Dry run (preview without posting)
sp post "Test" --dry-run
```

**Options:**
- `--text, -t`: Text content to post
- `--link, -l`: Link to share
- `--platforms, -p`: Comma-separated list of platforms
- `--dry-run`: Preview post without actually posting

### `sp login [platform]`

Login to social media platforms using browser automation.

```bash
# Login to all platforms
sp login

# Login to specific platform
sp login x
sp login linkedin
sp login reddit
```

**Options:**
- `--headless`: Run browser in headless mode (default: true)

### `sp status`

Show authentication status for all platforms.

```bash
sp status
```

### `sp platforms`

List available platforms and their features.

```bash
# Basic list
sp platforms

# Detailed information
sp platforms --details
```

### `sp config`

Show current configuration.

```bash
sp config
```

## Supported Platforms

| Platform | Status | Features |
|----------|--------|----------|
| **X (Twitter)** | ✅ Ready | Text posts, link sharing, media uploads |
| **LinkedIn** | 🚧 In Progress | Text posts, link sharing, article publishing |
| **Reddit** | 🚧 In Progress | Text posts, link posts, subreddit targeting |
| **Facebook** | 🚧 In Progress | Text posts, link sharing, page posting |
| **Stacker News** | 📋 Planned | Link posts, Bitcoin rewards |
| **Primal (Nostr)** | 📋 Planned | Decentralized posting |
| **Hacker News** | 📋 Planned | Link submissions, discussions |

## Configuration

Configuration is stored in `~/.config/social-poster/config.json`:

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

## Session Management

Login sessions are securely stored in `~/.config/social-poster/sessions.json`. This includes:

- Browser cookies
- Local storage data
- Session storage data
- User agent and viewport settings

Sessions are automatically validated and refreshed as needed.

## Programmatic Usage

You can also use Social Poster as a Node.js module:

```javascript
import { SocialPoster, quickPost } from '@profullstack/social-poster';

// Quick posting
const result = await quickPost({
  text: "Hello from Node.js!",
  type: "text"
}, {
  platforms: ['x', 'linkedin']
});

// Advanced usage
const poster = new SocialPoster({
  headless: true,
  timeout: 30000
});

// Login
await poster.login('x');

// Post content
const postResult = await poster.post({
  text: "Check out this link!",
  link: "https://example.com",
  type: "link"
});

// Clean up
await poster.close();
```

## Development

### Prerequisites

- Node.js 20+
- pnpm (recommended)

### Setup

```bash
# Clone the repository
git clone https://github.com/profullstack/social-poster.git
cd social-poster

# Install dependencies
pnpm install

# Run tests
pnpm test

# Run linting
pnpm lint

# Format code
pnpm format
```

### Project Structure

```
social-poster/
├── bin/
│   └── social-poster.js     # CLI entry point
├── src/
│   ├── config-manager.js    # Configuration management
│   ├── browser-automation.js # Puppeteer automation
│   └── platforms/           # Platform implementations
│       ├── x-com.js
│       ├── linkedin.js
│       └── ...
├── test/                    # Test files
├── examples/                # Usage examples
└── index.js                 # Main module export
```

### Testing

```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test:config
pnpm test:auth
pnpm test:platforms
pnpm test:cli

# Run tests with coverage
pnpm test:coverage
```

### Adding New Platforms

1. Create platform implementation in `src/platforms/`
2. Extend `BrowserAutomation` class
3. Implement required methods: `isLoggedIn()`, `login()`, `post()`
4. Add tests in `test/platforms/`
5. Update configuration and CLI

## Troubleshooting

### Common Issues

**Login fails or times out:**
- Ensure you're not running in headless mode during initial setup: `sp login x --headless=false`
- Check for 2FA requirements
- Verify platform isn't blocking automated browsers

**Posts fail to publish:**
- Check authentication status: `sp status`
- Verify content length limits
- Ensure platform-specific requirements are met

**Browser crashes or hangs:**
- Increase timeout: `--timeout 60000`
- Run with verbose logging: `--verbose`
- Check available system memory

### Debug Mode

Run with verbose logging to see detailed information:

```bash
sp post "test" --verbose
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-platform`
3. Make your changes and add tests
4. Run tests: `pnpm test`
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Security

- Sessions are stored locally and encrypted
- No credentials are transmitted to external servers
- Browser automation mimics human behavior
- Rate limiting prevents platform abuse

## Support

- 📖 [Documentation](https://github.com/profullstack/social-poster/wiki)
- 🐛 [Issue Tracker](https://github.com/profullstack/social-poster/issues)
- 💬 [Discussions](https://github.com/profullstack/social-poster/discussions)

---

Made with ❤️ by [Profullstack](https://profullstack.com)