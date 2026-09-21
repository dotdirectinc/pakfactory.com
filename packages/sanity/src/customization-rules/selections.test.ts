import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveWithSelections } from "./selections.ts";
import type { DependencyGraph } from "./resolve.ts";
import type { Catalog, ProductDoc } from "./index.ts";

// Material decides Printing Method; Printing Method decides Colour System.
// Offset works on SBS, Digital on Kraft, CMYK on Offset only, Pantone on both methods.
const catalog = (): Catalog => ({
  types: [
    { _id: 't.material', title: 'Paperboard', availabilityDecidedBy: 'product' },
    { _id: 't.method', title: 'Printing Method', availabilityDecidedBy: 'customization' },
    { _id: 't.colour', title: 'Colour System', availabilityDecidedBy: 'customization' },
  ],
  options: [
    { _id: 'o.sbs', title: 'SBS', typeId: 't.material' },
    { _id: 'o.kraft', title: 'White Kraft', typeId: 't.material' },
    { _id: 'o.offset', title: 'Offset', typeId: 't.method', compatibleCustomizations: ['o.sbs'] },
    { _id: 'o.digital', title: 'Digital', typeId: 't.method', compatibleCustomizations: ['o.kraft'] },
    { _id: 'o.cmyk', title: 'CMYK', typeId: 't.colour', compatibleCustomizations: ['o.offset'] },
    { _id: 'o.pantone', title: 'Pantone', typeId: 't.colour', compatibleCustomizations: ['o.offset', 'o.digital'] },
  ],
});

const graph: DependencyGraph = { dependsOn: { 't.method': ['t.material'], 't.colour': ['t.method'] } };
const product: ProductDoc = {
  _id: 'p.card',
  availableCustomizations: [{ optionId: 'o.sbs' }, { optionId: 'o.kraft' }],
};

test('with nothing chosen, everything the product can offer is available', () => {
  const r = resolveWithSelections(catalog(), product, graph, {});
  assert.deepEqual(r.availableByType.get('t.method'), ['o.offset', 'o.digital']);
  assert.deepEqual(r.availableByType.get('t.colour'), ['o.cmyk', 'o.pantone']);
});

test('choosing a material narrows the methods to the ones that work on it', () => {
  const r = resolveWithSelections(catalog(), product, graph, { 't.material': ['o.kraft'] });
  assert.deepEqual(r.availableByType.get('t.method'), ['o.digital']);
});

test('the narrowing cascades: CMYK needed Offset, which Kraft removed', () => {
  const r = resolveWithSelections(catalog(), product, graph, { 't.material': ['o.kraft'] });
  assert.deepEqual(r.availableByType.get('t.colour'), ['o.pantone']);
});

// ── the case a configurator must not get wrong ───────────────────────────────

test('a later choice that invalidates an earlier one removes it AND says so', () => {
  // The customer picked Offset while on SBS, then switched the material to Kraft.
  const r = resolveWithSelections(catalog(), product, graph, {
    't.material': ['o.kraft'],
    't.method': ['o.offset'],
  });
  assert.deepEqual(r.invalidated, [{ typeId: 't.method', optionId: 'o.offset', unsatisfied: ['t.material'] }]);
  // Removed from what still stands — a spec must not carry a choice that cannot be made.
  assert.deepEqual(r.selections['t.method'], undefined);
  assert.deepEqual(r.selections['t.material'], ['o.kraft']);
});

test('invalidation cascades to a choice that depended on the invalidated one', () => {
  const r = resolveWithSelections(catalog(), product, graph, {
    't.material': ['o.kraft'],
    't.method': ['o.offset'],
    't.colour': ['o.cmyk'],
  });
  assert.deepEqual(
    r.invalidated.map((x) => x.optionId).sort(),
    ['o.cmyk', 'o.offset'],
  );
  assert.deepEqual(r.selections['t.colour'], undefined);
});

test('a choice that stays possible is kept', () => {
  const r = resolveWithSelections(catalog(), product, graph, {
    't.material': ['o.sbs'],
    't.method': ['o.offset'],
    't.colour': ['o.cmyk'],
  });
  assert.deepEqual(r.invalidated, []);
  assert.deepEqual(r.selections['t.colour'], ['o.cmyk']);
  assert.deepEqual(r.availableByType.get('t.colour'), ['o.cmyk', 'o.pantone']);
});

test('choosing a method narrows the colours, the other direction of the same rule', () => {
  const r = resolveWithSelections(catalog(), product, graph, { 't.method': ['o.digital'] });
  assert.deepEqual(r.availableByType.get('t.colour'), ['o.pantone']);
});

// ── selections the product never offered ─────────────────────────────────────

test('an option this product does not offer is ignored and named, not silently honoured', () => {
  const r = resolveWithSelections(catalog(), { _id: 'p.bare', availableCustomizations: [{ optionId: 'o.sbs' }] }, graph, {
    't.material': ['o.kraft'],
  });
  assert.deepEqual(r.notOffered, [{ typeId: 't.material', optionId: 'o.kraft', unsatisfied: [] }]);
  assert.equal(r.selections['t.material'], undefined);
});

test('a selection of two options of one type keeps both when both survive', () => {
  // Multi-select types exist — Embossing & Debossing allows several.
  const r = resolveWithSelections(catalog(), product, graph, { 't.material': ['o.sbs', 'o.kraft'] });
  assert.deepEqual(r.selections['t.material'], ['o.sbs', 'o.kraft']);
  assert.deepEqual(r.availableByType.get('t.method'), ['o.offset', 'o.digital']);
});

test('the diagnostics from the product-level pass are still reported', () => {
  // unconstrainedTypes and friends come from resolveForProduct and must survive the narrowing,
  // or a caller loses them the moment a customer clicks anything.
  const r = resolveWithSelections(catalog(), product, { dependsOn: { 't.method': ['t.material'] } }, {});
  assert.deepEqual(r.unconstrainedTypes, ['t.colour']);
});

test('an invalidated choice leaves its type UNANSWERED, it does not empty the product', () => {
  // Offset is impossible on Kraft. If the method stayed narrowed to an impossible answer,
  // every colour would lose its partner and the product would offer nothing at all — a
  // configurator showing a blank screen because of a choice it is already discarding.
  const r = resolveWithSelections(catalog(), product, graph, {
    't.material': ['o.kraft'],
    't.method': ['o.offset'],
  });
  assert.deepEqual(r.availableByType.get('t.method'), ['o.digital']);
  assert.deepEqual(r.availableByType.get('t.colour'), ['o.pantone']);
});
