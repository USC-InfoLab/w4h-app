# Playwright E2E Testing

This directory contains end-to-end tests for the W4H Vue application using Playwright.

## Test Structure

```
tests/
├── app.spec.js           # Basic app functionality tests
├── accessibility.spec.js # Accessibility compliance tests
├── navigation.spec.js    # Routing and navigation tests
├── performance.spec.js   # Performance and loading tests
├── visual.spec.js        # Visual regression tests
└── example.spec.ts       # Example test (can be deleted)
```

## Running Tests

### Prerequisites

Make sure you have the dependencies installed:

```bash
# Install root dependencies (includes Playwright)
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..

# Install Playwright browsers
npm run playwright:install
```

### Running All Tests

```bash
# Run all tests (headless mode)
npm run test:e2e

# Run with UI mode (recommended for development)
npm run test:e2e:ui

# Run with headed browser (see the browser)
npm run test:e2e:headed

# Run in debug mode
npm run test:e2e:debug
```

### Running Tests for Specific Browsers

```bash
# Run only in Chromium
npm run test:e2e:chromium

# Run only in Firefox
npm run test:e2e:firefox

# Run only in WebKit (Safari)
npm run test:e2e:webkit
```

### Running Specific Test Files

```bash
# Run a specific test file
npx playwright test tests/app.spec.js

# Run tests matching a pattern
npx playwright test tests/accessibility
```

## Test Categories

### 1. Basic Functionality Tests (`app.spec.js`)
- Homepage loading
- Main heading display
- Page title verification
- External links
- Console error detection
- Responsive design on different viewports

### 2. Accessibility Tests (`accessibility.spec.js`)
- HTML structure validation
- Viewport meta tag presence
- Keyboard navigation
- Heading hierarchy

### 3. Navigation Tests (`navigation.spec.js`)
- Route loading
- Direct URL navigation
- Page refresh handling
- Browser back/forward navigation

### 4. Performance Tests (`performance.spec.js`)
- Page load time
- Network request failures
- Critical resource loading
- Memory leak detection

### 5. Visual Regression Tests (`visual.spec.js`)
- Homepage screenshots
- Mobile viewport screenshots
- Tablet viewport screenshots

## Writing New Tests

When writing new tests, follow these guidelines:

1. **Group related tests** using `test.describe()`
2. **Use descriptive test names** that explain what is being tested
3. **Follow the Arrange-Act-Assert pattern**
4. **Use appropriate selectors** (prefer role-based selectors)
5. **Add proper waits** to avoid flaky tests

Example:

```javascript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something specific', async ({ page }) => {
    // Arrange
    await page.goto('/');
    
    // Act
    await page.click('button');
    
    // Assert
    await expect(page.locator('.result')).toHaveText('Expected Text');
  });
});
```

## Visual Testing

Visual regression tests create baseline screenshots on first run. To update baselines:

```bash
# Update all snapshots
npx playwright test --update-snapshots

# Update specific test snapshots
npx playwright test tests/visual.spec.js --update-snapshots
```

## Viewing Test Reports

After running tests, view the HTML report:

```bash
npx playwright show-report
```

## Debugging Tests

### Using UI Mode (Recommended)
```bash
npm run test:e2e:ui
```

### Using Debug Mode
```bash
npm run test:e2e:debug
```

### Using VSCode Extension
Install the [Playwright Test for VSCode](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright) extension for integrated debugging.

## CI/CD Integration

Tests are configured to run in CI environments:
- Headless mode automatically enabled
- Retries: 2 attempts on failure
- Single worker for stability
- Uses production build (`preview` mode)

## Configuration

The main configuration is in `playwright.config.js` at the root level:
- Test directory: `./tests`
- Base URL: `http://localhost:5173` (dev) / `http://localhost:4173` (CI)
- Browsers: Chromium, Firefox, WebKit
- Timeout: 30 seconds per test
- Retries: 2 on CI, 0 locally

## Common Issues

### Tests failing locally but passing in CI
- Check if you're using the right base URL
- Ensure the dev server is running
- Clear browser cache and Playwright state

### Visual regression failures
- Slight pixel differences are normal across environments
- Use `maxDiffPixels` to allow small differences
- Update snapshots if intentional changes were made

### Timeout errors
- Increase timeout in test or config
- Check network conditions
- Ensure selectors are correct

## Best Practices

1. **Keep tests independent** - Each test should work in isolation
2. **Use data-testid attributes** - For stable selectors in complex components
3. **Avoid hard-coded waits** - Use Playwright's auto-waiting features
4. **Mock external services** - When testing features that depend on external APIs
5. **Clean up after tests** - Reset state if needed
6. **Run tests before commits** - Catch issues early

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Selectors Guide](https://playwright.dev/docs/selectors)
- [Test Fixtures](https://playwright.dev/docs/test-fixtures)
