import { test, expect } from '@playwright/test';

test.describe('Auth Pages', () => {
  test('login page renders with email and password fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('login page has sign in button', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('register page renders with display name field', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('input').first()).toBeVisible();
  });
});
