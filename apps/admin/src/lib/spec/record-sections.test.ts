import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { RefInfo } from "./catalog-table-model";
import { groupsOf, recordSections } from "./record-sections";

const ref = (id: string) => ({ _ref: id, _type: "reference" });
const refs = new Map<string, RefInfo>([
  ["matte", { title: "Matte", href: "/spec/catalog/customizationOption/matte", group: "Finishing › Finish" }],
  ["gloss", { title: "Gloss", href: "/spec/catalog/customizationOption/gloss", group: "Finishing › Finish" }],
  ["kraft", { title: "Kraft", href: "/spec/catalog/customizationOption/kraft", group: "Materials › Paperboard" }],
  ["prop-shape", { title: "Shape", href: null }],
  ["pv-round", { title: "Round", href: "/spec/catalog/productValue/pv-round", group: "Shape" }],
  ["pv-square", { title: "Square", href: "/spec/catalog/productValue/pv-square", group: "Shape" }],
  ["term", { title: "Flocking (glossary)", href: null }],
]);

describe("groupsOf", () => {
  it("groups options by Category › Type and tags pre-selected ones", () => {
    const g = groupsOf(
      [
        { _type: "availableCustomization", customization: ref("matte"), preselected: true },
        { _type: "availableCustomization", customization: ref("kraft") },
        { _type: "availableCustomization", customization: ref("gloss") },
      ],
      refs,
    );
    assert.deepEqual(g.map((x) => [x.title, x.items.map((i) => i.title)]), [
      ["Finishing › Finish", ["Gloss", "Matte"]],
      ["Materials › Paperboard", ["Kraft"]],
    ]);
    assert.deepEqual(g[0]!.items.find((i) => i.title === "Matte")!.tags, ["pre-selected"]);
  });

  it("shows a product's properties as property → values", () => {
    const g = groupsOf([{ _type: "productProperty", property: ref("prop-shape"), values: [ref("pv-square"), ref("pv-round")] }], refs);
    assert.deepEqual(g, [
      {
        title: "Shape",
        items: [
          { title: "Round", href: "/spec/catalog/productValue/pv-round", published: true, tags: [] },
          { title: "Square", href: "/spec/catalog/productValue/pv-square", published: true, tags: [] },
        ],
      },
    ]);
  });

  it("keeps an exception's mode and reason", () => {
    const [g] = groupsOf([{ customization: ref("matte"), mode: "remove", reason: " Not on kraft " }, { customization: ref("kraft"), mode: "add" }], refs);
    assert.equal(g!.title, "Finishing › Finish");
    assert.deepEqual(g!.items[0], { title: "Matte", href: "/spec/catalog/customizationOption/matte", published: true, tags: ["remove"], note: "Not on kraft" });
  });

  it("orders links, then names with no Spec page, then unpublished references", () => {
    const [g] = groupsOf([ref("missing"), ref("term"), ref("matte")], new Map([...refs].map(([k, v]) => [k, { ...v, group: null }])));
    assert.deepEqual(g!.items.map((i) => [i.title, Boolean(i.href), i.published]), [
      ["Matte", true, true],
      ["Flocking (glossary)", false, true],
      ["(not published)", false, false],
    ]);
  });

  it("does not group a single reference", () => {
    assert.deepEqual(groupsOf(ref("matte"), refs).map((g) => g.title), [null]);
  });
});

describe("recordSections", () => {
  it("puts fields in sections in page order and leaves empty sections out", () => {
    const s = recordSections(
      { _id: "p", title: "Mailer", metaTitle: "Buy", availableCustomizations: [{ customization: ref("matte") }], sku: "M-1", mystery: 1, _createdAt: "2026-10-01" },
      refs,
    );
    assert.deepEqual(s.map((x) => [x.key, x.fields.map((f) => f.key)]), [
      ["overview", ["title"]],
      ["customizations", ["availableCustomizations"]],
      ["specs", ["sku"]],
      ["seo", ["metaTitle"]],
      ["system", ["_createdAt"]],
      ["other", ["mystery"]],
    ]);
  });
});
