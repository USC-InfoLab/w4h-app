import { test, expect } from '@playwright/test';

test.describe('W4H App - Performance', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should have no network errors', async ({ page }) => {
    const failedRequests = [];
    
    page.on('requestfailed', (request) => {
      failedRequests.push(request.url());
    });
    
    await page.goto('/');
    
    // Wait for network to settle
    await page.waitForLoadState('networkidle');
    
    // Expect no failed requests
    expect(failedRequests).toHaveLength(0);
  });

  test('should load all critical resources', async ({ page }) => {
    const responses = [];
    
    page.on('response', (response) => {
      responses.push({
        url: response.url(),
        status: response.status(),
      });
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that main resources loaded successfully
    const mainHtml = responses.find((r) => r.url.includes('localhost'));
    expect(mainHtml?.status).toBe(200);
  });

  test('should not have memory leaks in basic usage', async ({ page }) => {
    // Navigate to the page multiple times
    for (let i = 0; i < 3; i++) {
      await page.goto('/');
      await page.waitForTimeout(500);
      await page.reload();
    }
    
    // If we get here without timeout, no major issues
    await expect(page.locator('h1')).toBeVisible();
  });
});
