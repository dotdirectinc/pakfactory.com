import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRows, differs, groupRows, rowKey, settlePending, visibleRows } from "./option-frame-rows";

// The proposal: SBS (standard) and Foam (from Studio). Kraft is a candidate only.
const proposal = [
  { id: "sbs", label: "SBS", standard: true, studio: false, share: 1 },
  { id: "foam", label: "Foam", standard: false, studio: true, share: null },
];
const candidates = [
  { id: "sbs", label: "SBS", group: "Materials · Board" },
  { id: "kraft", label: "Kraft", group: "Materials · Board" },
  { id: "foam", label: "Foam", group: "Inserts · Insert" },
];
const edit = (target: string, selected: boolean, by = "Crystal") => ({ kind: "pair" as const, target, selected, reason: null, by, at: "2026-10-26T15:00:00Z" });

describe("an option Register frame's rows (PROD-3167)", () => {
  it("starts from the proposal; candidates are there, unticked", () => {
    const rows = buildRows("pair", proposal, candidates, [], new Map());
    assert.deepEqual(rows.map((r) => [r.id, r.selected, r.proposed]), [["sbs", true, true], ["kraft", false, false], ["foam", true, true]]);
  });

  it("lays the saved edits over it, attributed, and this browser's unsaved clicks over those", () => {
    const rows = buildRows("pair", proposal, candidates, [edit("sbs", false), edit("kraft", true, "Eric")], new Map([[rowKey("pair", "foam"), { selected: false }]]));
    const by = Object.fromEntries(rows.map((r) => [r.id, r]));
    assert.deepEqual([by.sbs!.selected, by.sbs!.edit?.by], [false, "Crystal"]);
    assert.deepEqual([by.kraft!.selected, by.kraft!.edit?.by], [true, "Eric"]);
    assert.deepEqual([by.foam!.selected, by.foam!.saving], [false, true]);
    // An offer edit does not touch the pairs.
    assert.equal(buildRows("pair", proposal, candidates, [{ ...edit("sbs", false), kind: "offer" }], new Map())[0]!.selected, true);
  });

  it("lists what differs from the standard set: a standard row left out, any other row kept", () => {
    const rows = buildRows("pair", proposal, candidates, [edit("sbs", false), edit("kraft", true)], new Map());
    assert.deepEqual(rows.filter(differs).map((r) => r.id).sort(), ["foam", "kraft", "sbs"]);
  });

  it("filters, searches every row, and groups with selected counts", () => {
    const rows = buildRows("pair", proposal, candidates, [], new Map());
    assert.deepEqual(visibleRows(rows, "proposed", "").map((r) => r.id), ["sbs", "foam"]);
    assert.deepEqual(visibleRows(rows, "all", "").length, 3);
    assert.deepEqual(visibleRows(rows, "proposed", "kra").map((r) => r.id), ["kraft"]);
    assert.deepEqual(visibleRows(rows, "proposed", "inserts").map((r) => r.id), ["foam"]);
    assert.deepEqual(groupRows(rows).map((g) => [g.group, g.rows.map((r) => r.id), g.selected]), [
      ["Inserts · Insert", ["foam"], 1],
      ["Materials · Board", ["kraft", "sbs"], 1],
    ]);
  });

  it("keeps a click until a read at or after its save's revision (guard 1)", () => {
    const pending = new Map([["pair:a", { selected: true, rev: null }], ["pair:b", { selected: false, rev: 7 }], ["pair:c", { selected: true, rev: 5 }]]);
    // A read that started before save 7 landed (revision 6) must not flip b back.
    assert.deepEqual([...settlePending(pending, 6).keys()], ["pair:a", "pair:b"]);
    assert.deepEqual([...settlePending(pending, 7).keys()], ["pair:a"]);
  });
});
