/**
 * Pure sandbox engine — ports HTML evaluate() L1–L15 (no DOM).
 */

import {
  findProduct,
  findShape,
  TEXTURED,
  type PrintMode,
} from "./rules-data";

export type SandboxState = {
  product: string;
  shape: string;
  pOut: boolean;
  pIn: boolean;
  pSingle: boolean;
  color: string;
  pcount: number;
  finish: string;
  emboss: string[];
  foiling: boolean;
  foam: boolean;
  covering: string;
};

export type FiredKind = "" | "hide" | "warn";

export type FiredRule = {
  id: string;
  kind: FiredKind;
  /** HTML fragment for the rule-trace message (matches HTML explorer). */
  html: string;
};

export type FormRowState = "shown" | "hidden" | "blocked" | "n/a";

export type FormRow =
  | { label: string; kind: "status"; state: FormRowState }
  | { label: string; kind: "text"; text: string };

export type FormGroup = {
  title: string;
  rows: FormRow[];
};

export type EvaluateResult = {
  fired: FiredRule[];
  formGroups: FormGroup[];
  /** Derived helpers useful for the inputs panel. */
  meta: {
    mode: PrintMode;
    printing: boolean;
    live: boolean;
    isPantone: boolean;
  };
};

export const INITIAL_SANDBOX_STATE: SandboxState = {
  product: "Folding Carton",
  shape: "Rectangular / Cuboid",
  pOut: true,
  pIn: false,
  pSingle: true,
  color: "CMYK Full Color",
  pcount: 1,
  finish: "Uncoated / No Surface Finish",
  emboss: [],
  foiling: false,
  foam: false,
  covering: "None",
};

function modeOf(S: SandboxState): PrintMode {
  return findProduct(S.product)?.print ?? "both";
}

function anyPrint(S: SandboxState, m: PrintMode): boolean {
  if (m === "none") return false;
  if (m === "single") return S.pSingle;
  if (m === "outside") return S.pOut;
  return S.pOut || S.pIn;
}

function isPantone(S: SandboxState): boolean {
  return S.color !== "CMYK Full Color";
}

function hasTextured(S: SandboxState): boolean {
  return S.emboss.includes(TEXTURED);
}

/**
 * Apply setS-style side effects when patching sandbox state (Soft Touch clears
 * incompatible deboss; leaving foam resets covering).
 */
export function patchSandboxState(
  prev: SandboxState,
  patch: Partial<SandboxState>,
): SandboxState {
  const next = { ...prev, ...patch };
  if (patch.finish === "Soft Touch") {
    next.emboss = next.emboss.filter(
      (e) => !(e.includes("Debossing") && e !== TEXTURED),
    );
  }
  if (patch.foam === false) {
    next.covering = "None";
  }
  return next;
}

export function toggleEmboss(prev: SandboxState, value: string): SandboxState {
  if (prev.emboss.includes(value)) {
    return { ...prev, emboss: prev.emboss.filter((x) => x !== value) };
  }
  if (value === TEXTURED) {
    return { ...prev, emboss: [TEXTURED] };
  }
  return {
    ...prev,
    emboss: prev.emboss.filter((x) => x !== TEXTURED).concat(value),
  };
}

export function bumpPcount(prev: SandboxState, delta: number): SandboxState {
  return {
    ...prev,
    pcount: Math.min(3, Math.max(1, prev.pcount + delta)),
  };
}

export function evaluate(S: SandboxState): EvaluateResult {
  const fired: FiredRule[] = [];
  const m = modeOf(S);
  const printing = m !== "none";
  const live = printing && anyPrint(S, m);
  const sh = findShape(S.shape) ?? {
    n: S.shape,
    form: "L × W × H",
    rule: null,
  };

  /* --- printing --- */
  if (m === "outside") {
    fired.push({
      id: "L1",
      kind: "hide",
      html: `<b>${S.product}</b> → “Print Outside” only, no inside printing`,
    });
  }
  if (m === "single") {
    fired.push({
      id: "L2",
      kind: "hide",
      html: `<b>${S.product}</b> → one “Printed?” toggle instead of two`,
    });
  }
  if (m === "none") {
    fired.push({
      id: "L3",
      kind: "hide",
      html: `<b>${S.product}</b> cannot be printed → printing section does not exist`,
    });
  }
  if (printing && !anyPrint(S, m)) {
    fired.push({
      id: "L4",
      kind: "hide",
      html: `All print toggles <b>No</b> → every other printing option hidden`,
    });
  }
  if (live && isPantone(S)) {
    fired.push({
      id: "L5",
      kind: "",
      html: `<b>${S.color}</b> → show Pantone Count + PMS code entries`,
    });
    fired.push({
      id: "L7",
      kind: "",
      html: `Pantone Count <b>${S.pcount}</b> → ${S.pcount} PMS code entr${S.pcount === 1 ? "y" : "ies"}`,
    });
    if (S.pcount >= 3) {
      fired.push({
        id: "L6",
        kind: "",
        html: `Pantone Count at the cap of <b>3</b> — “+” does nothing further`,
      });
    }
  }

  /* --- finishing --- */
  if (S.finish === "Soft Touch") {
    fired.push({
      id: "L8",
      kind: "hide",
      html: `<b>Soft Touch</b> → all debossing options unavailable`,
    });
  }
  if (hasTextured(S)) {
    fired.push({
      id: "L9",
      kind: "hide",
      html: `<b>Textured Emb. &amp; Deb.</b> → every other emb./deb. option unavailable`,
    });
    if (S.finish === "Uncoated / No Surface Finish") {
      fired.push({
        id: "L10",
        kind: "",
        html: `<b>Textured</b> ok — surface finish is Uncoated`,
      });
    } else {
      fired.push({
        id: "L10",
        kind: "warn",
        html: `<b>Textured blocked</b> — needs Uncoated, but finish is ${S.finish}`,
      });
    }
  }
  if (S.foam && S.foiling) {
    const ok = ["Flocking", "Paper Lamination", "Leather Lamination"].includes(
      S.covering,
    );
    fired.push({
      id: "L11",
      kind: ok ? "" : "warn",
      html: ok
        ? `<b>Foiling ok</b> on foam — covering is ${S.covering}`
        : `<b>Foiling blocked</b> on foam — needs Flocking / Paper Lam. / Leather Lam., covering is ${S.covering}`,
    });
  }
  if (S.foam && S.emboss.length) {
    const ok = ["Paper Lamination", "Leather Lamination"].includes(S.covering);
    fired.push({
      id: "L12",
      kind: ok ? "" : "warn",
      html: ok
        ? `<b>Emb./Deb. ok</b> on foam — covering is ${S.covering}`
        : `<b>Emb./Deb. blocked</b> on foam — needs Paper Lam. / Leather Lam., covering is ${S.covering}`,
    });
  }

  /* --- size --- */
  if (S.product === "Tin") {
    fired.push({
      id: "L13",
      kind: "",
      html: `<b>Tin</b> → size mode = stock picklist, or Custom → L × W × H`,
    });
  }
  if (sh.rule) {
    fired.push({
      id: sh.rule,
      kind: "",
      html: `Shape <b>${S.shape}</b> → dimension form ${sh.form}`,
    });
  }

  /* --- resulting form state --- */
  const texBlocked =
    hasTextured(S) && S.finish !== "Uncoated / No Surface Finish";
  const foilBlocked =
    S.foam &&
    S.foiling &&
    !["Flocking", "Paper Lamination", "Leather Lamination"].includes(
      S.covering,
    );
  const embBlocked =
    S.foam &&
    S.emboss.length > 0 &&
    !["Paper Lamination", "Leather Lamination"].includes(S.covering);

  const formGroups: FormGroup[] = [
    {
      title: "Printing",
      rows: [
        {
          label: "Printing section",
          kind: "status",
          state: printing ? "shown" : "hidden",
        },
        {
          label: "“Print Outside” toggle",
          kind: "status",
          state: m === "both" || m === "outside" ? "shown" : "hidden",
        },
        {
          label: "“Print Inside” toggle",
          kind: "status",
          state: m === "both" ? "shown" : "hidden",
        },
        {
          label: "“Printed?” toggle",
          kind: "status",
          state: m === "single" ? "shown" : "hidden",
        },
        {
          label: "Printing Method · Color System · Ink",
          kind: "status",
          state: live ? "shown" : "hidden",
        },
        {
          label: "Pantone Count + PMS codes",
          kind: "status",
          state: live && isPantone(S) ? "shown" : "hidden",
        },
      ],
    },
    {
      title: "Size",
      rows: [
        { label: "Dimension form", kind: "text", text: sh.form },
        {
          label: "Size mode (Tin)",
          kind: "status",
          state: S.product === "Tin" ? "shown" : "hidden",
        },
      ],
    },
    {
      title: "Finishing",
      rows: [
        {
          label: "Debossing options",
          kind: "status",
          state:
            S.finish === "Soft Touch"
              ? "blocked"
              : hasTextured(S)
                ? "blocked"
                : "shown",
        },
        {
          label: "Other emb./deb. options",
          kind: "status",
          state: hasTextured(S) ? "blocked" : "shown",
        },
        {
          label: "Textured Emb. & Deb.",
          kind: "status",
          state: texBlocked ? "blocked" : hasTextured(S) ? "shown" : "n/a",
        },
        {
          label: "Foiling",
          kind: "status",
          state: foilBlocked ? "blocked" : S.foiling ? "shown" : "n/a",
        },
        {
          label: "Embossing on foam",
          kind: "status",
          state: embBlocked
            ? "blocked"
            : S.foam && S.emboss.length
              ? "shown"
              : "n/a",
        },
      ],
    },
  ];

  return {
    fired,
    formGroups,
    meta: {
      mode: m,
      printing,
      live,
      isPantone: isPantone(S),
    },
  };
}

/** Whether an emboss chip should appear dead in the inputs panel. */
export function isEmbossDead(S: SandboxState, option: string): boolean {
  const on = S.emboss.includes(option);
  const blockedByTex = hasTextured(S) && option !== TEXTURED;
  const blockedBySoft =
    S.finish === "Soft Touch" &&
    option.includes("Debossing") &&
    option !== TEXTURED;
  return (blockedByTex || blockedBySoft) && !on;
}
