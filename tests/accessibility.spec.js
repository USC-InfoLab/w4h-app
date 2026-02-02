import { test, expect } from '@playwright/test';

test.describe('W4H App - Accessibility', () => {
  test('should have proper HTML structure', async ({ page }) => {
    await page.goto('/');
    
    // Check for proper HTML lang attribute
    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang');
  });

  test('should have a viewport meta tag', async ({ page }) => {
    await page.goto('/');
    
    // Check for viewport meta tag
    const viewportMeta = page.locator('meta[name="viewport"]');
    await expect(viewportMeta).toHaveCount(1);
  });

  test('links should be keyboard accessible', async ({ page }) => {
    await page.goto('/');
    
    // Focus on the link using tab
    await page.keyboard.press('Tab');
    
    const link = page.getByRole('link', { name: 'vuejs.org' });
    await expect(link).toBeFocused();
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    
    // Check that h1 exists
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
  });
});
