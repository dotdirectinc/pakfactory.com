import {expect, type Locator, type Page} from '@playwright/test';
import {BUYER, submitEnabled} from './fixtures';
import {pickFirstQuantity} from './pdp';

/**
 * Nav Quote request → /request → every pooled item is selected → Start.
 * Lands on /request/products.
 */
export async function startRequestFromPool(page: Page, expected: number): Promise<void> {
    await page
        .getByRole('banner')
        .getByRole('link', {name: new RegExp(`^Quote request, ${expected} items?$`)})
        .click();
    await expect(page).toHaveURL(/\/request$/);
    await expect(page.getByRole('heading', {level: 3, name: `Items (${expected})`})).toBeVisible();

    const start = page.getByRole('button', {name: `Start quote request (${expected})`});
    await expect(start).toBeEnabled();
    await start.click();
    await expect(page).toHaveURL(/\/request\/products$/);
}

/**
 * Pick from a Radix dropdown by keyboard: open, typeahead the label, Enter.
 * Clicking the item is flaky — the menu repositions while the long form scrolls,
 * so Playwright waits forever for it to be "stable". Assert the trigger took it.
 */
async function pickFromDropdown(page: Page, trigger: Locator, label: string) {
    await trigger.click();
    const item = page.getByRole('menuitemradio', {name: label, exact: true});
    await expect(item).toBeAttached();
    await page.keyboard.type(label);
    await expect(item).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(item).toBeHidden();
}

/** Country, then the region dropdown it reveals. */
async function pickCountryAndRegion(page: Page, scope: Locator, country: string, region?: string) {
    await pickFromDropdown(page, scope.getByRole('button', {name: 'Select country'}), country);
    await expect(scope.getByRole('button', {name: country})).toBeVisible();
    if (!region) return;
    await pickFromDropdown(page, scope.getByRole('button', {name: /^Select (province|state|region)/i}), region);
    await expect(scope.getByRole('button', {name: region})).toBeVisible();
}

/**
 * Address line 1 is a Places autocomplete over a free-text input: the typed value
 * is kept, so no suggestion needs picking. Escape closes the suggestion list.
 */
async function fillAddress(
    page: Page,
    scope: Locator,
    address: {line1?: string; city: string; region?: string; country: string},
) {
    await pickCountryAndRegion(page, scope, address.country, address.region);
    if (address.line1) {
        const line1 = scope.getByRole('combobox', {name: 'Address'});
        await line1.fill(address.line1);
        await line1.press('Escape');
    }
    await scope.getByRole('textbox', {name: 'City', exact: true}).fill(address.city);
}

/**
 * Contact fields' <label>s are not associated with their inputs (no accessible
 * name), so target the input that follows the label text.
 */
function contactInput(section: Locator, label: string): Locator {
    return section.locator(`label:has-text("${label}") + input`).first();
}

/** Brief + ship-to, then contact + company office. Shared by every form. */
async function fillBriefShippingAndContact(page: Page): Promise<void> {
    const requirements = page.locator('#section-requirements');
    const information = page.locator('#section-information');

    await requirements
        .getByRole('textbox', {name: /What you’re launching/})
        .fill(BUYER.brief);
    await fillAddress(page, requirements, BUYER.shipTo);

    await contactInput(information, 'First name').fill(BUYER.firstName);
    await contactInput(information, 'Last name').fill(BUYER.lastName);
    await contactInput(information, 'Email').fill(BUYER.email);
    await contactInput(information, 'Company').fill(BUYER.company);
    await fillAddress(page, information, BUYER.office);
}

/**
 * The Review "paper" echoes what was typed. Match by text, not table cells: the
 * Item cell holds the title plus a `Product: <contents>` line, and the paper's
 * layout has changed before (2026-10-06 — Configuration → Customization).
 */
async function expectReviewPaper(page: Page, products: string[]): Promise<void> {
    const review = page.locator('#section-review');

    await expect(review).toContainText(`${BUYER.firstName} ${BUYER.lastName}`);
    await expect(review).toContainText(BUYER.email);
    await expect(review).toContainText(BUYER.brief);
    await expect(review).toContainText(BUYER.shipTo.city);

    if (products.length === 0) return;
    const rows = review.getByRole('table').getByRole('rowgroup').last().getByRole('row');
    await expect(rows).toHaveCount(products.length);
    for (const title of products) {
        const row = rows.filter({hasText: title});
        await expect(row).toHaveCount(1);
        await expect(row).toContainText(BUYER.contents);
    }
}

function submitButton(page: Page): Locator {
    return page.getByRole('button', {name: 'Request a quote'});
}

/** Submits only with E2E_SUBMIT=1; otherwise stops with the button enabled. */
async function finish(page: Page): Promise<void> {
    await expect(submitButton(page)).toBeEnabled();
    if (submitEnabled) await submitAndConfirm(page);
}

export type ProductRequestOptions = {
    /** Product titles expected in the form and on the Review paper. */
    products: string[];
};

/**
 * /request/products: check the pooled products, fill Requirements and Your
 * Information, then check the Review paper lists every product.
 */
export async function completeProductRequest(page: Page, opts: ProductRequestOptions): Promise<void> {
    const products = page.locator('#section-products');
    for (const title of opts.products) {
        await expect(products.getByRole('link', {name: title, exact: true})).toBeVisible();
    }
    await expect(submitButton(page)).toBeDisabled();

    await fillBriefShippingAndContact(page);

    await expectReviewPaper(page, opts.products);
    await finish(page);
}

/**
 * /request/general (express): requirements only — contents and quantity are
 * asked up front instead of per product, and there is no products table.
 */
export async function completeExpressRequest(page: Page): Promise<void> {
    const requirements = page.locator('#section-requirements');
    await expect(page.locator('#section-products')).toHaveCount(0);
    await expect(submitButton(page)).toBeDisabled();

    await requirements
        .getByRole('textbox', {name: /e\.g\. 750ml spirit bottles/})
        .fill(BUYER.contents);
    await pickFirstQuantity(page, requirements);
    await fillBriefShippingAndContact(page);

    await expectReviewPaper(page, []);
    await finish(page);
}

/** Submit, then the success dialog with a real RFQ ref. Opt-in only. */
export async function submitAndConfirm(page: Page): Promise<string> {
    await submitButton(page).click();
    const dialog = page.getByRole('dialog').filter({hasText: 'Request submitted'});
    await expect(dialog).toBeVisible({timeout: 30_000});
    const ref = (await dialog.textContent())?.match(/RFQ-\d+/)?.[0];
    expect(ref, 'success dialog shows an RFQ ref').toBeTruthy();
    console.log(`submitted ${ref}`);
    return ref!;
}
