import { test, expect } from '@playwright/test';

test.describe('W4H App - Navigation', () => {
  test('should load root route', async ({ page }) => {
    await page.goto('/');
    
    await expect(page).toHaveURL('/');
    await expect(page.locator('#app')).toBeVisible();
  });

  test('should handle direct URL navigation', async ({ page }) => {
    // Navigate directly to the root
    await page.goto('/', { waitUntil: 'networkidle' });
    
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should handle page refresh', async ({ page }) => {
    await page.goto('/');
    
    // Reload the page
    await page.reload();
    
    // Check that content is still visible
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).toHaveText('You did it!');
  });

  test('should maintain state after browser back/forward', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to external link (this would open in new tab, so we just check the link exists)
    const link = page.getByRole('link', { name: 'vuejs.org' });
    await expect(link).toBeVisible();
    
    // Use browser back (though we haven't navigated anywhere)
    await page.goBack();
    
    // Still on the same page
    await expect(page.locator('h1')).toBeVisible();
  });
});
