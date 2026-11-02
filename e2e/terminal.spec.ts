import { expect, test } from '@playwright/test';

test.describe('pucc-terminal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#embedded-terminal pucc-terminal .xterm')).toBeVisible();
  });

  const terminal = (page: import('@playwright/test').Page) =>
    page.locator('#embedded-terminal pucc-terminal');
  const rows = (page: import('@playwright/test').Page) => terminal(page).locator('.xterm-rows');

  async function run(page: import('@playwright/test').Page, line: string) {
    await terminal(page).locator('.xterm').click();
    await page.keyboard.type(line);
    await page.keyboard.press('Enter');
  }

  test('registers the custom element and renders the banner', async ({ page }) => {
    expect(await page.evaluate(() => !!customElements.get('pucc-terminal'))).toBe(true);
    await expect(rows(page)).toContainText('Pucc Terminal');
  });

  test('accepts input and runs echo', async ({ page }) => {
    await run(page, 'echo hello world');
    await expect(rows(page)).toContainText('hello world');
  });

  test('runs help', async ({ page }) => {
    await run(page, 'help');
    await expect(rows(page)).toContainText('Available Commands');
    await expect(rows(page)).toContainText('Total: 3 command(s)');
  });

  test('reports unknown commands', async ({ page }) => {
    await run(page, 'nonesuch');
    await expect(rows(page)).toContainText('not found');
  });

  test('recalls history with the arrow keys', async ({ page }) => {
    await run(page, 'echo first');
    await run(page, 'echo second');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');
    // typed command + output, then the recalled command + output
    await expect
      .poll(async () => ((await rows(page).innerText()).match(/first/g) ?? []).length)
      .toBe(4);
  });
});
