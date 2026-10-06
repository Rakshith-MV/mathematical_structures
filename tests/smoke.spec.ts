import { test, expect } from '@playwright/test';

test.describe('Theorem Graph Smoke Tests', () => {
  test('renders at 1280px desktop width and allows mode navigation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    // Check title and brand
    await expect(page).toHaveTitle(/Theorem Graph/);
    await expect(page.getByText('Theorem Graph')).toBeVisible();

    // Check mode buttons
    const fogOfWarBtn = page.getByRole('button', { name: /Fog of War/i });
    await expect(fogOfWarBtn).toBeVisible();

    const predictArrowBtn = page.getByRole('button', { name: /Predict Arrow/i });
    await expect(predictArrowBtn).toBeVisible();

    // Navigate to Quiz
    await predictArrowBtn.click();
    await expect(page.getByText(/Predict the Arrow/i)).toBeVisible();

    // Navigate to Fog of War (Explore)
    await fogOfWarBtn.click();
    await expect(page.getByText('Unlock Mathematical Structures')).toBeVisible();

    // Navigate back to Graph
    const graphBtn = page.getByRole('button', { name: /Graph/i });
    await graphBtn.click();
    await expect(page.getByText(/Path Finder:/i)).toBeVisible();
  });

  test('renders responsively at 390px mobile width without breakage', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); // iPhone 12/13/14 size
    await page.goto('/');

    await expect(page.getByText('Theorem Graph')).toBeVisible();

    // Controls remain accessible
    await expect(page.getByRole('combobox').first()).toBeVisible();
  });

  test('adds a definition and a theorem from the Editor', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');

    await page.getByRole('button', { name: 'Editor' }).click();
    await expect(page.getByText('Content Editor')).toBeVisible();

    await page.getByLabel('Name *').fill('Totally bounded');
    await page.getByLabel('Definition *').fill('For every $\\varepsilon > 0$, $X$ is covered by finitely many $\\varepsilon$-balls.');
    await page.getByRole('button', { name: 'Add Definition' }).click();
    await expect(page.getByRole('status')).toContainText('totally-bounded');

    await page.getByRole('tab', { name: /Theorems/ }).click();
    await page.getByRole('group', { name: /Hypotheses/ }).locator('select').selectOption('compact');
    await page.getByRole('group', { name: /Conclusions/ }).locator('select').selectOption('totally-bounded');
    await page.getByLabel('Context *').selectOption('metric-spaces');
    await page.getByLabel('Source *').fill('Munkres, Topology §45');
    await page.getByRole('button', { name: 'Add Theorem' }).click();
    await expect(page.getByRole('status')).toContainText('stmt-compact-implies-totally-bounded');

    // Entries survive a reload (stored in localStorage)
    await page.reload();
    await page.getByRole('button', { name: 'Editor' }).click();
    await expect(page.getByRole('button', { name: /Totally bounded/ })).toBeVisible();
  });
});
