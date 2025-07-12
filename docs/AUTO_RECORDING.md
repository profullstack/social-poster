# Auto Recording for Social Media Platforms

This document explains how to use the enhanced auto recording feature for X.com, TikTok, and Pinterest platforms.

## Overview

The auto recording system captures and validates CSS selectors for social media platforms automatically. It provides real-time feedback, confidence scoring, and enhanced categorization of UI elements.

## Features

- **Multi-Platform Support**: X.com, TikTok, and Pinterest
- **Real-Time Validation**: Automatically validates known selectors
- **Confidence Scoring**: Rates selector reliability (0-100%)
- **Enhanced Categorization**: Intelligently categorizes UI elements
- **Auto-Save**: Saves progress every 3 seconds
- **Visual Feedback**: Color-coded element highlighting

## Quick Start

### Record Single Platform

```bash
# Record X.com selectors
pnpm run auto-record x

# Record TikTok selectors
pnpm run auto-record tiktok

# Record Pinterest selectors
pnpm run auto-record pinterest
```

### Record All Platforms

```bash
# Record all platforms simultaneously
pnpm run auto-record all
```

## How It Works

### 1. Initialization

The tool opens browser windows for the specified platform(s) and injects enhanced recording scripts.

### 2. Selector Validation

Known selectors are automatically validated every 5 seconds:
- ✅ **Green**: Working selector (element found and visible)
- ⚠️ **Yellow**: Found but not visible
- ❌ **Red**: Broken selector (element not found)

### 3. Interaction Recording

All user interactions are captured with metadata:
- Click events
- Focus events (input fields)
- Input events (typing)

### 4. Enhanced Categorization

Elements are automatically categorized based on:
- Element attributes (`data-testid`, `data-e2e`, etc.)
- Text content and labels
- Platform-specific patterns
- Element types and roles

### 5. Confidence Scoring

Each selector receives a confidence score based on:
- **100%**: `data-testid` attributes
- **95%**: `data-e2e` attributes  
- **90%**: `data-test-id` attributes
- **80%**: ID attributes
- **70%**: Name attributes
- **60%**: ARIA labels
- **50%**: Role attributes
- **30%**: Class names
- **10%**: Tag names

## Platform-Specific Features

### X.com (Twitter)

**Known Selectors:**
- Login indicators: Account switcher, profile button, timeline
- Compose button: Tweet creation button
- Text input: Tweet textarea
- Submit button: Tweet publish button

**Special Features:**
- Character limit validation (280 chars)
- Link preview detection
- Thread composition support

### TikTok

**Known Selectors:**
- Login indicators: Profile icon, navigation elements
- Upload button: Video upload trigger
- File input: Video file selector
- Text input: Caption/description field
- Submit button: Post publication button

**Special Features:**
- Video upload workflow
- Caption length validation (2200 chars)
- Processing status detection

### Pinterest

**Known Selectors:**
- Login indicators: Profile button, user avatar
- Create button: Pin creation trigger
- File input: Image upload selector
- URL input: Link-based pin creation
- Text input: Description field
- Submit button: Pin publication button

**Special Features:**
- Image and URL-based pin creation
- Board selection workflow
- Description length validation (500 chars)

## Recording Workflow

### Step 1: Start Recording

```bash
pnpm run auto-record <platform>
```

### Step 2: Manual Login

1. Browser window opens automatically
2. Navigate through login process manually
3. Tool validates login status automatically

### Step 3: Perform Workflow

1. Navigate to compose/create pages
2. Interact with UI elements normally
3. Tool records all interactions automatically

### Step 4: Stop Recording

1. Press `Ctrl+C` in terminal
2. Tool saves results automatically
3. Browser closes gracefully

## Output Format

Recording results are saved as JSON files with the following structure:

```json
{
  "platformName": {
    "name": "Platform Display Name",
    "url": "https://platform.com",
    "timestamp": "2025-01-12T12:00:00.000Z",
    "selectors": {
      "category": [
        {
          "selector": "[data-testid='example']",
          "selectorType": "data-testid",
          "confidence": 100,
          "element": { /* element metadata */ },
          "timestamp": "2025-01-12T12:00:00.000Z",
          "interactionType": "click"
        }
      ]
    },
    "interactions": [ /* raw interaction data */ ],
    "bestSelectors": { /* highest confidence selectors */ },
    "selectorStats": { /* statistics and metrics */ },
    "validationResults": { /* real-time validation results */ }
  }
}
```

## Advanced Usage

### Custom Recording Script

```javascript
import { MultiPlatformRecorder } from './scripts/auto-record-platforms.js';

const recorder = new MultiPlatformRecorder({
  headless: false,
  timeout: 30000
});

// Record specific platform
await recorder.startRecording('x');

// Save results
await recorder.saveRecording();
```

### Validation Only

```javascript
import { SelectorValidator } from './src/selector-validator.js';

const validator = new SelectorValidator();

// Validate existing selectors
const results = await validator.validateSelectors('x', {
  composeButton: '[data-testid="SideNav_NewTweet_Button"]',
  textInput: '[data-testid="tweetTextarea_0"]'
});

console.log(results);
```

## Best Practices

### 1. Recording Sessions

- **Start Fresh**: Clear browser data before recording
- **Complete Workflows**: Record entire posting workflows
- **Multiple Attempts**: Record the same action multiple times
- **Edge Cases**: Test error conditions and edge cases

### 2. Selector Quality

- **Prefer Data Attributes**: `data-testid` > `data-e2e` > `data-test-id`
- **Avoid Fragile Selectors**: Don't rely on generated class names
- **Test Stability**: Validate selectors across browser sessions
- **Document Context**: Note when selectors are context-dependent

### 3. Maintenance

- **Regular Updates**: Re-record when platforms update
- **Validation Checks**: Run validation regularly
- **Backup Selectors**: Keep multiple selector options
- **Version Control**: Track selector changes over time

## Troubleshooting

### Common Issues

**Browser Doesn't Open**
```bash
# Check if Puppeteer is installed
pnpm install

# Try with visible browser
node scripts/auto-record-platforms.js x
```

**Selectors Not Recording**
- Ensure you're interacting with elements
- Check console for JavaScript errors
- Verify page has loaded completely

**Validation Failures**
- Platform may have updated UI
- Check for A/B testing variations
- Verify login status

**Recording Stops Unexpectedly**
- Check terminal for error messages
- Ensure sufficient disk space
- Verify network connectivity

### Debug Mode

Enable debug logging:

```javascript
const recorder = new MultiPlatformRecorder({
  headless: false,
  debug: true
});
```

## Integration

### With Existing Platforms

```javascript
import { tikTokPlatform } from './src/platforms/tiktok.js';
import { pinterestPlatform } from './src/platforms/pinterest.js';

// Use recorded selectors
const result = await tikTokPlatform.post({
  text: 'My awesome video!',
  videoPath: './video.mp4'
});
```

### With CI/CD

```yaml
# .github/workflows/selector-validation.yml
name: Validate Selectors
on:
  schedule:
    - cron: '0 0 * * *'  # Daily validation

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: pnpm install
      - run: pnpm run validate-selectors
```

## API Reference

### MultiPlatformRecorder

```javascript
class MultiPlatformRecorder extends SelectorValidator {
  constructor(options)
  async startRecording(platform)
  async saveRecording()
  getBestSelectors(platform)
  getSelectorStats(platform)
}
```

### Platform Classes

```javascript
class TikTokPlatform extends BrowserAutomation {
  async post(content)
  async postVideo(page, content)
  async postText(page, content)
}

class PinterestPlatform extends BrowserAutomation {
  async post(content)
  async postPin(page, content)
}
```

## Contributing

To add support for new platforms:

1. Create platform class extending `BrowserAutomation`
2. Implement required methods (`isLoggedIn`, `post`, etc.)
3. Add platform configuration to recording script
4. Create comprehensive tests
5. Update documentation

See existing platform implementations for reference patterns.