import {expect, type Locator, type Page} from '@playwright/test';
import {BUYER, submitEnabled} from './fixtures';
import {RFQ_REF_PATTERN} from '../../src/lib/request/contract.rules';
import {pickFirstQuantity} from './pdp';

/**
 * Nav Quote request → /request redirects to /request/products when items are waiting.
 */
export async function startRequestFromPool(page: Page, expected: number): Promise<void> {
    await page
        .getByRole('banner')
        .getByRole('link', {name: new RegExp(`^Quote request, ${expected} items?$`)})
        .click();
    await expect(page).toHaveURL(/\/request\/products/);
    await expect(page.getByRole('heading', {level: 1, name: 'Quote Request'})).toBeVisible();
    await expect(page.locator('#section-products')).toContainText(/Items/);
}

/** Advance from the open section by clicking Continue on the next section's row. */
async function continueFrom(page: Page, openSection: Locator): Promise<void> {
    const continueBtn = page.getByRole('button', {name: 'Continue'}).filter({visible: true}).first();
    await expect(continueBtn).toBeEnabled();
    await continueBtn.click();
    await expect(openSection).toHaveAttribute('data-state', 'done');
}

/**
 * Contact fields use Label htmlFor on the intake screen — role + name works.
 */
async function fillContact(page: Page): Promise<void> {
    const contact = page.locator('#section-contact');
    await expect(contact).toHaveAttribute('data-state', 'open');
    await contact.getByRole('textbox', {name: 'First name'}).fill(BUYER.firstName);
    await contact.getByRole('textbox', {name: 'Last name'}).fill(BUYER.lastName);
    await contact.getByRole('textbox', {name: 'Email'}).fill(BUYER.email);
}

function submitButton(page: Page): Locator {
    return page.getByRole('button', {name: 'Submit quote request'});
}

/** Submits only with E2E_SUBMIT=1; otherwise stops with the button enabled. */
async function finish(page: Page): Promise<void> {
    await expect(submitButton(page)).toBeEnabled();
    if (submitEnabled) await submitAndConfirm(page);
}

export type ProductRequestOptions = {
    /** Product titles expected in the Items section. */
    products: string[];
};

/**
 * /request/products: confirm pooled products, Continue through Project details and
 * Contact, then stop when Submit is enabled (or submit when E2E_SUBMIT=1).
 */
export async function completeProductRequest(page: Page, opts: ProductRequestOptions): Promise<void> {
    const products = page.locator('#section-products');
    await expect(products).toHaveAttribute('data-state', 'open');
    for (const title of opts.products) {
        await expect(products.getByRole('link', {name: title, exact: true})).toBeVisible();
    }
    await expect(submitButton(page)).toHaveCount(0);

    await continueFrom(page, products);

    const details = page.locator('#section-details');
    await expect(details).toHaveAttribute('data-state', 'open');
    // Product project details are optional; move on.
    await continueFrom(page, details);

    await fillContact(page);
    await finish(page);
}

/**
 * /request/general: pick Custom packaging, quantity + brief, then Contact.
 */
export async function completeExpressRequest(page: Page): Promise<void> {
    const details = page.locator('#section-details');
    await expect(details).toHaveAttribute('data-state', 'open');
    await expect(page.locator('#section-products')).toHaveCount(0);
    await expect(submitButton(page)).toHaveCount(0);

    await details.getByRole('checkbox', {name: /Custom packaging/}).check();
    await pickFirstQuantity(page, details);
    await details.getByRole('textbox', {name: 'Describe your project'}).fill(BUYER.brief);

    await continueFrom(page, details);
    await fillContact(page);
    await finish(page);
}

/** Submit, then the confirmation page with a real RFQ ref. Opt-in only. */
export async function submitAndConfirm(page: Page): Promise<string> {
    await submitButton(page).click();
    await expect(page).toHaveURL(/\/request\/(?:products|general)\/submitted/);
    await expect(page.getByRole('heading', {level: 1, name: 'Quote request submitted'})).toBeVisible({
        timeout: 30_000,
    });
    const ref = (await page.locator('body').textContent())?.match(/RFQ-[\d-]+/)?.[0];
    expect(ref, 'confirmation shows an RFQ ref').toMatch(RFQ_REF_PATTERN);
    console.log(`submitted ${ref}`);
    return ref!;
}
