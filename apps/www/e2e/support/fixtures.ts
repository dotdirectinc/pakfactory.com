/**
 * Content fixtures for the RFQ flows, read from the Sanity `development`
 * dataset on 2026-10-05. Tests navigate by these visible labels, the way a
 * buyer does, so a renamed doc fails loudly at the step that depends on it.
 *
 * Rule: never pick a `[Test] …` doc (or a `test-` slug) as a fixture, and never
 * assert exact menu counts — those test entries come and go in the nav.
 */
export const LINE = {title: 'Folding Cartons', slug: 'folding-cartons'};

export const STYLE = {title: 'Tuck End Boxes', slug: 'tuck-end-boxes'};

/** A product on the STYLE listing above, reached by clicking its card. */
export const STYLE_PRODUCT = {title: 'Straight Tuck End (STE)'};

export const SOLUTION = {title: 'Coffee', slug: 'coffee'};

/** A PDP reachable by deep link; also sits under the Coffee solution. */
export const PDP = {
    title: 'Eco-Friendly Custom-Sized Retail Coffee Boxes',
    slug: 'eco-friendly-custom-sized-retail-coffee-boxes',
};

/** Matches the editor test entries we must ignore (`[Test] Rigid Boxes`, …). */
export const TEST_ENTRY = /^\s*\[test\]/i;

/** Every free-text field the tests type into is tagged so staging rows are findable. */
export const E2E_TAG = '[E2E]';

export const BUYER = {
    firstName: 'E2E',
    lastName: 'Playwright',
    email: 'e2e+rfq@dotdirect.ca',
    company: `${E2E_TAG} PakFactory QA`,
    contents: `${E2E_TAG} 250ml glass jars`,
    brief: `${E2E_TAG} Automated RFQ smoke test — please ignore.`,
    office: {line1: '100 King St W', city: 'Toronto', region: 'Ontario', country: 'Canada'},
    shipTo: {city: 'Toronto', country: 'Canada'},
};

export const submitEnabled = process.env.E2E_SUBMIT === '1';
