import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveWithSelections } from "./selections.ts";
import type { DependencyGraph } from "./resolve.ts";
import type { Catalog, ProductDoc } from "./index.ts";

// Material decides Printing Method; Printing Method decides Colour System.
// Offset works on SBS, Digital on Kraft, CMYK on Offset only, Pantone on both methods.
// Pairs are COMPLETE, as the fill writes them: CMYK (Offset only) pairs with SBS too, and
// Pantone with both boards — every two options that can be ordered together.
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
    { _id: 'o.cmyk', title: 'CMYK', typeId: 't.colour', compatibleCustomizations: ['o.offset', 'o.sbs'] },
    { _id: 'o.pantone', title: 'Pantone', typeId: 't.colour', compatibleCustomizations: ['o.offset', 'o.digital', 'o.sbs', 'o.kraft'] },
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
  assert.deepEqual(r.invalidated, [
    { typeId: 't.method', optionId: 'o.offset', unsatisfied: ['t.material'], conflictsWith: ['o.kraft'] },
  ]);
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
  // Each pick hides what it does not pair with, so only a method that goes with BOTH boards
  // could stay — and here each method works on one board only.
  assert.equal(r.availableByType.get('t.method'), undefined);
});

// ── picks check each other, pair by pair (PROD-2556) ─────────────────────────
// Crystal's three cases, at their smallest. Ink and Embossing are `customerSelects: many`;
// Surface Finish is `one`. None depends on another, so requirements never compared them.
const pairwise = (): Catalog => ({
  types: [
    { _id: 't.board', availabilityDecidedBy: 'product' },
    { _id: 't.ink', availabilityDecidedBy: 'customization', customerSelects: 'many' },
    { _id: 't.finish', availabilityDecidedBy: 'customization', customerSelects: 'one' },
    { _id: 't.emboss', availabilityDecidedBy: 'customization', customerSelects: 'many' },
  ],
  options: [
    { _id: 'o.board', typeId: 't.board' },
    // By Composition (soy, water) never pair; By Effect (metallic, pearl) never pair; across, they do.
    { _id: 'o.soy', typeId: 't.ink', compatibleCustomizations: ['o.board', 'o.metallic', 'o.pearl', 'o.softtouch', 'o.gloss', 'o.blind', 'o.bembo', 'o.textured'] },
    { _id: 'o.water', typeId: 't.ink', compatibleCustomizations: ['o.board', 'o.metallic', 'o.pearl', 'o.softtouch', 'o.gloss', 'o.blind', 'o.bembo', 'o.textured'] },
    { _id: 'o.metallic', typeId: 't.ink', compatibleCustomizations: ['o.board', 'o.softtouch', 'o.gloss', 'o.blind', 'o.bembo', 'o.textured'] },
    { _id: 'o.pearl', typeId: 't.ink', compatibleCustomizations: ['o.board', 'o.softtouch', 'o.gloss', 'o.blind', 'o.bembo', 'o.textured'] },
    // Soft Touch pairs with no Debossing; Gloss pairs with everything.
    { _id: 'o.softtouch', typeId: 't.finish', compatibleCustomizations: ['o.board', 'o.bembo'] },
    { _id: 'o.gloss', typeId: 't.finish', compatibleCustomizations: ['o.board', 'o.blind', 'o.bembo', 'o.textured'] },
    // Textured goes alone within Embossing; Blind Debossing and Blind Embossing combine.
    { _id: 'o.blind', typeId: 't.emboss', compatibleCustomizations: ['o.board', 'o.bembo'] },
    { _id: 'o.bembo', typeId: 't.emboss', compatibleCustomizations: ['o.board'] },
    { _id: 'o.textured', typeId: 't.emboss', compatibleCustomizations: ['o.board'] },
    // Recorded with no pairs at all (a hand-made option): never hides, never hidden.
    { _id: 'o.bare', typeId: 't.emboss' },
  ],
});
const noDeps: DependencyGraph = { dependsOn: {} };
const card: ProductDoc = {
  _id: 'p.card',
  availableCustomizations: [{ optionId: 'o.board' }],
  customizationExceptions: [{ optionId: 'o.bare', mode: 'add' }],
};
const listed = (r: ReturnType<typeof resolveWithSelections>, typeId: string) => r.availableByType.get(typeId) ?? [];

test('Soy-Based Ink hides the other composition inks, and keeps the effect inks', () => {
  const r = resolveWithSelections(pairwise(), card, noDeps, { 't.ink': ['o.soy'] });
  assert.deepEqual(listed(r, 't.ink'), ['o.soy', 'o.metallic', 'o.pearl']);
});

test('one ink from each group stands together; a second from the same group clashes', () => {
  const ok = resolveWithSelections(pairwise(), card, noDeps, { 't.ink': ['o.soy', 'o.metallic'] });
  assert.deepEqual(ok.invalidated, []);
  assert.deepEqual(listed(ok, 't.ink'), ['o.soy', 'o.metallic']);
  const bad = resolveWithSelections(pairwise(), card, noDeps, { 't.ink': ['o.soy', 'o.water'] });
  assert.deepEqual(bad.invalidated, [{ typeId: 't.ink', optionId: 'o.water', unsatisfied: [], conflictsWith: ['o.soy'] }]);
  assert.deepEqual(bad.selections['t.ink'], ['o.soy'], 'the earlier pick stands');
});

test('Soft Touch hides every Debossing option, and a Debossing option hides Soft Touch', () => {
  const soft = resolveWithSelections(pairwise(), card, noDeps, { 't.finish': ['o.softtouch'] });
  assert.deepEqual(listed(soft, 't.emboss'), ['o.bembo', 'o.bare']);
  const blind = resolveWithSelections(pairwise(), card, noDeps, { 't.emboss': ['o.blind'] });
  assert.deepEqual(listed(blind, 't.finish'), ['o.gloss']);
});

test('a one type keeps listing its own alternatives, so the customer can switch', () => {
  const r = resolveWithSelections(pairwise(), card, noDeps, { 't.finish': ['o.gloss'] });
  assert.deepEqual(listed(r, 't.finish'), ['o.softtouch', 'o.gloss']);
});

test('Textured Embossing & Debossing goes alone', () => {
  const r = resolveWithSelections(pairwise(), card, noDeps, { 't.emboss': ['o.textured'] });
  assert.deepEqual(listed(r, 't.emboss'), ['o.textured', 'o.bare']);
  const other = resolveWithSelections(pairwise(), card, noDeps, { 't.emboss': ['o.bembo'] });
  assert.ok(!listed(other, 't.emboss').includes('o.textured'));
  assert.ok(listed(other, 't.emboss').includes('o.blind'), 'Blind Debossing still combines');
});

test('an option with no pairs recorded neither hides nor is hidden', () => {
  const r = resolveWithSelections(pairwise(), card, noDeps, { 't.emboss': ['o.bare'] });
  assert.deepEqual(r.invalidated, []);
  assert.deepEqual(listed(r, 't.ink'), ['o.soy', 'o.water', 'o.metallic', 'o.pearl']);
});

test('a finish picked first hides the boards it does not work on', () => {
  // The other direction of a requirement: Offset depends on the board, but picking Offset
  // before any board now hides Kraft too, rather than clearing Offset once Kraft is picked.
  const r = resolveWithSelections(catalog(), product, graph, { 't.method': ['o.offset'] });
  assert.deepEqual(r.availableByType.get('t.material'), ['o.sbs']);
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

// ── lookahead: list only what can be picked without clearing anything (PROD-2556) ────────────
// Spot needs a Finish; Embossing pairs with Spot but not with the only Finish Spot can use.
// Pairwise alone lists Embossing — and picking it would hide the Finish and clear Spot.
const joint = (): Catalog => ({
  types: [
    { _id: 't.board', availabilityDecidedBy: 'product' },
    { _id: 't.finish', availabilityDecidedBy: 'customization' },
    { _id: 't.spot', availabilityDecidedBy: 'customization', customerSelects: 'many' },
    { _id: 't.emboss', availabilityDecidedBy: 'customization', customerSelects: 'many' },
  ],
  options: [
    { _id: 'o.board', typeId: 't.board' },
    { _id: 'o.finish', typeId: 't.finish', compatibleCustomizations: ['o.board', 'o.spot'] },
    { _id: 'o.spot', typeId: 't.spot', compatibleCustomizations: ['o.board', 'o.emboss'] },
    { _id: 'o.emboss', typeId: 't.emboss', compatibleCustomizations: ['o.board', 'o.spot'] },
  ],
});
const jointGraph: DependencyGraph = { dependsOn: { 't.finish': ['t.board'], 't.spot': ['t.finish'], 't.emboss': ['t.board'] } };

test('without lookahead an option is listed that would clear an earlier pick', () => {
  const r = resolveWithSelections(joint(), card, jointGraph, { 't.spot': ['o.spot'] });
  assert.deepEqual(r.availableByType.get('t.emboss'), ['o.emboss']);
  const after = resolveWithSelections(joint(), card, jointGraph, { 't.spot': ['o.spot'], 't.emboss': ['o.emboss'] });
  assert.deepEqual(after.invalidated.map((i) => i.optionId), ['o.spot']);
});

test('with lookahead that option is not listed, and the earlier pick is safe', () => {
  const r = resolveWithSelections(joint(), card, jointGraph, { 't.spot': ['o.spot'] }, undefined, { lookahead: true });
  assert.equal(r.availableByType.get('t.emboss'), undefined);
  assert.deepEqual(r.availableByType.get('t.spot'), ['o.spot']);
});
