import { test, expect } from '@playwright/test';

/**
 * This is an example test file that demonstrates basic Playwright usage.
 * You can delete this file once you're familiar with the testing setup.
 */

test.describe('Example Tests', () => {
  test('example: visiting external site', async ({ page }) => {
    await page.goto('https://playwright.dev/');

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/Playwright/);
  });

  test('example: interacting with elements', async ({ page }) => {
    await page.goto('https://playwright.dev/');

    // Click the get started link.
    await page.getByRole('link', { name: 'Get started' }).click();

    // Expects page to have a heading with the name of Installation.
    await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
  });
});

