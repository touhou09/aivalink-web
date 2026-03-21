import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('unauthenticated user is redirected to login from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated user is redirected to login from settings', async ({ page }) => {
    await page.goto('/settings/llm');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page has link to register', async ({ page }) => {
    await page.goto('/login');
    const registerLink = page.locator('a[href="/register"]');
    await expect(registerLink).toBeVisible();
  });
});
