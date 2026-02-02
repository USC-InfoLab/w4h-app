# W4H App

Web application for health data visualization and documentation, built with Vue 3 and Vite.

## Project Overview

The W4H (Water for Health) application is designed to:
- **Visualize data**: Display timeseries data with subject comparisons
- **Manage documentation**: MD editor with Mermaid diagrams for workflows
- **Handle datasets**: PostgreSQL database with metadata management
- **Serve APIs**: Express backend for data access

##  Current Development Status

-  Task 1: GitHub prod and dev setup
-  Task 2: Playwright E2E tests
-  Task 3: Express back-end **← COMPLETED!**

##  Architecture

### Frontend
- **Framework**: Vue 3 with Composition API
- **Build Tool**: Vite
- **State Management**: Pinia
- **Routing**: Vue Router

### Backend
- **Framework**: Express.js (Node.js)
- **Database**: PostgreSQL
- **API**: RESTful with JSON responses
- **Testing**: Jest + Supertest

### Full Stack Features
-  Vue 3 frontend with hot-reload
-  Express REST API backend
-  PostgreSQL database with connection pooling
-  CORS enabled for frontend-backend communication
-  Comprehensive E2E and API testing
-  Security middleware (Helmet, rate limiting)
-  Input validation
-  Error handling
-  CI/CD pipelines

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Quick Start

### Project Setup

```sh
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Development

```sh
# Run development server (from root)
npm run dev

# Or run from frontend directory
cd frontend
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```sh
# Build frontend (from root)
npm run build

# Preview production build
npm run preview
```

## Testing

We have a comprehensive Playwright E2E test suite with **28+ tests** covering:
- Basic functionality
- Accessibility
- Navigation
- Performance
- Visual regression
- Responsive design

### Quick Test Commands

```sh
# Install Playwright browsers (first time only)
npm run playwright:install

# Run all tests with UI (recommended)
npm run test:e2e:ui

# Run tests in headless mode
npm run test:e2e

# Run tests with visible browser
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug

# View test report
npx playwright show-report
```

### Test Documentation

- [Quick Start Guide](./tests/QUICKSTART.md) - Get started in 3 steps
- [Full Testing Guide](./tests/README.md) - Comprehensive documentation
- [Testing Setup Details](./TESTING_SETUP.md) - What was configured

### Browser-Specific Testing

```sh
npm run test:e2e:chromium  # Chrome/Edge
npm run test:e2e:firefox   # Firefox
npm run test:e2e:webkit    # Safari
```

##  Development Scripts

### Full Stack Commands (from root)

```sh
npm run dev                 # Frontend dev server only
npm run dev:backend         # Backend dev server only
npm run dev:fullstack       # Both frontend & backend with auto-reload
npm run build               # Build frontend for production
npm run preview             # Preview production build
npm run install:all         # Install all dependencies
npm run db:init             # Initialize database schema
npm run db:init:sample      # Initialize with sample data
```

### Testing Commands

```sh
# E2E Tests (Playwright)
npm run test:e2e            # Run E2E tests
npm run test:e2e:ui         # Interactive test UI
npm run test:e2e:headed     # Watch tests run in browser
npm run playwright:install  # Install test browsers

# Backend Tests (Jest)
npm run test:backend        # Run API tests

# Browser-Specific E2E Tests
npm run test:e2e:chromium   # Chrome/Edge
npm run test:e2e:firefox    # Firefox
npm run test:e2e:webkit     # Safari
```

## Project Structure

```
w4h-app/
├── frontend/              # Vue 3 application
│   ├── src/
│   │   ├── App.vue       # Main app component
│   │   ├── main.js       # App entry point
│   │   ├── router/       # Vue Router config
│   │   └── stores/       # Pinia state management
│   ├── public/           # Static assets
│   └── package.json      # Frontend dependencies
├── tests/                # Playwright E2E tests
│   ├── app.spec.js       # Basic functionality tests
│   ├── accessibility.spec.js
│   ├── navigation.spec.js
│   ├── performance.spec.js
│   ├── visual.spec.js
│   ├── helpers.js        # Test utilities
│   └── README.md         # Testing documentation
├── .github/workflows/    # CI/CD workflows
├── docs/                 # Documentation
├── playwright.config.js  # Playwright configuration
└── package.json          # Root dependencies
```

## Configuration

See [Vite Configuration Reference](https://vite.dev/config/) for build configuration.

##  Additional Resources

### Documentation
- [Quick Start Guide](./tests/QUICKSTART.md) - Get E2E testing running in 3 steps
- [Full Testing Guide](./tests/README.md) - Comprehensive E2E testing documentation
- [Backend Setup Guide](./BACKEND_SETUP.md) - **backend guide** 
- [Backend Complete Summary](./BACKEND_COMPLETE.md) - Quick backend reference
- [Testing Setup Details](./TESTING_SETUP.md) - What was configured for testing

### External Resources
- [Vue 3 Documentation](https://vuejs.org/)
- [Vite Documentation](https://vite.dev/)
- [Express.js Documentation](https://expressjs.com/)
- [PostgreSQL Tutorial](https://www.postgresqltutorial.com/)
- [Playwright Documentation](https://playwright.dev/)
- [Pinia Documentation](https://pinia.vuejs.org/)
- [Vue Router Documentation](https://router.vuejs.org/)

## Contributing

When contributing, please:
1. Write tests for new features
2. Ensure all tests pass: `npm run test:e2e`
3. Follow the existing code style
4. Update documentation as needed

## License

ISC

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Run End-to-End Tests with [Playwright](https://playwright.dev)

```sh
# Install browsers for the first run
npx playwright install

# When testing on CI, must build the project first
npm run build

# Runs the end-to-end tests
npm run test:e2e
# Runs the tests only on Chromium
npm run test:e2e -- --project=chromium
# Runs the tests of a specific file
npm run test:e2e -- tests/example.spec.ts
# Runs the tests in debug mode
npm run test:e2e -- --debug
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
