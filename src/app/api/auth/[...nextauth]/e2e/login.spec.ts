import { test, expect } from '@playwright/test';

test('shows an error for invalid credentials', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('Administrator').fill('wronguser');
  await page.getByPlaceholder('Password').fill('wrongpass');
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page.getByText('Invalid username or password.')).toBeVisible();
});

test('logs in with valid credentials and reaches the dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('Administrator').fill(process.env.TEST_ADMIN_USER!);
  await page.getByPlaceholder('Password').fill(process.env.TEST_ADMIN_PASS!);
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page).toHaveURL(/dashboard/);
});