import {expect, test} from '@playwright/test';
import {completeExpressRequest} from '../support/request';

/**
 * B1 — navbar "Get a Quote" → express request (/request/general).
 * The CTA is in the nav on every page; start from a deep page, not just home.
 */
for (const start of ['/', '/products/folding-cartons']) {
    test(`B1: navbar Get a Quote from ${start} → express request`, async ({page}) => {
        await page.goto(start);
        // Home renders more than one "Get a Quote" (heroes); the nav's is the one under test.
        await page.getByRole('banner').getByRole('link', {name: 'Get a Quote'}).click();
        await expect(page).toHaveURL(/\/request\/general$/);
        await expect(page.getByRole('alert').filter({hasText: 'Get a quote'})).toBeAttached();

        await completeExpressRequest(page);
    });
}
