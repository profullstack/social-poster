# Social Poster

A powerful CLI tool for posting to multiple social media platforms with Puppeteer-based authentication. No restrictive APIs - just browser automation that works like a human.

## Features

- 🚀 **Multi-platform posting**: Support for X (Twitter), TikTok, Pinterest, LinkedIn, Reddit, Facebook, and more
- 🎬 **Auto recording**: Intelligent selector recording with real-time validation and confidence scoring
- 🤖 **AI-powered content generation**: Generate viral social media posts using OpenAI
- 🔐 **Browser-based authentication**: Uses Puppeteer to login like a human - no API restrictions
- 💾 **Session management**: Saves login sessions to avoid repeated authentication
- 📝 **Rich content support**: Text posts, link sharing, image uploads, and video uploads
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

1. **Setup AI features** (optional):
```bash
# Configure OpenAI API key for AI-powered content generation
sp setup
```

2. **Login to platforms**:
```bash
# Login to all platforms
sp login

# Login to specific platform
sp login x
sp login tiktok
sp login pinterest
sp login linkedin
```

3. **Post content**:
```bash
# Post text to all platforms
sp post "Hello world! 🚀"

# Generate viral content with AI
sp post --prompt "Write about the future of web development" --link "https://example.com"

# Post with link
sp post --text "Check out this amazing tool!" --link "https://github.com/profullstack/social-poster"

# Post to specific platforms
sp post "Hello X and LinkedIn!" --platforms x,linkedin
```

4. **Check status**:
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
- `--prompt`: AI prompt to generate viral social media content
- `--style`: Content style for AI generation (viral, professional, casual)
- `--platforms, -p`: Comma-separated list of platforms
- `--dry-run`: Preview post without actually posting

**AI-Powered Examples:**
```bash
# Generate viral content with AI
sp post --prompt "This post is about Example.com, please write a more elegant viral type post for all socials" --link "https://example.com"

# Generate professional content for LinkedIn
sp post --prompt "Share insights about remote work productivity" --style professional --platforms linkedin

# Generate casual content for Twitter
sp post --prompt "Funny observation about developers and coffee" --style casual --platforms x
```

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

### `sp setup`

Configure OpenAI API key and other settings for AI-powered content generation.

```bash
sp setup
```

This interactive command will:
- Prompt for your OpenAI API key
- Test the API key connection
- Configure AI model preferences
- Set creativity level (temperature)

### `sp config`

Show current configuration including AI settings.

```bash
sp config
```

## Auto Recording

Social Poster includes an advanced auto recording system that captures and validates CSS selectors for social media platforms automatically.

### Quick Start

```bash
# Record selectors for a single platform
pnpm run auto-record x
pnpm run auto-record tiktok
pnpm run auto-record pinterest

# Record selectors for all platforms
pnpm run auto-record all
```

### Features

- **Real-time validation**: Automatically validates known selectors every 5 seconds
- **Confidence scoring**: Rates selector reliability from 0-100%
- **Enhanced categorization**: Intelligently categorizes UI elements
- **Visual feedback**: Color-coded element highlighting (green=working, red=broken)
- **Auto-save**: Saves progress every 3 seconds

### How It Works

1. **Open browser**: Tool opens browser windows for specified platforms
2. **Manual workflow**: Perform normal login and posting workflows
3. **Auto capture**: Tool records all interactions and validates selectors
4. **Save results**: Press Ctrl+C to stop and save results to JSON file

For detailed documentation, see [Auto Recording Guide](docs/AUTO_RECORDING.md).

## Supported Platforms

| Platform | Status | Features |
|----------|--------|----------|
| **X (Twitter)** | ✅ Ready | Text posts, link sharing, auto recording |
| **TikTok** | ✅ Ready | Video uploads, captions, auto recording |
| **Pinterest** | ✅ Ready | Image pins, URL pins, descriptions, auto recording |
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
  },
  "ai": {
    "openaiApiKey": "sk-...",
    "model": "gpt-4o-mini",
    "maxTokens": 500,
    "temperature": 0.7,
    "enabled": true
  }
}
```

### AI Configuration

To use AI-powered content generation, you need an OpenAI API key:

1. **Get an API key**: Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. **Run setup**: `sp setup`
3. **Configure settings**:
   - **Model**: Choose between `gpt-4o-mini` (fast, cost-effective), `gpt-4o` (more capable), or `gpt-3.5-turbo` (legacy)
   - **Temperature**: Control creativity (0.3 = conservative, 0.7 = balanced, 1.0 = creative)
   - **Max tokens**: Limit response length (default: 500)

**Content Styles:**
- `viral`: Attention-grabbing, shareable content with emojis and trending language
- `professional`: Business-appropriate, authoritative content for LinkedIn
- `casual`: Conversational, relatable content for Twitter/X and casual platforms

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
│   ├── ai-service.js        # AI-powered content generation
│   ├── post-service.js      # Multi-platform posting orchestration
│   ├── selector-validator.js # Selector validation and recording
│   └── platforms/           # Platform implementations
│       ├── x-com.js         # X (Twitter) platform
│       ├── tiktok.js        # TikTok platform
│       ├── pinterest.js     # Pinterest platform
│       ├── linkedin.js      # LinkedIn platform
│       ├── reddit.js        # Reddit platform
│       └── ...
├── scripts/                 # Utility scripts
│   ├── auto-record-platforms.js # Enhanced auto recording
│   ├── record-selectors.js  # Basic selector recording
│   └── validate-selectors.js # Selector validation
├── test/                    # Test files
│   ├── platforms/           # Platform-specific tests
│   └── ...
├── examples/                # Usage examples
│   ├── basic-usage.js
│   ├── ai-content-generation.js
│   ├── batch-posting.js
│   └── multi-platform-posting.js
├── docs/                    # Documentation
│   └── AUTO_RECORDING.md    # Auto recording guide
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