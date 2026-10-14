import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAP_OPTION_PROPERTY, MAP_PROPERTY, buildSpecMap } from "./spec-map";

const card = (_id: string, title = _id) => ({ _id, title, status: "active" });
type Raw = Parameters<typeof buildSpecMap>[0];

const raw = (): Raw => ({
  productLine: [card("line")],
  productStyle: [{ ...card("style"), up: ["line"] }],
  product: [{ ...card("box"), styles: ["style"], line: "line", values: ["v-round"], props: ["p-shape"] }],
  property: [card("p-shape"), card("p-feel")],
  customizationCategory: [card("cat")],
  customizationType: [{ ...card("finish"), up: ["cat"], declares: ["p-feel"] }],
  customizationOption: [{ ...card("matte"), up: ["finish"], values: ["v-soft"] }],
  solution: [card("sol")],
  solutionStyle: [
    { ...card("sty-kw"), up: ["sol"], filter: { keywords: ["gift box"] } },
    { ...card("sty-line"), up: ["sol"], filter: { productLines: [{ _ref: "line" }] }, excluded: [{ _ref: "insp-b" }] },
  ],
  inspiration: [
    { ...card("insp-a", "Gift Boxes for Tea"), up: ["sol"], basedOn: "box", line: "line", styles: [] },
    { ...card("insp-b", "Plain Mailer"), up: ["sol"], basedOn: "box", line: "line", styles: [] },
  ],
  values: [
    { ...card("v-round"), property: "Shape", propertyId: "p-shape" },
    { ...card("v-soft"), property: "Feel", propertyId: "p-feel" },
  ],
});

const arrows = (m: ReturnType<typeof buildSpecMap>) =>
  m.edges.map(([a, b]) => `${m.nodes[a]!.level}:${m.nodes[a]!.id} → ${m.nodes[b]!.level}:${m.nodes[b]!.id}`).sort();

describe("buildSpecMap — arrows start where the relation is defined", () => {
  const m = buildSpecMap(raw(), "development");
  const a = arrows(m);

  it("an option points at the values it lists; its type points at the properties it declares", () => {
    assert.ok(a.includes("customizationOption:matte → optionValue:v-soft"));
    assert.ok(a.includes(`customizationType:finish → ${MAP_OPTION_PROPERTY}:p-feel`));
    assert.ok(!a.some((x) => x.startsWith("customizationOption:matte → " + MAP_OPTION_PROPERTY)));
  });

  it("a product points at the properties it states, and reaches its values through `stated`", () => {
    assert.ok(a.includes(`product:box → ${MAP_PROPERTY}:p-shape`));
    assert.ok(a.includes(`${MAP_PROPERTY}:p-shape → productValue:v-round`));
    assert.deepEqual(m.stated.map(([p, v]) => [m.nodes[p]!.id, m.nodes[v]!.id]), [["box", "v-round"]]);
  });

  it("a solution style points at the inspiration products its filter matches, minus exclusions", () => {
    assert.ok(a.includes("solutionStyle:sty-kw → inspiration:insp-a"));
    assert.ok(!a.includes("solutionStyle:sty-kw → inspiration:insp-b"));
    assert.ok(a.includes("solutionStyle:sty-line → inspiration:insp-a"));
    assert.ok(!a.includes("solutionStyle:sty-line → inspiration:insp-b"));
  });

  it("draws each arrow once", () => {
    assert.equal(new Set(a).size, a.length);
  });
});
