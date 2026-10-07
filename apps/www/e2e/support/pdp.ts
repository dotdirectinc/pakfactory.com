import {expect, type Locator, type Page} from '@playwright/test';
import {BUYER} from './fixtures';

/** The shared quantity picker (PDP rail, express form): take the first preset. */
export async function pickFirstQuantity(page: Page, scope: Locator): Promise<void> {
    await scope.getByRole('button', {name: 'Open quantities'}).click();
    await page.getByRole('listbox').getByRole('option').first().click();
    await scope.getByRole('button', {name: 'Close quantities'}).click();
}

/**
 * On a PDP: pick a preset quantity, say what goes in the box, Add to request.
 * Asserts the confirmation toast and that the nav's Quote request count rose.
 */
export async function addCurrentPdpToRequest(page: Page): Promise<void> {
    // The PDP has no <main> landmark; the request rail lives in the product article.
    const rail = page.getByRole('article').filter({has: page.getByRole('heading', {level: 1})});
    const addButton = rail.getByRole('button', {name: 'Add to request'});
    await expect(addButton).toBeDisabled();

    await pickFirstQuantity(page, rail);

    await rail
        .getByRole('textbox', {name: /What are you putting in the packaging/})
        .fill(BUYER.contents);

    await expect(addButton).toBeEnabled();
    await addButton.click();

    // Earlier toasts may still be stacked; the newest one is ours.
    await expect(page.getByText('Added to quote request').last()).toBeVisible();
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
