# Playwright Testing - Quick Start Guide

##  Get Started in 3 Steps

### Step 1: Install Playwright Browsers (First Time Only)

```powershell
cd c:\Users\limba\OneDrive\Documents\w4h\w4h-app
npm run playwright:install
```

This downloads Chromium, Firefox, and WebKit browsers for testing.

### Step 2: Run the Tests

**Option A: UI Mode (Recommended for Development)**
```powershell
npm run test:e2e:ui
```
This opens an interactive UI where you can:
- Run tests individually or all at once
- See tests in real-time
- Debug easily
- View traces

**Option B: Headless Mode (For Quick Checks)**
```powershell
npm run test:e2e
```

**Option C: Headed Mode (See the Browser)**
```powershell
npm run test:e2e:headed
```

### Step 3: View Results

After running tests in headless mode, view the detailed report:
```powershell
npx playwright show-report
```

##  What Tests Are Running?

You have **28+ tests** covering:
-  Basic app functionality
-  Accessibility
-  Navigation
-  Performance
-  Visual regression
-  Responsive design

##  Common Commands

```powershell
# Run only one test file
npx playwright test tests/app.spec.js

# Run tests in a specific browser
npm run test:e2e:chromium  # or firefox, webkit

# Debug a specific test
npx playwright test tests/app.spec.js --debug

# Update visual regression snapshots
npx playwright test tests/visual.spec.js --update-snapshots
```

##  Debugging

**Best way to debug:**
```powershell
npm run test:e2e:ui
```
Then click on a test to see it run step-by-step.

**Alternative:**
```powershell
npm run test:e2e:debug
```

##  Expected Results

All tests should pass. If any fail:
1. Make sure the frontend dependencies are installed: `cd frontend && npm install`
2. Check if port 5173 is available
3. See the [full README](./README.md) for troubleshooting

##  Next Steps

- Read [tests/README.md](./README.md) for comprehensive documentation
- Read [TESTING_SETUP.md](../TESTING_SETUP.md) for setup details
- Add your own tests following the examples in `tests/`

##  Pro Tips

1. **Use UI mode during development** - It's much easier to see what's happening
2. **Run specific tests** while working on a feature - Faster feedback
3. **Update snapshots** when you intentionally change the UI
4. **Check the HTML report** for detailed failure information

---

Happy Testing! 🎉
