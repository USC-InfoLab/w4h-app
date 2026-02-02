# Playwright Testing Setup - Complete

## What Has Been Set Up

### 1. **Test Files Created**
All tests are located in the `tests/` directory:

-  `app.spec.js` - Basic functionality tests (homepage, headings, links, responsive design)
-  `accessibility.spec.js` - Accessibility compliance tests
-  `navigation.spec.js` - Routing and navigation tests
-  `performance.spec.js` - Performance and loading tests
-  `visual.spec.js` - Visual regression tests with screenshots
-  `helpers.js` - Common test utilities and helper functions
-  `future-features.spec.js` - Template tests for upcoming features (currently skipped)
-  `README.md` - Comprehensive testing documentation

### 2. **Configuration Updated**

#### Root `package.json`
Added npm scripts for easy test execution:
```json
{
  "scripts": {
    "dev": "cd frontend && npm run dev",
    "build": "cd frontend && npm run build",
    "preview": "cd frontend && npm run preview",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:chromium": "playwright test --project=chromium",
    "test:e2e:firefox": "playwright test --project=firefox",
    "test:e2e:webkit": "playwright test --project=webkit",
    "playwright:install": "playwright install --with-deps"
  }
}
```

#### `playwright.config.js`
-  Updated test directory from `./e2e` to `./tests`
-  Configured to run frontend dev server automatically
-  Set correct base URLs for dev and CI environments
-  Configured for Chromium, Firefox, and WebKit browsers
-  Added CI-specific optimizations (retries, headless mode, single worker)

### 3. **CI/CD Integration**

#### `.github/workflows/playwright.yml`
Updated GitHub Actions workflow to:
-  Run tests on `main` and `dev` branches
-  Install both root and frontend dependencies
-  Build frontend before testing
-  Upload test reports and results as artifacts
-  Run tests in CI mode with proper environment variables

### 4. **Test Coverage**

The test suite covers:

**Basic Functionality (13 tests)**
- Homepage loading
- Main heading display
- Page title verification
- External link validation
- Console error detection
- Responsive design (mobile, tablet, desktop)

**Accessibility (4 tests)**
- HTML structure
- Viewport meta tag
- Keyboard navigation
- Heading hierarchy

**Navigation (4 tests)**
- Route loading
- Direct URL navigation
- Page refresh
- Browser history

**Performance (4 tests)**
- Page load time
- Network errors
- Resource loading
- Memory leak detection

**Visual Regression (3 tests)**
- Homepage screenshots (desktop, mobile, tablet)

## How to Use

### First Time Setup

1. **Install Playwright browsers** (if not already done):
   ```powershell
   npm run playwright:install
   ```

### Running Tests

```powershell
# Run all tests (headless)
npm run test:e2e

# Run with UI mode (recommended for development)
npm run test:e2e:ui

# Run with visible browser
npm run test:e2e:headed

# Run in debug mode
npm run test:e2e:debug

# Run specific browser
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit

# Run specific test file
npx playwright test tests/app.spec.js

# Run tests matching a pattern
npx playwright test tests/accessibility
```

### Viewing Results

After running tests, view the HTML report:
```powershell
npx playwright show-report
```

## Test Organization

```
tests/
├── README.md                    # Detailed testing documentation
├── helpers.js                   # Shared utilities and helpers
├── app.spec.js                  # Core app functionality
├── accessibility.spec.js        # A11y compliance
├── navigation.spec.js           # Routing tests
├── performance.spec.js          # Performance metrics
├── visual.spec.js               # Visual regression
├── future-features.spec.js      # Template for future tests
└── example.spec.ts              # Playwright examples (can delete)
```

## Next Steps for Future Development

### When Adding New Components

1. Create component-specific test files (e.g., `tests/timeseries-chart.spec.js`)
2. Use the helper utilities in `tests/helpers.js`
3. Follow the patterns in `tests/future-features.spec.js`
4. Add data-testid attributes to components for stable selectors

### When Adding Backend (Express)

1. Create API test files (e.g., `tests/api/`)
2. Test API endpoints separately
3. Mock API responses for frontend tests when needed
4. Add database seed data for consistent testing

### When Adding Documentation System

1. Test markdown rendering
2. Test Mermaid diagram generation
3. Test documentation search
4. Test editor functionality

## Tips for Writing New Tests

1. **Use descriptive test names**: `test('should display error message when form is invalid', ...)`
2. **Group related tests**: Use `test.describe()` for logical grouping
3. **Use helper functions**: Leverage `tests/helpers.js` for common operations
4. **Add data-testid attributes**: For stable element selection
5. **Avoid hard-coded waits**: Use Playwright's auto-waiting features
6. **Keep tests independent**: Each test should work in isolation

## Visual Testing

### Creating Baseline Screenshots
On first run, visual tests create baseline screenshots. To update them:
```powershell
npx playwright test tests/visual.spec.js --update-snapshots
```

### Handling Visual Differences
Small pixel differences are normal. The tests allow up to 100 pixels difference (`maxDiffPixels: 100`).

## CI/CD

Tests automatically run on:
- Push to `main` or `dev` branches
- Pull requests targeting `main` or `dev`

### CI Configuration
- Headless mode:  Enabled
- Retries: 2 attempts
- Workers: Single worker for stability
- Build: Uses production build (preview mode)
- Reports: Uploaded as artifacts (30-day retention)

## Troubleshooting

### "Browser not found" error
```powershell
npm run playwright:install
```

### Tests timeout
- Check if dev server is running
- Increase timeout in config or specific test
- Check network conditions

### Visual regression failures
- Review the diff images in the HTML report
- Update snapshots if changes are intentional
- Check for font rendering differences across environments

## Resources

- [Full Testing Documentation](./tests/README.md)
- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)

---

## Summary

 **Task 2: Add Playwright Tests** - **COMPLETED**

You now have:
- Comprehensive test suite with 28+ tests
- Automated CI/CD integration
- Test utilities and helpers
- Visual regression testing
- Performance monitoring
- Accessibility testing
- Future-ready test templates
- Complete documentation

The testing infrastructure is ready to scale with your application as you add the Express backend (Task 3) and additional features!
