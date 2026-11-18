import { test } from "node:test";
import assert from "node:assert/strict";
import {
  collectionOfCode,
  countStatuses,
  readinessHref,
  readinessOf,
  readinessParams,
  recordKey,
  recordsOf,
  type ProductTypeChain,
  type RecordRef,
} from "./readiness";
import type { LibraryReviewState, MappingItem } from "./registry-api";

const chains: ProductTypeChain = new Map([
  [
    "PT-FC-ABL",
    [
      {
        collection: "product_type",
        sourceId: "PT-FC-ABL",
        name: "Auto Bottom (Crash Lock)",
      },
      { collection: "template", sourceId: "TPL-GLOBAL", name: "Global" },
      { collection: "template", sourceId: "TPL-FC", name: "Folding carton" },
    ],
  ],
]);

const item = (over: Partial<MappingItem>): MappingItem =>
  ({
    label: "mapped_with_preset",
    state: "approve",
    targets: [
      {
        kind: "product_type",
        sourceId: "PT-FC-ABL",
        name: "Auto Bottom (Crash Lock)",
        setting: null,
        version: 1,
      },
    ],
    presets: [
      {
        label: "Top closure",
        value: "display front",
        sourceId: null,
        version: null,
      },
      {
        label: "Feature",
        value: "carrier",
        sourceId: "CAP-STR-CARRIER",
        version: 1,
      },
    ],
    presetsNeedingCode: 1,
    ...over,
  }) as MappingItem;

const states = (m: Record<string, LibraryReviewState>) => (r: RecordRef) =>
  m[recordKey(r)];

test("records: a product type brings its template chain; coded presets are added once", () => {
  assert.deepEqual(recordsOf(item({}), chains).map(recordKey), [
    "product_type:PT-FC-ABL",
    "template:TPL-GLOBAL",
    "template:TPL-FC",
    "capability:CAP-STR-CARRIER",
  ]);
  // a product type with no chain loaded still counts itself
  assert.deepEqual(
    recordsOf(
      item({
        targets: [
          {
            kind: "product_type",
            sourceId: "PT-FC-PIL",
            name: null,
            setting: null,
            version: 1,
          },
        ],
        presets: [],
      }),
      chains,
    ).map(recordKey),
    ["product_type:PT-FC-PIL"],
  );
  assert.equal(collectionOfCode("FLD-PRT-SIDES"), "field");
  assert.equal(collectionOfCode("CAP-MAT-EPE"), "capability");
});

test("status: gap, then mapping, then library, then ready", () => {
  const all = states({
    "product_type:PT-FC-ABL": "approve",
    "template:TPL-GLOBAL": "approve",
    "template:TPL-FC": "approve",
    "capability:CAP-STR-CARRIER": "approve",
  });
  assert.equal(
    readinessOf(
      item({
        label: "no_equivalent",
        targets: [],
        presets: [],
        presetsNeedingCode: 0,
      }),
      chains,
      all,
    ).status,
    "gap",
  );
  assert.equal(
    readinessOf(item({ state: "reject" }), chains, all).status,
    "gap",
  );
  assert.equal(
    readinessOf(item({ state: "pending" }), chains, all).status,
    "mapping",
  );
  assert.equal(
    readinessOf(item({ state: "defer" }), chains, all).status,
    "mapping",
  );
  // map approved, records approved, but one preset still needs a production code
  const r = readinessOf(item({}), chains, all);
  assert.deepEqual(
    [r.status, r.approved, r.records.length, r.needsCode],
    ["library", 4, 4, 1],
  );
  assert.equal(
    readinessOf(item({ presetsNeedingCode: 0 }), chains, all).status,
    "ready",
  );
  // a record nobody decided (or not found) is not approved
  const some = readinessOf(
    item({ presetsNeedingCode: 0 }),
    chains,
    states({ "product_type:PT-FC-ABL": "approve" }),
  );
  assert.deepEqual([some.status, some.approved], ["library", 1]);
  assert.deepEqual(countStatuses([r, some, { status: "ready" }]), {
    ready: 1,
    mapping: 0,
    library: 2,
    gap: 0,
  });
});

test("params and href", () => {
  assert.deepEqual(readinessParams({}), {
    kind: "product",
    line: "CAT-FC",
    status: null,
  });
  assert.deepEqual(
    readinessParams({ kind: "option", line: "all", status: "nope" }),
    { kind: "option", line: "CAT-FC", status: null },
  );
  assert.equal(
    readinessHref({ kind: "product", line: "CAT-FC", status: null }),
    "/spec/readiness",
  );
  assert.equal(
    readinessHref({ kind: "option", line: "CAT-LS", status: "library" }),
    "/spec/readiness?kind=option&line=CAT-LS&status=library",
  );
});
