import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SummaryCatalog, SummaryProduct } from "@pakfactory/sanity/customization-rules/summary";
import { applyEdits, blockingErrors, computeImpact, describeEdit, editKey, type RuleEditDraft } from "./rule-edits";
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
      { level: "customizationOption", id: "matte", products: [] });
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
