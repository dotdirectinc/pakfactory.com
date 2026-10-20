import {expect, test, type Page} from '@playwright/test';

/**
 * Site search (PROD-3111) — the header icon / ⌘K dialog, desktop and mobile.
 * Read-only: it searches and follows a result, never submits anything.
 * Counts and exact hits change with content, so this asserts shape, not numbers.
 */

const QUERY = 'mailer';

function searchDialog(page: Page) {
    return page.getByRole('dialog', {name: 'Search'});
}

/** Types the query and waits for the API answer, so results (not browse links) are on screen. */
async function search(page: Page, query: string) {
    const answered = page.waitForResponse(
        (res) => res.url().includes('/api/search?') && res.url().includes(`q=${query}`),
    );
    await searchDialog(page).getByRole('searchbox', {name: 'Search'}).fill(query);
    expect((await answered).status()).toBe(200);
    await expect(searchDialog(page).getByText('Searching…')).toBeHidden();
}

async function openFromIcon(page: Page) {
    await page.getByRole('banner').getByRole('button', {name: 'Search'}).click();
    await expect(searchDialog(page)).toBeVisible();
}

for (const start of ['/', '/products/folding-cartons']) {
    test(`S1: header icon opens search from ${start}; Esc closes`, async ({page}) => {
        await page.goto(start);
        await openFromIcon(page);
        // Idle state: curated chips and the product-lines row, before any query.
        await expect(searchDialog(page).getByRole('button', {name: 'kraft'})).toBeVisible();
        await expect(searchDialog(page).getByRole('region', {name: 'Product lines'})).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(searchDialog(page)).toBeHidden();
    });
}

test('S2: ⌘K / Ctrl+K opens search; grouped results with rail counts', async ({page}) => {
    await page.goto('/');
    await page.getByRole('banner').getByRole('button', {name: 'Search'}).waitFor();
    await page.keyboard.press('ControlOrMeta+K');
    const dialog = searchDialog(page);
    await expect(dialog).toBeVisible();

    await search(page, QUERY);

    await expect(dialog.getByRole('region', {name: 'Products'})).toBeVisible();
    // The Products rail item shows a count once results arrive.
    await expect(
        dialog.getByRole('navigation', {name: 'Search sections'}).getByRole('button', {
            name: /^Products\s+\d+$/,
        }),
    ).toBeVisible();
});

test('S3: arrow keys + Enter open the highlighted result', async ({page}) => {
    await page.goto('/');
    await openFromIcon(page);
    await search(page, QUERY);
    const input = searchDialog(page).getByRole('searchbox', {name: 'Search'});

    await input.press('ArrowDown');
    await input.press('ArrowDown');
    const highlighted = searchDialog(page).locator('[data-active="true"]');
    await expect(highlighted).toHaveCount(1);
    // Opening a result reports the click (Algolia Insights, via our API).
    const clicked = page.waitForResponse(
        (res) => res.url().endsWith('/api/search/click') && res.request().method() === 'POST',
    );
    await input.press('Enter');
    expect((await clicked).status()).toBe(204);

    await expect(searchDialog(page)).toBeHidden();
    await expect(page).toHaveURL(/\/products\/[^/]+/);
});

test.describe('mobile', () => {
    test.use({viewport: {width: 390, height: 844}, hasTouch: true});

    test('S4: below 768 px search is full-screen with Cancel; results tap through', async ({
        page,
    }) => {
        await page.goto('/');
        await openFromIcon(page);
        const dialog = searchDialog(page);

        // Fills the viewport (a desktop scrollbar may take a few px).
        const box = await dialog.boundingBox();
        expect(box?.width ?? 0).toBeGreaterThanOrEqual(390 - 16);
        await expect(dialog.getByRole('button', {name: 'Cancel'})).toBeVisible();

        await search(page, QUERY);
        const firstProduct = dialog
            .getByRole('region', {name: 'Products'})
            .getByRole('button')
            .first();
        await firstProduct.tap();
        await expect(dialog).toBeHidden();
        await expect(page).toHaveURL(/\/products\/[^/]+/);
    });

    test('S5: Cancel closes the mobile sheet', async ({page}) => {
        await page.goto('/');
        await openFromIcon(page);
        await searchDialog(page).getByRole('button', {name: 'Cancel'}).tap();
        await expect(searchDialog(page)).toBeHidden();
    });
});

test('S6: rail tabs show browse picks before any query (no Algolia call)', async ({page}) => {
    const searches: string[] = [];
    page.on('request', (req) => {
        if (req.url().includes('/api/search?')) searches.push(req.url());
    });
    await page.goto('/');
    await openFromIcon(page);
    const dialog = searchDialog(page);
    const rail = dialog.getByRole('navigation', {name: 'Search sections'});

    await rail.getByRole('button', {name: 'Products'}).click();
    await expect(
        dialog.getByRole('region', {name: 'Products'}).getByRole('button'),
    ).not.toHaveCount(0);
    await rail.getByRole('button', {name: 'Customizations'}).click();
    await expect(
        dialog.getByRole('region', {name: 'Categories'}).getByRole('button'),
    ).not.toHaveCount(0);
    await rail.getByRole('button', {name: 'Resources'}).click();
    await expect(
        dialog.getByRole('region', {name: 'Case studies'}).getByRole('button'),
    ).not.toHaveCount(0);
    expect(searches, 'browsing tabs makes no search request').toEqual([]);
});
