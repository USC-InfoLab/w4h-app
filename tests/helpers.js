/**
 * Common test utilities and helpers for Playwright tests
 */

/**
 * Wait for the Vue app to be fully mounted
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function waitForVueApp(page) {
  await page.waitForSelector('#app', { state: 'visible' });
  await page.waitForLoadState('networkidle');
}

/**
 * Check if there are any console errors on the page
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<string[]>} Array of error messages
 */
export async function getConsoleErrors(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  return errors;
}

/**
 * Take a full page screenshot
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} name - Screenshot name
 */
export async function takeFullPageScreenshot(page, name) {
  await page.screenshot({
    path: `screenshots/${name}.png`,
    fullPage: true,
  });
}

/**
 * Common viewport sizes for responsive testing
 */
export const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  mobileLandscape: { width: 667, height: 375 },
  tablet: { width: 768, height: 1024 },
  tabletLandscape: { width: 1024, height: 768 },
  desktop: { width: 1920, height: 1080 },
  desktopSmall: { width: 1366, height: 768 },
};

/**
 * Set viewport to a predefined size
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {keyof VIEWPORTS} viewportName - Name of the viewport
 */
export async function setViewport(page, viewportName) {
  const viewport = VIEWPORTS[viewportName];
  if (!viewport) {
    throw new Error(`Unknown viewport: ${viewportName}`);
  }
  await page.setViewportSize(viewport);
}

/**
 * Wait for network to be idle
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {number} timeout - Timeout in milliseconds
 */
export async function waitForNetworkIdle(page, timeout = 5000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Navigate to a route and wait for it to load
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} path - Path to navigate to
 */
export async function navigateToRoute(page, path) {
  await page.goto(path);
  await waitForVueApp(page);
}

/**
 * Check if an element is in the viewport
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} selector - Element selector
 * @returns {Promise<boolean>}
 */
export async function isInViewport(page, selector) {
  return await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }, selector);
}

/**
 * Get all failed network requests
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<string[]>}
 */
export async function trackFailedRequests(page) {
  const failedRequests = [];
  page.on('requestfailed', (request) => {
    failedRequests.push(request.url());
  });
  return failedRequests;
}

/**
 * Measure page load time
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} url - URL to measure
 * @returns {Promise<number>} Load time in milliseconds
 */
export async function measurePageLoadTime(page, url) {
  const startTime = Date.now();
  await page.goto(url, { waitUntil: 'networkidle' });
  return Date.now() - startTime;
}

/**
 * Test data generators
 */
export const testData = {
  /**
   * Generate a random email
   */
  email: () => `test-${Date.now()}@example.com`,
  
  /**
   * Generate a random username
   */
  username: () => `user-${Date.now()}`,
  
  /**
   * Generate a random string
   */
  randomString: (length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },
};
