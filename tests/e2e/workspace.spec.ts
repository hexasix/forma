import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Good work, in motion.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New task', exact: false })).toBeEnabled();
});
test('renders four columns, demo status, and no browser exceptions', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const status of ['todo', 'in_progress', 'in_review', 'done'])
    await expect(page.getByTestId(`column-${status}`)).toBeVisible();
  await expect(page.getByText('Local demo', { exact: true })).toBeVisible();
  await expect(page.locator('.task-card')).toHaveCount(8);
  await page.screenshot({
    path: 'test-results/desktop-board.png',
    fullPage: true,
    animations: 'disabled',
  });
  expect(errors).toEqual([]);
});
test('creates, persists, edits, comments, records activity, and deletes a task', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'New task', exact: false }).click();
  await page.getByLabel('Task title').fill('Ship a thoughtful experience');
  await page
    .getByLabel('Description', { exact: false })
    .fill('Everything should feel intentional.');
  await page.getByLabel('Task priority').selectOption('high');
  await page.getByRole('button', { name: 'Alex Morgan', exact: false }).last().click();
  await page.getByRole('button', { name: 'Create task', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: /^Ship a thoughtful experience/ }).click();
  await page.getByLabel('Task status').selectOption('in_review');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(
    page.getByTestId('column-in_review').getByText('Ship a thoughtful experience'),
  ).toBeVisible();
  await page.getByRole('button', { name: /^Ship a thoughtful experience/ }).click();
  await page.getByLabel('Write a comment').fill('Ready for a fresh pair of eyes.');
  await page.getByRole('button', { name: 'Post comment' }).click();
  await expect(page.getByText('Ready for a fresh pair of eyes.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Activity', exact: false }).click();
  await expect(page.getByText('Moved from To do → In review', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Delete task', exact: true }).click();
  await page.getByRole('button', { name: 'Delete permanently' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Ship a thoughtful experience', { exact: true })).toHaveCount(0);
});
test('moves a task with pointer drag and keyboard drag', async ({ page }) => {
  const handle = page.getByRole('button', {
    name: 'Drag Explore a new visual direction',
    exact: true,
  });
  const from = (await handle.boundingBox())!;
  const target = (await page.getByTestId('column-in_progress').boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + 15, from.y + 15, { steps: 4 });
  await page.mouse.move(target.x + target.width / 2, target.y + 100, { steps: 20 });
  await page.mouse.up();
  await expect(
    page.getByTestId('column-in_progress').getByText('Explore a new visual direction'),
  ).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Moved to In progress' })).toBeVisible();
  await expect(page.locator('.drag-overlay')).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Drag Explore a new visual direction', exact: true })
    .focus();
  await page.keyboard.press('Space', { delay: 60 });
  await expect(page.locator('.drag-overlay')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('status').filter({ hasText: 'Over In review.' })).toBeVisible();
  await page.keyboard.press('Space', { delay: 60 });
  await expect(
    page.getByTestId('column-in_review').getByText('Explore a new visual direction'),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByTestId('column-in_review').getByText('Explore a new visual direction'),
  ).toBeVisible();
});
test('supports search, filters, list view, members and labels', async ({ page }) => {
  await page.getByLabel('Search tasks').fill('onboarding');
  await expect(page.locator('.task-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(page.locator('.task-card')).toHaveCount(8);
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await page
    .getByRole('region', { name: 'Task filters' })
    .getByLabel('Priority')
    .selectOption('high');
  await expect(page.locator('.task-card')).toHaveCount(2);
  await page.getByRole('button', { name: 'Clear all' }).click();
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await expect(page.locator('.task-table tbody tr')).toHaveCount(8);
  await page.getByRole('button', { name: 'Manage team members', exact: true }).click();
  await page.getByLabel('Member name').fill('Taylor Park');
  await page.getByRole('button', { name: 'Add member', exact: true }).click();
  await expect(page.getByRole('dialog').getByText('Taylor Park', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Manage labels', exact: true }).click();
  await page.getByLabel('Label name').fill('Quality');
  await page.getByRole('button', { name: 'Add label', exact: true }).click();
  await expect(page.getByRole('dialog').getByText('Quality', { exact: true })).toBeVisible();
});
test('protects unsaved edits and supports keyboard shortcuts', async ({ page }) => {
  await page.keyboard.press('n');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Task title').fill('An unfinished thought');
  await page.keyboard.press('Escape');
  await expect(page.getByText('Leave your changes behind?')).toBeVisible();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page.getByLabel('Task title')).toHaveValue('An unfinished thought');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Discard changes' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.keyboard.press('Control+k');
  await expect(page.getByLabel('Search tasks')).toBeFocused();
});
test('works on a narrow phone without horizontal page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({
    path: 'test-results/mobile-board.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'High priority', exact: false }).click();
  await expect(page.getByRole('heading', { name: 'A little extra focus.' })).toBeVisible();
  await expect(page.locator('.task-table tbody tr')).toHaveCount(2);
  await page.getByRole('button', { name: 'New task', exact: false }).click();
  await expect(page.getByLabel('Task title')).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('handles a fresh empty workspace and damaged local storage', async ({ page }) => {
  await page.evaluate(() =>
    localStorage.setItem(
      'forma.workspace.v1',
      JSON.stringify({ tasks: [], members: [], labels: [], comments: [], activities: [] }),
    ),
  );
  await page.reload();
  await expect(page.getByText('A fresh start. What will you make?')).toBeVisible();
  await expect(page.locator('.column-empty')).toHaveCount(4);
  await page.evaluate(() => localStorage.setItem('forma.workspace.v1', 'invalid json'));
  await page.reload();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Local demo data is damaged' }),
  ).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('forma.workspace.v1'))).toBe(
    'invalid json',
  );
});
test('has no serious accessibility violations on the board or task editor', async ({ page }) => {
  const board = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    board.violations.map((v) => ({
      rule: v.id,
      issues: [...new Set(v.nodes.map((n) => n.failureSummary))],
    })),
  ).toEqual([]);
  await page.getByRole('button', { name: 'New task', exact: false }).click();
  const editor = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    editor.violations.map((v) => ({
      rule: v.id,
      issues: [...new Set(v.nodes.map((n) => n.failureSummary))],
    })),
  ).toEqual([]);
});

test('moves a task with a real touch gesture', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 1400 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'reduce',
  });
  const phone = await context.newPage();
  await phone.goto('/');
  const handle = phone.getByRole('button', {
    name: 'Drag Explore a new visual direction',
    exact: true,
  });
  await expect(handle).toBeVisible();
  const source = (await handle.boundingBox())!;
  const destination = (await phone.getByTestId('column-in_progress').boundingBox())!;
  const session = await context.newCDPSession(phone);
  const x = source.x + source.width / 2,
    y = source.y + source.height / 2;
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await expect(phone.locator('.drag-overlay')).toBeVisible();
  for (let i = 1; i <= 12; i++) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        {
          x: x + ((destination.x + destination.width - 20 - x) * i) / 12,
          y: y + ((destination.y + 90 - y) * i) / 12,
        },
      ],
    });
  }
  await expect(phone.getByRole('status').filter({ hasText: 'Over In progress.' })).toBeVisible();
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(
    phone.getByTestId('column-in_progress').getByText('Explore a new visual direction'),
  ).toBeVisible();
  await context.close();
});
