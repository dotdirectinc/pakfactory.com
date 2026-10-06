import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {
  catalogTargetNavState,
  hasCatalogPageStatus,
  isCatalogTargetVisible,
  isCustomizationTaxonomyActive,
  isLineStyleActive,
  isLineStyleListed,
  isListedCatalogStatus,
  isOrderableStatus,
  isSolutionActive,
  isHasPageStatus,
  isLineStyleHasPage,
  lineStyleHasPage,
} from './catalog-visibility.ts';

describe('the one status vocabulary', () => {
  it('lists active and coming-soon; hides discontinued and both off states', () => {
    assert.equal(isListedCatalogStatus(undefined), true);
    assert.equal(isListedCatalogStatus('active'), true);
    assert.equal(isListedCatalogStatus('coming-soon'), true);
    assert.equal(isListedCatalogStatus('discontinued'), false);
    assert.equal(isListedCatalogStatus('not-active'), false);
    assert.equal(isListedCatalogStatus('active-internal'), false);
  });

  it('keeps a discontinued page alive but not an off one', () => {
    assert.equal(hasCatalogPageStatus('discontinued'), true);
    assert.equal(hasCatalogPageStatus('not-active'), false);
    assert.equal(hasCatalogPageStatus('active-internal'), false);
  });

  it('allows ordering only while active', () => {
    assert.equal(isOrderableStatus(undefined), true);
    assert.equal(isOrderableStatus('active'), true);
    assert.equal(isOrderableStatus('coming-soon'), false);
    assert.equal(isOrderableStatus('discontinued'), false);
  });

  /**
   * The property the whole model rests on: every predicate NAMES what is visible.
   * A value nobody whitelisted is hidden by construction, which is how two new
   * states joined the vocabulary without a single product gate being touched.
   */
  it('hides a status nobody has ever heard of', () => {
    for (const unknown of ['retired', 'archived', 'embargoed', 'TBD']) {
      assert.equal(isListedCatalogStatus(unknown), false, unknown);
      assert.equal(hasCatalogPageStatus(unknown), false, unknown);
      assert.equal(isLineStyleListed(unknown), false, unknown);
      assert.equal(lineStyleHasPage(unknown), false, unknown);
      assert.equal(isSolutionActive(unknown), false, unknown);
    }
  });
});

describe('lines and styles: listed and page-bearing come apart', () => {
  it('lists active-internal but gives it no page — that is what keeps its children reachable', () => {
    assert.equal(isLineStyleListed('active-internal'), true);
    assert.equal(lineStyleHasPage('active-internal'), false);
  });

  it('gives discontinued a page but no listing', () => {
    assert.equal(lineStyleHasPage('discontinued'), true);
    assert.equal(isLineStyleListed('discontinued'), false);
  });

  it('gives coming-soon neither', () => {
    assert.equal(isLineStyleListed('coming-soon'), false);
    assert.equal(lineStyleHasPage('coming-soon'), false);
  });

  it('treats unset as active, which 13 production lines still rely on', () => {
    assert.equal(isLineStyleListed(undefined), true);
    assert.equal(lineStyleHasPage(undefined), true);
    assert.equal(isLineStyleHasPage(undefined), true);
    assert.equal(isLineStyleActive(undefined), true);
    assert.equal(isHasPageStatus('discontinued'), true);
  });
});

describe('solutions', () => {
  /**
   * The one gate with no unset arm. `status` replaced `hasPage`, which defaulted to
   * FALSE — a page was what a term earned — so an un-migrated solution must read as
   * having no page rather than publishing an empty one.
   */
  it('does NOT treat an unset status as active', () => {
    assert.equal(isSolutionActive(undefined), false);
    assert.equal(isSolutionActive(null), false);
    assert.equal(isSolutionActive(''), false);
    assert.equal(isSolutionActive('active'), true);
    assert.equal(isSolutionActive('coming-soon'), false);
    assert.equal(isSolutionActive('not-active'), false);
  });
});

describe('customization taxonomy', () => {
  /** These had no off switch at all before PROD-2845, so unset must behave as today. */
  it('treats an unset status as active', () => {
    assert.equal(isCustomizationTaxonomyActive(undefined), true);
    assert.equal(isCustomizationTaxonomyActive('active'), true);
    assert.equal(isCustomizationTaxonomyActive('not-active'), false);
  });
});

describe('isCatalogTargetVisible — the gate for a LINK', () => {
  it('needs a line to be both listed and page-bearing', () => {
    assert.equal(isCatalogTargetVisible({_type: 'productLine', status: 'active'}), true);
    assert.equal(isCatalogTargetVisible({_type: 'productLine', status: 'coming-soon'}), false);
    // Listed as a filter, but there is no page to send anyone to.
    assert.equal(isCatalogTargetVisible({_type: 'productLine', status: 'active-internal'}), false);
    // Has a page, but a discontinued line is not something to promote.
    assert.equal(isCatalogTargetVisible({_type: 'productStyle', status: 'discontinued'}), false);
  });

  it('lists coming-soon products and bundles; hides discontinued and both off states', () => {
    assert.equal(isCatalogTargetVisible({_type: 'product', status: 'coming-soon'}), true);
    assert.equal(isCatalogTargetVisible({_type: 'bundle', status: 'discontinued'}), false);
    assert.equal(isCatalogTargetVisible({_type: 'product', status: 'not-active'}), false);
    assert.equal(isCatalogTargetVisible({_type: 'product', status: 'active-internal'}), false);
  });

  it('requires a page-bearing appearsIn AND an active status on customization options', () => {
    assert.equal(
      isCatalogTargetVisible({
        _type: 'customizationOption',
        appearsIn: 'configurable-with-page',
        status: 'active',
      }),
      true,
    );
    assert.equal(
      isCatalogTargetVisible({
        _type: 'customizationOption',
        appearsIn: 'not-configurable-with-page',
        status: 'active',
      }),
      true,
    );
    // Pickable in the configurator, but it has no library page to link to.
    assert.equal(
      isCatalogTargetVisible({
        _type: 'customizationOption',
        appearsIn: 'configurable-no-page',
        status: 'active',
      }),
      false,
    );
    assert.equal(
      isCatalogTargetVisible({
        _type: 'customizationOption',
        appearsIn: 'configurable-with-page',
        status: 'not-active',
      }),
      false,
    );
    // An un-backfilled option has no appearsIn, and must read as having no page.
    assert.equal(
      isCatalogTargetVisible({_type: 'customizationOption', status: 'active'}),
      false,
    );
  });

  it('gates the customization taxonomy, which had no gate before', () => {
    assert.equal(isCatalogTargetVisible({_type: 'customizationCategory'}), true);
    assert.equal(
      isCatalogTargetVisible({_type: 'customizationCategory', status: 'not-active'}),
      false,
    );
    assert.equal(
      isCatalogTargetVisible({_type: 'customizationType', status: 'not-active'}),
      false,
    );
  });

  it('requires an explicit active status on solutions and solution styles', () => {
    assert.equal(isCatalogTargetVisible({_type: 'solution', status: 'active'}), true);
    assert.equal(isCatalogTargetVisible({_type: 'solution'}), false);
    assert.equal(isCatalogTargetVisible({_type: 'solutionStyle', status: 'not-active'}), false);
  });

  it('leaves expertise alone — out of scope, still its own boolean', () => {
    assert.equal(
      isCatalogTargetVisible({_type: 'expertiseService', hasPage: true, status: 'active'}),
      true,
    );
    assert.equal(
      isCatalogTargetVisible({_type: 'expertiseService', hasPage: false, status: 'active'}),
      false,
    );
    assert.equal(isCatalogTargetVisible({_type: 'expertiseStage', status: 'coming-soon'}), true);
  });

  it('passes through unknown types', () => {
    assert.equal(isCatalogTargetVisible({_type: 'post'}), true);
    assert.equal(isCatalogTargetVisible(null), true);
  });
});

describe('catalogTargetNavState — the nav, and only the nav', () => {
  it('shows a coming-soon line or solution as an unlinked signpost', () => {
    assert.equal(catalogTargetNavState({_type: 'productLine', status: 'coming-soon'}), 'unlinked');
    assert.equal(catalogTargetNavState({_type: 'solution', status: 'coming-soon'}), 'unlinked');
  });

  it('links what is visible and hides the rest', () => {
    assert.equal(catalogTargetNavState({_type: 'productLine', status: 'active'}), 'linked');
    assert.equal(catalogTargetNavState({_type: 'productLine', status: 'not-active'}), 'hidden');
    assert.equal(catalogTargetNavState({_type: 'productLine', status: 'discontinued'}), 'hidden');
    assert.equal(catalogTargetNavState({_type: 'productLine', status: 'active-internal'}), 'hidden');
  });

  /**
   * A coming-soon PRODUCT keeps its real page and lists with a badge, so it is a
   * normal link. Only the two types whose coming-soon page does not exist are unlinked.
   */
  it('does not invent an unlinked state for types that keep their page', () => {
    assert.equal(catalogTargetNavState({_type: 'product', status: 'coming-soon'}), 'linked');
    assert.equal(catalogTargetNavState({_type: 'productStyle', status: 'coming-soon'}), 'hidden');
    assert.equal(catalogTargetNavState({_type: 'solutionStyle', status: 'coming-soon'}), 'hidden');
  });

  /**
   * 🔴 The contract curated surfaces depend on. `isCatalogTargetVisible` must keep
   * returning false for a coming-soon line — widening it to produce the nav's third
   * state would start rendering dead hero slides and catalog rows.
   */
  it('keeps the boolean gate false wherever the nav says unlinked', () => {
    for (const doc of [
      {_type: 'productLine', status: 'coming-soon'},
      {_type: 'solution', status: 'coming-soon'},
    ]) {
      assert.equal(catalogTargetNavState(doc), 'unlinked');
      assert.equal(isCatalogTargetVisible(doc), false);
    }
  });
});
