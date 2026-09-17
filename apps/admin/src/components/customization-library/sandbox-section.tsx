"use client";

import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@pakfactory/ui/lib/utils";
import {
  COLORS,
  COVERINGS,
  EMBOSS,
  FINISHES,
  PRODUCTS,
  SHAPES,
} from "@/lib/customization/rules-data";
import {
  INITIAL_SANDBOX_STATE,
  bumpPcount,
  evaluate,
  isEmbossDead,
  patchSandboxState,
  toggleEmboss,
  type SandboxState,
} from "@/lib/customization/sandbox-engine";

const STATUS_LABEL: Record<string, string> = {
  shown: "Show",
  hidden: "Hidden",
  blocked: "Blocked",
  "n/a": "—",
};

function Chip({
  label,
  on,
  dead,
  extra,
  onClick,
}: {
  label: string;
  on?: boolean;
  dead?: boolean;
  extra?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <span
      role="button"
      tabIndex={dead ? -1 : 0}
      className={cn(
        "cursor-pointer select-none rounded-[var(--radius-control)] border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary",
        on && "border-primary bg-primary font-semibold text-primary-foreground",
        dead &&
          "cursor-not-allowed opacity-35 line-through hover:border-border",
      )}
      onClick={() => {
        if (!dead && onClick) onClick();
      }}
      onKeyDown={(e) => {
        if (dead || !onClick) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {label}
      {extra}
    </span>
  );
}

function ToggleRow({
  label,
  on,
  onToggle,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-t border-border py-2 first:border-t-0 first:pt-0">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <span className="ml-auto flex items-center gap-2">
        <span
          role="switch"
          aria-checked={on}
          tabIndex={0}
          className={cn(
            "relative h-[22px] w-10 shrink-0 cursor-pointer rounded-full border border-border bg-muted transition-colors",
            on && "border-primary bg-primary",
          )}
          onClick={onToggle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggle();
            }
          }}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 size-4 rounded-full bg-card shadow-sm transition-[left]",
              on && "left-5",
            )}
          />
        </span>
        <span
          className={cn(
            "min-w-6 text-xs font-bold text-muted-foreground",
            on && "text-primary",
          )}
        >
          {on ? "Yes" : "No"}
        </span>
      </span>
    </div>
  );
}

function Field({
  label,
  warn,
  hidden,
  children,
  note,
}: {
  label: ReactNode;
  warn?: boolean;
  hidden?: boolean;
  children: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div className={cn("mb-4", hidden && "hidden")}>
      <label className="mb-2 block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
        {warn ? (
          <span className="ml-1 text-[var(--chart-4)]" aria-hidden>
            ⚠
          </span>
        ) : null}
      </label>
      {children}
      {note ? (
        <div className="mt-2 text-xs text-muted-foreground">{note}</div>
      ) : null}
    </div>
  );
}

function Panel({
  title,
  titleExtra,
  children,
}: {
  title: ReactNode;
  titleExtra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border bg-muted px-4 py-3 text-sm font-semibold">
        {title}
        {titleExtra}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function SandboxSection() {
  const [S, setS] = useState<SandboxState>(INITIAL_SANDBOX_STATE);
  const result = useMemo(() => evaluate(S), [S]);
  const { meta, fired, formGroups } = result;
  const { mode: m, live } = meta;

  function setField<K extends keyof SandboxState>(key: K, value: SandboxState[K]) {
    setS((prev) => patchSandboxState(prev, { [key]: value } as Partial<SandboxState>));
  }

  function tog(key: "pOut" | "pIn" | "pSingle" | "foiling") {
    setS((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  let toggles: ReactNode;
  if (m === "none") {
    toggles = (
      <div className="mt-2 text-xs text-muted-foreground">
        This product style cannot be printed — the whole printing section is
        absent (L3).
      </div>
    );
  } else if (m === "single") {
    toggles = (
      <ToggleRow
        label="Printed?"
        on={S.pSingle}
        onToggle={() => tog("pSingle")}
      />
    );
  } else if (m === "outside") {
    toggles = (
      <>
        <ToggleRow
          label="Print Outside"
          on={S.pOut}
          onToggle={() => tog("pOut")}
        />
        <div className="mt-2 text-xs text-muted-foreground">
          Inside printing is not offered for this product (L1).
        </div>
      </>
    );
  } else {
    toggles = (
      <>
        <ToggleRow
          label="Print Outside"
          on={S.pOut}
          onToggle={() => tog("pOut")}
        />
        <ToggleRow
          label="Print Inside"
          on={S.pIn}
          onToggle={() => tog("pIn")}
        />
      </>
    );
  }

  return (
    <section id="sandbox" className="pt-8">
      <div className="mb-2 flex items-baseline gap-3 border-t border-border pt-4">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Logic sandbox
        </h2>
      </div>
      <p className="mb-4 max-w-[74ch] text-sm text-muted-foreground">
        Change the inputs on the left. The right panels show which rules fire
        and what the form does in response — the expected logic, made visible.
        Only rules the catalogue specifies precisely are modelled here; anything
        that depends on a mapping table appears in the rules reference below,
        not in this sandbox.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="🎛️ Inputs">
          <div className="mb-4 rounded-[var(--radius-control)] border border-transparent bg-brand-cream px-3 py-2 text-xs leading-snug text-[var(--chart-4)]">
            <b className="font-bold">Provisional product list.</b> Assembled
            from products named in the catalogue conditions — not the real Line
            / Style / Product hierarchy. Replace when settled.
          </div>

          <Field label="Product">
            <div className="flex flex-wrap gap-2">
              {PRODUCTS.map((p) => (
                <Chip
                  key={p.n}
                  label={p.n}
                  on={S.product === p.n}
                  onClick={() => setField("product", p.n)}
                  extra={
                    <span
                      className={cn(
                        "ml-1 text-[10px] font-bold tracking-wide text-muted-foreground uppercase",
                        S.product === p.n && "text-primary-foreground/75",
                      )}
                    >
                      {p.lvl}
                    </span>
                  }
                />
              ))}
            </div>
          </Field>

          <Field
            label="Property — Shape"
            note="Drives the dimension form (D12). Only Cylinder and Bag / Pouch are specified so far."
          >
            <div className="flex flex-wrap gap-2">
              {SHAPES.map((s) => (
                <Chip
                  key={s.n}
                  label={s.n}
                  on={S.shape === s.n}
                  onClick={() => setField("shape", s.n)}
                />
              ))}
            </div>
          </Field>

          <Field label="Printed side">{toggles}</Field>

          <Field
            label="Color system"
            hidden={!live}
            note="Real list is gated by Printing Method (D4) — mapping not modelled here."
          >
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <Chip
                  key={c}
                  label={c}
                  on={S.color === c}
                  onClick={() => setField("color", c)}
                />
              ))}
            </div>
          </Field>

          <Field label="Pantone count" hidden={!(live && meta.isPantone)}>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="size-8 cursor-pointer rounded-[var(--radius-control)] border border-border bg-background text-sm text-foreground"
                onClick={() => setS((p) => bumpPcount(p, -1))}
              >
                –
              </button>
              <input
                value={S.pcount}
                readOnly
                className="h-8 w-12 rounded-[var(--radius-control)] border border-border bg-background text-center text-sm text-foreground"
              />
              <button
                type="button"
                className="size-8 cursor-pointer rounded-[var(--radius-control)] border border-border bg-background text-sm text-foreground"
                onClick={() => setS((p) => bumpPcount(p, 1))}
              >
                +
              </button>
              <span className="ml-2 text-xs text-muted-foreground">
                {S.pcount >= 3
                  ? "at the max of 3"
                  : `${S.pcount} PMS entr${S.pcount === 1 ? "y" : "ies"}`}
              </span>
            </div>
          </Field>

          <Field label="Surface finish">
            <div className="flex flex-wrap gap-2">
              {FINISHES.map((f) => (
                <Chip
                  key={f}
                  label={f}
                  on={S.finish === f}
                  onClick={() => setField("finish", f)}
                />
              ))}
            </div>
          </Field>

          <Field label={<>Embossing &amp; debossing</>}>
            <div className="flex flex-wrap gap-2">
              {EMBOSS.map((e) => {
                const on = S.emboss.includes(e);
                const dead = isEmbossDead(S, e);
                return (
                  <Chip
                    key={e}
                    label={e}
                    on={on}
                    dead={dead}
                    onClick={() => setS((p) => toggleEmboss(p, e))}
                  />
                );
              })}
            </div>
          </Field>

          <Field label="Foiling">
            <div className="flex flex-wrap gap-2">
              <Chip
                label="Foiling chosen"
                on={S.foiling}
                onClick={() => tog("foiling")}
              />
            </div>
          </Field>

          <Field
            label="Material family"
            warn
            note="⚠ Foam is not in the Materials list yet — the foiling and embossing conditions reference it."
          >
            <div className="flex flex-wrap gap-2">
              <Chip
                label="Paperboard"
                on={!S.foam}
                onClick={() => setField("foam", false)}
              />
              <Chip
                label="Foam"
                on={S.foam}
                onClick={() => setField("foam", true)}
              />
            </div>
          </Field>

          <Field
            label="Foam covering"
            warn
            hidden={!S.foam}
            note="⚠ Not an option in the catalogue yet — referenced only by conditions."
          >
            <div className="flex flex-wrap gap-2">
              {COVERINGS.map((c) => (
                <Chip
                  key={c}
                  label={c}
                  on={S.covering === c}
                  onClick={() => setField("covering", c)}
                />
              ))}
            </div>
          </Field>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel
            title="⚡ Rule trace"
            titleExtra={
              <span className="text-[11px] font-medium text-muted-foreground">
                — what fired
              </span>
            }
          >
            <div className="text-xs">
              {fired.length === 0 ? (
                <div className="text-muted-foreground italic">
                  No conditional rules fire for this combination.
                </div>
              ) : (
                fired.map((f, i) => (
                  <div
                    key={`${f.id}-${i}`}
                    className="flex items-start gap-2 border-b border-muted py-2 last:border-b-0"
                  >
                    <span
                      className={cn(
                        "mt-px shrink-0 rounded-[var(--radius-control)] bg-primary/10 px-2 text-xs font-bold text-primary",
                        f.kind === "warn" &&
                          "bg-brand-cream text-[var(--chart-4)]",
                        f.kind === "hide" &&
                          "bg-muted text-muted-foreground",
                      )}
                    >
                      {f.id}
                    </span>
                    <span
                      className="text-foreground"
                      dangerouslySetInnerHTML={{ __html: f.html }}
                    />
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel title="👁️ Resulting form state">
            <div className="flex flex-col gap-1 text-xs">
              {formGroups.map((g) => (
                <div key={g.title}>
                  <div className="mt-3 mb-0.5 text-[10px] font-bold tracking-wider text-muted-foreground uppercase first:mt-0">
                    {g.title}
                  </div>
                  {g.rows.map((row) => {
                    if (row.kind === "text") {
                      return (
                        <div
                          key={row.label}
                          className="flex items-center gap-2"
                        >
                          <span className="size-2 shrink-0 rounded-full bg-primary" />
                          <span>{row.label}</span>
                          <span className="ml-auto text-xs font-semibold text-muted-foreground">
                            {row.text}
                          </span>
                        </div>
                      );
                    }
                    const dotClass =
                      row.state === "shown"
                        ? "bg-primary"
                        : row.state === "blocked"
                          ? "bg-[var(--chart-4)]"
                          : "bg-border";
                    return (
                      <div
                        key={row.label}
                        className="flex items-center gap-2"
                      >
                        <span
                          className={cn(
                            "size-2 shrink-0 rounded-full",
                            dotClass,
                          )}
                        />
                        <span>{row.label}</span>
                        <span className="ml-auto text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                          {STATUS_LABEL[row.state] ?? row.state}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </section>
  );
}
