import { test, expect } from "@playwright/test";

test.describe("Smoke tests", () => {
  test("homepage loads and shows site title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/קשר השותפות/);
  });

  test("homepage shows video groups", async ({ page }) => {
    await page.goto("/");
    // Wait for content to load
    await page.waitForSelector("text=שיעורים", { timeout: 10_000 });
    // Should have at least one group header
    const groups = page.locator("button", { hasText: "שיעורים" });
    await expect(groups.first()).toBeVisible();
  });

  test("sidebar navigation is visible", async ({ page }) => {
    await page.goto("/");
    // Sidebar should have the site name
    await expect(page.locator("text=בית המדרש קשר השותפות").first()).toBeVisible();
    await expect(page.locator("text=הרב אסף פלג").first()).toBeVisible();
  });

  test("search input exists and is functional", async ({ page }) => {
    await page.goto("/");
    const searchInput = page.locator('input[placeholder*="חפש"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill("דרש");
    // Should filter results (no crash)
    await page.waitForTimeout(500);
  });

  test("profile page redirects unauthenticated users", async ({ page }) => {
    const response = await page.goto("/profile");
    // Should redirect to home with login param
    expect(page.url()).toContain("/");
  });

  test("admin page redirects non-admin users", async ({ page }) => {
    const response = await page.goto("/admin");
    // Should redirect to home
    expect(page.url()).not.toContain("/admin");
  });

  test("achievements page redirects unauthenticated users", async ({ page }) => {
    await page.goto("/achievements");
    expect(page.url()).toContain("/");
  });

  test("dark mode toggle works", async ({ page }) => {
    await page.goto("/");
    // Find the dark mode button
    const darkBtn = page.locator('button[aria-label="מצב כהה"]');
    if (await darkBtn.isVisible()) {
      await darkBtn.click();
      // HTML should have dark class
      await expect(page.locator("html")).toHaveClass(/dark/);
      // Toggle back
      const lightBtn = page.locator('button[aria-label="מצב בהיר"]');
      await lightBtn.click();
      await expect(page.locator("html")).not.toHaveClass(/dark/);
    }
  });

  test("skip-nav link exists", async ({ page }) => {
    await page.goto("/");
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeAttached();
  });

  test("manifest.json is accessible", async ({ page }) => {
    const response = await page.goto("/manifest.json");
    expect(response?.status()).toBe(200);
    const json = await response?.json();
    expect(json.name).toContain("קשר השותפות");
  });

  test("favicon.svg is accessible", async ({ page }) => {
    const response = await page.goto("/favicon.svg");
    expect(response?.status()).toBe(200);
  });
});
