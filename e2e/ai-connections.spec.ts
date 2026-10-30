import { test, expect } from '@playwright/test';
import { resetData, sql } from './support';
test.beforeEach(async () => { await resetData(); });
test('saves encrypted accounts and switches the active credentials without losing the other account', async ({ page }) => {
  await page.goto('/ai-connections');
  for (const [name, url, key] of [['First account', 'https://first.example/v1', 'first-test-secret'], ['Second account', 'https://second.example/v1', 'second-test-secret']]) {
    await page.getByLabel('Name', { exact: true }).fill(name);
    await page.getByLabel('API base URL').fill(url);
    await page.getByLabel('Model ID').fill('test-model');
    await page.getByLabel('API key', { exact: true }).fill(key);
    await page.getByRole('button', { name: 'Save connection', exact: true }).click();
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  }
  const stored = await sql<{ value: string }>(`SELECT value FROM "Setting" WHERE key = 'aiConnections'`);
  expect(stored[0].value).not.toContain('first-test-secret');
  expect(stored[0].value).not.toContain('second-test-secret');
  for (const name of ['First account', 'Second account', 'First account']) {
    await page.locator('article').filter({ has: page.getByRole('heading', { name, exact: true }) }).getByRole('button', { name: 'Use this connection' }).click();
    await expect(page.locator('p[role=status]')).toContainText(`${name} is active`);
  }
  await expect(page.getByRole('heading', { name: 'Second account', exact: true })).toBeVisible();
});
