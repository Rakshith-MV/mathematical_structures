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
});
