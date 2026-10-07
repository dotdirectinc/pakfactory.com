import {expect, test} from '@playwright/test';
import {LINE, STYLE, STYLE_PRODUCT, TEST_ENTRY} from '../support/fixtures';
import {addCurrentPdpToRequest, openMegaMenu, quoteRequestLink} from '../support/pdp';
import {completeProductRequest, startRequestFromPool} from '../support/request';

/**
 * A1 — Home → nav Products → line → Explore styles → style → PDP → request.
 */
test('A1: navbar Products → line → style → PDP → product request', async ({page}) => {
    await page.goto('/');

    await test.step('open the Products mega-menu and pick a line', async () => {
        const lineLink = await openMegaMenu(page, 'Products', LINE.title);
        // Editor test entries live in this menu; they must never be our path.
        await expect(lineLink).not.toHaveText(TEST_ENTRY);
        await lineLink.click();
        await expect(page).toHaveURL(new RegExp(`/products/${LINE.slug}$`));
    });

    await test.step('line landing → Explore styles → style', async () => {
        await page.getByRole('link', {name: 'Explore styles'}).click();
        await page.getByRole('link', {name: new RegExp(`^${STYLE.title}\\b`)}).first().click();
        await expect(page).toHaveURL(new RegExp(`/products/${LINE.slug}/${STYLE.slug}$`));
        await expect(page.getByRole('heading', {level: 1, name: STYLE.title})).toBeVisible();
    });

    await test.step('style listing → PDP', async () => {
        await page.getByRole('link', {name: STYLE_PRODUCT.title, exact: true}).first().click();
        await expect(page.getByRole('heading', {level: 1, name: STYLE_PRODUCT.title})).toBeVisible();
    });

    await test.step('add to request', async () => {
        await addCurrentPdpToRequest(page);
        await expect(quoteRequestLink(page)).toContainText('1');
    });

    await test.step('Quote request → start → complete the product request', async () => {
        await startRequestFromPool(page, 1);
        await completeProductRequest(page, {products: [STYLE_PRODUCT.title]});
    });
});
