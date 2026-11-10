import {expect, type Locator, type Page} from '@playwright/test';

/** The shared quantity picker (PDP rail, express form): take the first preset. */
export async function pickFirstQuantity(page: Page, scope: Locator): Promise<void> {
    await scope.getByRole('button', {name: 'Open quantities'}).click();
    await page.getByRole('listbox').getByRole('option').first().click();
    await scope.getByRole('button', {name: 'Close quantities'}).click();
}

/**
 * On a PDP: pick a preset quantity and Add to quote (packaging is optional).
 * Asserts the confirmation toast.
 */
export async function addCurrentPdpToRequest(page: Page): Promise<void> {
    // The PDP has no <main> landmark; the request rail lives in the product article.
    const rail = page.getByRole('article').filter({has: page.getByRole('heading', {level: 1})});
    const addButton = rail.getByRole('button', {name: 'Add to quote'});
    await expect(addButton).toBeDisabled();

    await pickFirstQuantity(page, rail);

    // Packaging contents are optional — quantity alone enables Add.
    await expect(addButton).toBeEnabled();
    await addButton.click();

    // Quote pool drawer confirms the add (replaces the old toast).
    await expect(page.getByRole('heading', {name: 'Your quote'})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Create quote request'})).toBeVisible();
}

/** The nav's request link; its count is the number of lines in the pool. */
export function quoteRequestLink(page: Page) {
    return page.getByRole('banner').getByRole('link', {name: /Quote request/});
}

/**
 * Open a desktop mega-menu. It opens on pointer MOVE (Radix) and only once React
 * has hydrated, so a single early hover can land on dead HTML — retry until the
 * sheet's links show.
 */
export async function openMegaMenu(page: Page, trigger: string, expectLink: string | RegExp) {
    const button = page.getByRole('navigation', {name: 'Main'}).getByRole('button', {name: trigger});
    const link = page.getByRole('banner').getByRole('link', {name: expectLink, exact: typeof expectLink === 'string'}).filter({visible: true}).first();
    await expect(async () => {
        await page.mouse.move(0, 400);
        await button.hover();
        await button.hover({position: {x: 8, y: 8}});
        await expect(link).toBeVisible({timeout: 2_000});
    }).toPass({timeout: 45_000});
    return link;
}
