import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SummaryCatalog, SummaryProduct } from "@pakfactory/sanity/customization-rules/summary";
import { applyEdits, blockingErrors, computeImpact, describeEdit, editKey, isMove, type RuleEditDraft } from "./rule-edits";
import { typeidToUuid } from "./typeid";

// Matte/Gloss are Finish (decided by other customizations, pick one); Kraft/White are Material
// (each product lists them). Matte goes on Kraft; the Mailer lists Kraft, so it derives Matte.
const catalog = (): SummaryCatalog => ({
  types: [
    { _id: "finish", title: "Finish", availabilityDecidedBy: "customization", customerSelects: "one" },
    { _id: "material", title: "Material", availabilityDecidedBy: "product", customerSelects: "one" },
  ],
  options: [
    { _id: "matte", title: "Matte", typeId: "finish", compatibleCustomizations: ["kraft"] },
    { _id: "gloss", title: "Gloss", typeId: "finish", compatibleCustomizations: [] },
    { _id: "kraft", title: "Kraft", typeId: "material", compatibleCustomizations: [] },
    { _id: "white", title: "White", typeId: "material", compatibleCustomizations: [] },
  ],
});
const products = (): SummaryProduct[] => [{ _id: "mailer", title: "Mailer", availableCustomizations: [{ optionId: "kraft" }], customizationExceptions: [] }];
const names = (id: string) => ({ matte: "Matte", gloss: "Gloss", kraft: "Kraft", white: "White", mailer: "Mailer", finish: "Finish", material: "Material" })[id] ?? id;
const impact = (edits: RuleEditDraft[]) => computeImpact(catalog(), products(), edits, names);

describe("rule edits — impact check", () => {
  it("removing a pair: the product loses the option, and the option is left with no partners", () => {
    const r = impact([{ kind: "pair", a: "matte", b: "kraft", compatible: false }]);
    assert.deepEqual(r.errors, []);
    assert.deepEqual(r.products, [{ id: "mailer", title: "Mailer", gained: [], lost: ["matte"] }]);
    assert.deepEqual(r.totals, { products: 1, gained: 0, lost: 1 });
    assert.deepEqual(r.warnings.map((w) => w.code), ["loses-options", "no-partners", "no-partners"]);
  });

  it("offering a product-decided option: the product gains it, nothing to acknowledge", () => {
    const r = impact([{ kind: "offer", productId: "mailer", optionId: "white", offered: true }]);
    assert.deepEqual(r.products[0]?.gained, ["white"]);
    assert.deepEqual(r.warnings, []);
  });

  it("a remove exception takes a derived option off one product", () => {
    const r = impact([{ kind: "exception", productId: "mailer", optionId: "matte", mode: "remove", reason: "Too thin" }]);
    assert.deepEqual(r.products[0]?.lost, ["matte"]);
  });

  it("does not touch its inputs", () => {
    const c = catalog();
    applyEdits(c, products(), [{ kind: "pair", a: "matte", b: "kraft", compatible: false }]);
    assert.deepEqual(c.options[0]?.compatibleCustomizations, ["kraft"]);
  });
});

describe("rule edits — Studio's blocking rules", () => {
  const errs = (edits: RuleEditDraft[]) => blockingErrors(catalog(), products(), edits, names);
  it("refuses a self-pair, and a pair inside a pick-one type unless the set makes it pick-several", () => {
    assert.match(errs([{ kind: "pair", a: "matte", b: "matte", compatible: true }])[0]!, /itself/);
    assert.match(errs([{ kind: "pair", a: "matte", b: "gloss", compatible: true }])[0]!, /pick one/);
    assert.deepEqual(errs([{ kind: "typeSettings", typeId: "finish", customerSelects: "many" }, { kind: "pair", a: "matte", b: "gloss", compatible: true }]), []);
  });
  it("offers only product-decided options; exceptions only the others, with a reason", () => {
    assert.match(errs([{ kind: "offer", productId: "mailer", optionId: "matte", offered: true }])[0]!, /use an exception/);
    assert.match(errs([{ kind: "exception", productId: "mailer", optionId: "white", mode: "add", reason: "x" }])[0]!, /listed per product/);
    assert.match(errs([{ kind: "exception", productId: "mailer", optionId: "gloss", mode: "add", reason: " " }])[0]!, /needs a reason/);
    assert.match(errs([{ kind: "offer", productId: "preset", optionId: "white", offered: true }])[0]!, /not a standard product/);
  });
  it("refuses a type depending on itself", () => {
    assert.match(errs([{ kind: "requirements", typeId: "finish", groups: [["finish"]] }])[0]!, /itself/);
  });
});

describe("rule edits — sentences and keys", () => {
  it("writes one sentence per change, and one key per thing changed", () => {
    assert.equal(describeEdit({ kind: "pair", a: "matte", b: "kraft", compatible: false }, names), "Matte and Kraft are no longer compatible");
    assert.equal(describeEdit({ kind: "requirements", typeId: "finish", groups: [["material"], ["kraft", "white"]] }, names), "Finish depends on (Material) and (Kraft or White)");
    assert.equal(editKey({ kind: "pair", a: "kraft", b: "matte", compatible: true }), editKey({ kind: "pair", a: "matte", b: "kraft", compatible: false }));
  });
});

describe("typeid → uuid", () => {
  it("matches the backend's parseTypeid", () => {
    // Reference values from pakfactory.com-server scripts/lib/entity-id.mjs (typeidOf / parseTypeid).
    assert.deepEqual(typeidToUuid("opt_01kw000000e008000000000010"), { kind: "opt", uuid: "019f0000-0000-7000-8000-000000000020" });
    assert.deepEqual(typeidToUuid("opt_01k5f3mz0xfw08mazzzzzzzzzz"), { kind: "opt", uuid: "01995e3a-7c1d-7f00-8a2b-ffffffffffff" });
    assert.equal(typeidToUuid("not-an-id"), null);
    assert.equal(typeidToUuid(undefined), null);
  });
});

describe("rule edits — the diagram's preview and edits", () => {
  it("names how the product offers each option, before and after", async () => {
    const { focusAfter } = await import("./rule-edits");
    const before = focusAfter(catalog(), products(), [], { level: "product", id: "mailer" });
    assert.deepEqual(before, { level: "product", id: "mailer", options: [{ id: "matte", state: "derived" }, { id: "kraft", state: "listed" }], exceptions: [] });
    // A remove exception keeps the option on the map, as "removed", and lists the exception.
    const removed = focusAfter(catalog(), products(), [{ kind: "exception", productId: "mailer", optionId: "matte", mode: "remove", reason: "Too thin" }], { level: "product", id: "mailer" });
    assert.ok(removed?.level === "product" && removed.options.some((o) => o.id === "matte" && o.state === "removed"));
    assert.deepEqual(removed?.level === "product" && removed.exceptions, [{ optionId: "matte", mode: "remove", reason: "Too thin" }]);
    const after = focusAfter(catalog(), products(), [{ kind: "exception", productId: "mailer", optionId: "gloss", mode: "add", reason: "OK" }], { level: "product", id: "mailer" });
    assert.ok(after?.level === "product" && after.options.some((o) => o.id === "gloss" && o.state === "added"));
    assert.deepEqual(focusAfter(catalog(), products(), [{ kind: "pair", a: "matte", b: "kraft", compatible: false }], { level: "customizationOption", id: "matte" }),
      { level: "customizationOption", id: "matte", products: [], compatible: [] });
  });
  it("turns 'offer it / take it away' into an offer for product-decided options and an exception otherwise", async () => {
    const { offerEdit } = await import("./rule-edits");
    const meta = { optionType: { matte: "finish", kraft: "material" }, decidedBy: { finish: "customization" as const, material: "product" as const }, standard: ["mailer"], addExceptions: [], removeExceptions: ["mailer|matte"] };
    assert.deepEqual(offerEdit(meta, "mailer", "kraft", false), { kind: "offer", productId: "mailer", optionId: "kraft", offered: false });
    assert.deepEqual(offerEdit({ ...meta, removeExceptions: [] }, "mailer", "matte", false), { kind: "exception", productId: "mailer", optionId: "matte", mode: "remove", reason: "" });
    assert.deepEqual(offerEdit(meta, "mailer", "matte", true), { kind: "exception", productId: "mailer", optionId: "matte", mode: "remove", reason: null });
    assert.equal(offerEdit(meta, "preset", "kraft", true), null);
  });
});

describe("rule edits — effect-first sentences, no-effect edits, map buttons (2026-10-14)", () => {
  it("says what each exception does to the offer, and flags one that changes nothing", () => {
    const withRemove = (): SummaryProduct[] => [{ ...products()[0]!, customizationExceptions: [{ optionId: "matte", mode: "remove", reason: "Too thin" }] }];
    const again = computeImpact(catalog(), withRemove(), [{ kind: "exception", productId: "mailer", optionId: "matte", mode: "remove", reason: null }], names);
    assert.equal(again.sentences[0], 'Mailer offers Matte again — drops the "remove" exception');
    assert.deepEqual(again.noEffect, []);
    const redundant = computeImpact(catalog(), products(), [{ kind: "exception", productId: "mailer", optionId: "matte", mode: "add", reason: "x" }], names);
    assert.match(redundant.sentences[0]!, /no change — a "add" exception for Matte has no effect \(the rules already give it\)/);
    assert.deepEqual(redundant.noEffect, ["exc:mailer:matte"]);
    const removes = computeImpact(catalog(), products(), [{ kind: "exception", productId: "mailer", optionId: "matte", mode: "remove", reason: "" }], names);
    assert.equal(removes.sentences[0], "Mailer no longer offers Matte — by exception: reason needed");
  });
  it("a map button makes exactly the edit its card shows, or refuses when the card is out of date", async () => {
    const { mapEdit } = await import("./rule-edits");
    const meta = { optionType: {}, decidedBy: {}, standard: ["mailer"], addExceptions: [], removeExceptions: [] };
    // The 15:35 case: "offer again" on a card still shown as removed, after the exception was already dropped.
    assert.deepEqual(mapEdit(meta, "mailer", "matte", "offerAgain", "removed"), { ok: false, reason: "stale" });
    assert.deepEqual(mapEdit({ ...meta, removeExceptions: ["mailer|matte"] }, "mailer", "matte", "offerAgain", "removed"),
      { ok: true, edit: { kind: "exception", productId: "mailer", optionId: "matte", mode: "remove", reason: null } });
    assert.deepEqual(mapEdit(meta, "mailer", "matte", "stop", "derived"),
      { ok: true, edit: { kind: "exception", productId: "mailer", optionId: "matte", mode: "remove", reason: "" } });
    assert.deepEqual(mapEdit(meta, "mailer", "kraft", "stop", "listed"), { ok: true, edit: { kind: "offer", productId: "mailer", optionId: "kraft", offered: false } });
    assert.deepEqual(mapEdit(meta, "preset", "kraft", "stop", "listed"), { ok: false, reason: "not-standard" });
  });
});

describe("rule edits — inspiration products (2026-10-14)", () => {
  it("warns when a base product would stop offering an option an inspiration product pre-selects", () => {
    const insp = [{ _id: "gift", title: "Gift Mailer", basedOn: "mailer", preselected: ["matte", "kraft"] }, { _id: "other", title: "Plain", basedOn: "mailer", preselected: ["kraft"] }];
    const r = computeImpact(catalog(), products(), [{ kind: "pair", a: "matte", b: "kraft", compatible: false }], names, insp);
    const w = r.warnings.find((x) => x.code === "preselection-lost");
    assert.ok(w);
    assert.match(w.text, /^1 inspiration product pre-selects an option its base would no longer offer: Gift Mailer \(Matte\)/);
    assert.equal(computeImpact(catalog(), products(), [{ kind: "offer", productId: "mailer", optionId: "white", offered: true }], names, insp).warnings.length, 0);
  });
});

describe("rule edits — an option's compatible options after the edits", () => {
  it("lists them from either side of the pair", async () => {
    const { focusAfter } = await import("./rule-edits");
    const f = focusAfter(catalog(), products(), [{ kind: "pair", a: "white", b: "matte", compatible: true }], { level: "customizationOption", id: "matte" });
    assert.deepEqual(f?.level === "customizationOption" && [...f.compatible].sort(), ["kraft", "white"]);
  });
});

describe("structure moves in the pending set (PROD-3007)", () => {
  it("one tray entry per moved record: a later move of the same record replaces the earlier", () => {
    const a: RuleEditDraft = { kind: "placement", productId: "mailer", lineId: "boxes", styleIds: ["tuck"] };
    const b: RuleEditDraft = { kind: "placement", productId: "mailer", lineId: "bags", styleIds: ["pouch", "flat"] };
    assert.equal(editKey(a), editKey(b));
    assert.notEqual(editKey(a), editKey({ kind: "solutions", productId: "mailer", solutionIds: [] }));
    assert.equal(describeEdit(b, names), "Mailer → bags · pouch, flat (primary pouch)");
    assert.equal(isMove(b), true);
    assert.equal(isMove({ kind: "offer", productId: "mailer", optionId: "kraft", offered: true }), false);
  });

  it("a solution style's move (PROD-3095): one tray entry per style, a sentence, never in the rules", () => {
    const a: RuleEditDraft = { kind: "solutionStyleSolution", styleId: "sty", solutionId: "tea" };
    const b: RuleEditDraft = { kind: "solutionStyleSolution", styleId: "sty", solutionId: "coffee" };
    assert.equal(editKey(a), editKey(b));
    assert.equal(isMove(a), true);
    assert.equal(describeEdit(a, (id) => ({ sty: "Coffee Bags", tea: "Tea" })[id] ?? id), "Solution style Coffee Bags → solution Tea");
  });

  it("a product's line, styles and solutions do not enter the rules: no offer changes, a sentence each", () => {
    const r = impact([
      { kind: "placement", productId: "mailer", lineId: "bags", styleIds: ["pouch"] },
      { kind: "styleLine", styleId: "tuck", lineId: "bags" },
      { kind: "solutions", productId: "mailer", solutionIds: ["coffee"] },
    ]);
    assert.deepEqual(r.totals, { products: 0, gained: 0, lost: 0 });
    assert.equal(r.sentences.length, 3);
    assert.deepEqual(r.errors, []);
  });

  it("an option moving type changes how it is offered: Matte under Material must be listed by the product", () => {
    const r = impact([{ kind: "optionType", optionId: "matte", typeId: "material" }]);
    assert.deepEqual(r.products, [{ id: "mailer", title: "Mailer", gained: [], lost: ["matte"] }]);
    assert.equal(applyEdits(catalog(), products(), [{ kind: "typeCategory", typeId: "finish", categoryId: "addons" }]).catalog.types[0]!.categoryId, "addons");
  });

  it("a new base must offer what the inspiration product pre-selects", () => {
    const prods = [...products(), { _id: "box", title: "Box", availableCustomizations: [], customizationExceptions: [] }];
    const insp = [{ _id: "gift", title: "Gift Mailer", basedOn: "mailer", preselected: ["kraft"] }];
    const r = computeImpact(catalog(), prods, [{ kind: "basedOn", productId: "gift", baseId: "box" }], names, insp);
    assert.deepEqual(r.warnings.map((w) => w.text), ["Gift Mailer pre-selects Kraft, which box does not offer. Change its pre-selections in Studio."]);
    assert.equal(computeImpact(catalog(), prods, [{ kind: "basedOn", productId: "gift", baseId: "mailer" }], names, insp).warnings.length, 0);
  });
});
