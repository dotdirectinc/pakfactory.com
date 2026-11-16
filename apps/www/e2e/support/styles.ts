import {expect, type Page} from '@playwright/test';

/**
 * Click a style card in the line landing's `#styles` band.
 *
 * The card is one link. Its accessible name starts with the product-photo alt,
 * then the style title, then "See all", so a name that must *start* with the
 * title never matches. Match the title as a substring, scoped to the band.
 *
 * The grid only mounts the first six cards. Expand "See more" when the style
 * sits further down.
 */
export async function openStyleCard(page: Page, title: string): Promise<void> {
    const styles = page.locator('#styles');
    await expect(styles).toBeVisible();

    const card = styles.getByRole('link', {name: title}).first();
    const seeMore = styles.getByRole('button', {name: 'See more'});
    if (!(await card.isVisible()) && (await seeMore.isVisible())) {
        await seeMore.click();
    }

    await card.click();
}
