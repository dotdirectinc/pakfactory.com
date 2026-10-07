import {expect, test} from '@playwright/test';
import {LINE, SOLUTION, STYLE, STYLE_PRODUCT} from '../support/fixtures';
import {addCurrentPdpToRequest, openMegaMenu, quoteRequestLink} from '../support/pdp';
import {completeProductRequest, startRequestFromPool} from '../support/request';

/** A product tile in the Coffee solution hero; opens a preview dialog. */
const SOLUTION_PRODUCT = 'Custom Coffee Boxes';
/** Found through /products search after "Add another product". */
const SEARCH_PRODUCT = 'Bookend';

/**
 * A10 — one request pooled from three entrances:
 *   1. nav Products → line → style → PDP
 *   2. nav Solutions → solution → hero tile → preview → PDP
 *   3. /request → Add another product → Products → catalog search → PDP
 */
test('A10: three products from three entrances → one product request', async ({page}) => {
    await page.goto('/');

    await test.step('1 · nav Products → line → style → PDP', async () => {
        await (await openMegaMenu(page, 'Products', LINE.title)).click();
        await page.getByRole('link', {name: 'Explore styles'}).click();
        await page.getByRole('link', {name: new RegExp(`^${STYLE.title}\\b`)}).first().click();
        await page.getByRole('link', {name: STYLE_PRODUCT.title, exact: true}).first().click();
        await addCurrentPdpToRequest(page);
        await expect(quoteRequestLink(page)).toHaveAccessibleName('Quote request, 1 item');
    });

    await test.step('2 · nav Solutions → solution → hero tile → PDP', async () => {
        await (await openMegaMenu(page, 'Solutions', SOLUTION.title)).click();
        await expect(page).toHaveURL(new RegExp(`/solutions/${SOLUTION.slug}$`));

        await page.getByRole('button', {name: `View ${SOLUTION_PRODUCT}`, exact: true}).first().click();
        const preview = page.getByRole('dialog', {name: SOLUTION_PRODUCT});
        await preview.getByRole('link', {name: 'View product details'}).click();
        await expect(page.getByRole('heading', {level: 1, name: SOLUTION_PRODUCT})).toBeVisible();

        await addCurrentPdpToRequest(page);
        await expect(quoteRequestLink(page)).toHaveAccessibleName('Quote request, 2 items');
    });

    await test.step('3 · Add another product → Products → search → PDP', async () => {
        await quoteRequestLink(page).click();
        await page.getByRole('button', {name: 'Add another product'}).click();
        await page.getByRole('menuitem', {name: /^Products/}).click();
        await expect(page).toHaveURL(/\/products$/);

        await page.getByRole('searchbox', {name: 'Search products'})
            .or(page.getByRole('textbox', {name: 'Search products'}))
            .fill(SEARCH_PRODUCT);
        await page.getByRole('link', {name: SEARCH_PRODUCT, exact: true}).first().click();
        await expect(page.getByRole('heading', {level: 1, name: SEARCH_PRODUCT})).toBeVisible();

        await addCurrentPdpToRequest(page);
        await expect(quoteRequestLink(page)).toHaveAccessibleName('Quote request, 3 items');
    });

    await test.step('start with all three → complete the request', async () => {
        await startRequestFromPool(page, 3);
        await completeProductRequest(page, {
            products: [STYLE_PRODUCT.title, SOLUTION_PRODUCT, SEARCH_PRODUCT],
        });
    });
});
