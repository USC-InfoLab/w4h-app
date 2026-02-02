import { test, expect } from '@playwright/test';

test.describe('W4H App - Basic Functionality', () => {
  test('should load the homepage successfully', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the app to be loaded
    await expect(page.locator('#app')).toBeVisible();
  });

  test('should display the main heading', async ({ page }) => {
    await page.goto('/');
    
    // Check if the heading is visible
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText('You did it!');
  });

  test('should have correct page title', async ({ page }) => {
    await page.goto('/');
    
    // Check the page title
    await expect(page).toHaveTitle('Vite App');
  });

  test('should contain Vue.js documentation link', async ({ page }) => {
    await page.goto('/');
    
    // Check for the Vue.js link
    const link = page.getByRole('link', { name: 'vuejs.org' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', 'https://vuejs.org/');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener');
  });

  test('should render without errors', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    
    // Wait a bit to catch any console errors
    await page.waitForTimeout(1000);
    
    // Expect no console errors
    expect(consoleErrors).toHaveLength(0);
  });
});

test.describe('W4H App - Responsive Design', () => {
  test('should be responsive on mobile', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should be responsive on tablet', async ({ page }) => {
    // Set viewport to tablet size
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should be responsive on desktop', async ({ page }) => {
    // Set viewport to desktop size
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    
    await expect(page.locator('h1')).toBeVisible();
  });
});
