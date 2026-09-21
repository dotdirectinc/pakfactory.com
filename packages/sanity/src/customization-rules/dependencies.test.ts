import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDependencyGraph, type CatalogWithDependencies } from "./dependencies.ts";

// The shape the board states: Materials is a CATEGORY of many types, and Printing Method is
// decided by any of them; Colour System is decided by one type.
const catalog = (): CatalogWithDependencies => ({
  types: [
    { _id: 't.paperboard', title: 'Paperboard', categoryId: 'c.materials', availabilityDecidedBy: 'product' },
    { _id: 't.chipboard', title: 'Chipboard', categoryId: 'c.materials', availabilityDecidedBy: 'product' },
    { _id: 't.method', title: 'Printing Method', categoryId: 'c.printing', availabilityDecidedBy: 'customization', dependsOn: ['c.materials'] },
    { _id: 't.colour', title: 'Colour System', categoryId: 'c.printing', availabilityDecidedBy: 'customization', dependsOn: ['t.method'] },
  ],
  options: [],
});

test('a category becomes every type in it', () => {
  const { dependsOn } = buildDependencyGraph(catalog());
  assert.deepEqual(dependsOn['t.method'], ['t.chipboard', 't.paperboard']);
});

test('a type reference stays that one type', () => {
  const { dependsOn } = buildDependencyGraph(catalog());
  assert.deepEqual(dependsOn['t.colour'], ['t.method']);
});

test('a mixed list expands the category and keeps the type', () => {
  const input = catalog();
  input.types.push({
    _id: 't.spot', title: 'Spot Coating', categoryId: 'c.finishing',
    availabilityDecidedBy: 'customization', dependsOn: ['c.materials', 't.method'],
  });
  const { dependsOn } = buildDependencyGraph(input);
  assert.deepEqual(dependsOn['t.spot'], ['t.chipboard', 't.method', 't.paperboard']);
});

test('its own category means its siblings, never itself', () => {
  // Colour System and Printing Method share the Printing category. Naming that category is a
  // real answer — the siblings gate it — as long as the type itself drops out.
  const input = catalog();
  input.types.find((t) => t._id === 't.colour')!.dependsOn = ['c.printing'];
  const { dependsOn } = buildDependencyGraph(input);
  assert.deepEqual(dependsOn['t.colour'], ['t.method']);
  assert.ok(!(dependsOn['t.colour'] ?? []).includes('t.colour'));
});

test('a dependency that expands to nothing is reported rather than half-applied', () => {
  // A category whose only member is this type. It reads like an answer and is not one:
  // without the report the rules would silently treat the type as unconstrained.
  const input = catalog();
  input.types.push({
    _id: 't.lonely', title: 'Lonely', categoryId: 'c.lonely',
    availabilityDecidedBy: 'customization', dependsOn: ['c.lonely'],
  });
  const { dependsOn, resolvedToNothing } = buildDependencyGraph(input);
  assert.deepEqual(resolvedToNothing, ['t.lonely']);
  assert.equal(dependsOn['t.lonely'], undefined);
});

test('a reference to neither a type nor a category is reported and ignored', () => {
  const input = catalog();
  input.types.find((t) => t._id === 't.colour')!.dependsOn = ['t.method', 'c.deleted'];
  const { dependsOn, unknownReferences } = buildDependencyGraph(input);
  assert.deepEqual(unknownReferences, ['c.deleted']);
  assert.deepEqual(dependsOn['t.colour'], ['t.method']);
});

test('dependencies on a product-decided type are ignored and named', () => {
  const input = catalog();
  input.types.find((t) => t._id === 't.paperboard')!.dependsOn = ['c.printing'];
  const { dependsOn, ignoredOnProductDecided } = buildDependencyGraph(input);
  assert.deepEqual(ignoredOnProductDecided, ['t.paperboard']);
  assert.equal(dependsOn['t.paperboard'], undefined);
});

test('a type with nothing stated is absent from the graph, not present and empty', () => {
  // resolveForProduct treats "no entry" as unconstrained and says so. An empty array would
  // read as "depends on nothing", which is a different claim.
  const input = catalog();
  delete input.types.find((t) => t._id === 't.method')!.dependsOn;
  const { dependsOn } = buildDependencyGraph(input);
  assert.ok(!('t.method' in dependsOn));
});

test('a self-reference that survived in the data is dropped', () => {
  const input = catalog();
  input.types.find((t) => t._id === 't.colour')!.dependsOn = ['t.colour', 't.method'];
  const { dependsOn } = buildDependencyGraph(input);
  assert.deepEqual(dependsOn['t.colour'], ['t.method']);
});
