import {expect, test, type Page} from '@playwright/test';

/**
 * Site search (PROD-3111) — the header icon / ⌘K dialog, desktop and mobile,
 * in Basic mode (the default since 2026-10-21; Advanced is not mounted).
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
    test(`S1: header icon opens Basic search from ${start}; nothing recommended; Esc closes`, async ({
        page,
    }) => {
        const idle: string[] = [];
        page.on('request', (req) => {
            if (req.url().includes('/api/search/idle')) idle.push(req.url());
        });
        await page.goto(start);
        await openFromIcon(page);
        const dialog = searchDialog(page);
        await expect(dialog).toHaveAttribute('data-site-search-mode', 'basic');
        // Basic mode: no rail, no browse picks, no idle request.
        await expect(dialog.getByRole('navigation', {name: 'Search sections'})).toHaveCount(0);
        await expect(dialog.getByRole('region', {name: 'Product lines'})).toHaveCount(0);
        expect(idle).toEqual([]);
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
    });
}

test('S2: ⌘K opens search; loose suggestions while typing, all results on Enter', async ({
    page,
}) => {
    await page.goto('/');
    await page.getByRole('banner').getByRole('button', {name: 'Search'}).waitFor();
    await page.keyboard.press('ControlOrMeta+K');
    const dialog = searchDialog(page);
    await expect(dialog).toBeVisible();

    await search(page, QUERY);
    const suggestions = dialog.getByRole('region', {name: 'Suggestions'});
    await expect(suggestions.getByRole('button').first()).toBeVisible();
    await expect(suggestions.getByRole('button', {name: /^See all results for/})).toBeVisible();

    await dialog.getByRole('searchbox', {name: 'Search'}).press('Enter');
    await expect(dialog.getByRole('region', {name: 'Products'})).toBeVisible();
    await expect(dialog.getByText(/results? for “mailer”/)).toBeVisible();
});

test('S3: arrow keys + Enter open the highlighted result', async ({page}) => {
    await page.goto('/');
    await openFromIcon(page);
    await search(page, QUERY);
    const input = searchDialog(page).getByRole('searchbox', {name: 'Search'});

    await input.press('Enter');
    await expect(searchDialog(page).getByRole('region', {name: 'Products'})).toBeVisible();
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
        await dialog.getByRole('searchbox', {name: 'Search'}).press('Enter');
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

test('S6: a searched query shows under Recent searches (local); remove and Clear', async ({
    page,
}) => {
    await page.goto('/');
    await page.evaluate(() => window.localStorage.removeItem('www-search-recents-v1'));
    await openFromIcon(page);
    const dialog = searchDialog(page);
    const input = dialog.getByRole('searchbox', {name: 'Search'});

    await expect(dialog.getByRole('region', {name: 'Recent searches'})).toHaveCount(0);
    await search(page, QUERY);
    await input.press('Enter');
    await search(page, 'kraft');
    await input.press('Enter');
    await input.fill('');

    const recent = dialog.getByRole('region', {name: 'Recent searches'});
    await expect(recent.getByRole('button', {name: 'kraft', exact: true})).toBeVisible();
    await expect(recent.getByRole('button', {name: QUERY, exact: true})).toBeVisible();

    // A recent search runs again with all results.
    await recent.getByRole('button', {name: QUERY, exact: true}).click();
    await expect(input).toHaveValue(QUERY);
    await expect(dialog.getByRole('region', {name: 'Products'})).toBeVisible();

    await input.fill('');
    await recent.getByRole('button', {name: `Remove “kraft” from recent searches`}).click();
    await expect(recent.getByRole('button', {name: 'kraft', exact: true})).toHaveCount(0);
    await recent.getByRole('button', {name: 'Clear'}).click();
    await expect(recent).toHaveCount(0);
});
