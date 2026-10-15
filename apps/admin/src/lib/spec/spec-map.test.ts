import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAP_OPTION_PROPERTY, MAP_PROPERTY, applyMovesToMap, buildSpecMap, dropMove } from "./spec-map";

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

describe("moves on the map (PROD-3007)", () => {
  const twoLines = (): Raw => {
    const r = raw();
    r.productLine.push(card("line2"));
    r.productStyle.push({ ...card("style2"), up: ["line2"] });
    r.solution.push(card("sol2"));
    r.customizationCategory.push(card("cat2"));
    return r;
  };
  const idx = (d: ReturnType<typeof buildSpecMap>, level: string, id: string) => d.nodes.findIndex((n) => n.level === level && n.id === id);
  const parents = (d: ReturnType<typeof buildSpecMap>, level: string, id: string) =>
    d.edges.filter(([, c]) => c === idx(d, level, id)).map(([a]) => `${d.nodes[a]!.level}:${d.nodes[a]!.id}`).sort();

  it("a moved record hangs under its new parent; what is under it follows untouched", () => {
    const d = buildSpecMap(twoLines(), "development");
    const { data, moved } = applyMovesToMap(d, [{ kind: "styleLine", styleId: "style", lineId: "line2" }]);
    assert.deepEqual(parents(data, "productStyle", "style"), ["productLine:line2"]);
    assert.deepEqual(parents(data, "product", "box"), ["productStyle:style"]);
    assert.deepEqual([...moved], [idx(d, "productStyle", "style")]);
    assert.deepEqual(parents(d, "productStyle", "style"), ["productLine:line"]); // the input is untouched
  });

  it("every kind of move redraws its record", () => {
    const d = buildSpecMap(twoLines(), "development");
    const { data } = applyMovesToMap(d, [
      { kind: "placement", productId: "box", lineId: "line2", styleIds: ["style2"] },
      { kind: "optionType", optionId: "matte", typeId: "finish" },
      { kind: "typeCategory", typeId: "finish", categoryId: "cat2" },
      { kind: "solutions", productId: "insp-a", solutionIds: ["sol2"] },
    ]);
    assert.deepEqual(parents(data, "product", "box"), ["productStyle:style2"]);
    assert.deepEqual(parents(data, "customizationType", "finish"), ["customizationCategory:cat2"]);
    assert.ok(parents(data, "inspiration", "insp-a").includes("solution:sol2"));
    assert.ok(!parents(data, "inspiration", "insp-a").includes("solution:sol"));
  });

  it("a drop makes the move for that pair of columns, the dropped-on style or solution primary", () => {
    const d = buildSpecMap(twoLines(), "development");
    const node = (level: string, id: string) => d.nodes[idx(d, level, id)]!;
    const lineOf = (s: string) => ({ style: "line", style2: "line2" })[s];
    assert.deepEqual(dropMove(node("product", "box"), node("productStyle", "style2"), { lineOf, styleIds: ["style"] }),
      { kind: "placement", productId: "box", lineId: "line2", styleIds: ["style2"] });
    assert.deepEqual(dropMove(node("inspiration", "insp-a"), node("solution", "sol2"), { lineOf, solutionIds: ["sol"] }),
      { kind: "solutions", productId: "insp-a", solutionIds: ["sol2", "sol"] });
    assert.equal(dropMove(node("product", "box"), node("productLine", "line2"), { lineOf }), null);
    assert.deepEqual(dropMove(node("productStyle", "style"), node("productLine", "line2"), { lineOf }), { kind: "styleLine", styleId: "style", lineId: "line2" });
  });
});
