"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@pakfactory/ui/components/badge";
import { Button } from "@pakfactory/ui/components/button";
import { Input } from "@pakfactory/ui/components/input";
import { Textarea } from "@pakfactory/ui/components/textarea";
import {
  confirmRemovalAction, loadSpecRecordAction, previewRemovalAction, saveSpecRecordAction, suggestIdAction,
  type EditorResult,
} from "@/app/(admin)/spec/library/editor-actions";
import type { RemovalFrom, RemovalPreview, SpecCollection, SpecEdit, SpecEditResult, SpecRecordState } from "@/lib/spec/registry-api";
import { idParts, isNumberValue, newCapability, recordChanges, withParameterValues, type FieldChange, type Parameter } from "@/lib/spec/type-editor";
import { ADMIN_SPEC_LIBRARY_COPY } from "@/lib/copy/spec-library";

const COPY = ADMIN_SPEC_LIBRARY_COPY.editor;

export type EditorCapability = { sourceId: string; label: string | null; group: { sourceId: string; name: string } | null };

type Props = {
  productType: { sourceId: string; name: string; line: string; lineName: string };
  ptRecord: SpecRecordState | null;
  capabilities: EditorCapability[];
  groups: { sourceId: string; name: string }[];
  rights: { productTypes: boolean; capabilities: boolean };
  edits: SpecEdit[];
  labels: Record<string, string>;
};

/**
 * The product type editor (PLAT-85 scope 4–5): the type's own fields, and the capabilities of its line
 * (change values, remove from this type or the line, retire, add). Every save shows its change first.
 * Whether a save is applied or held as a proposal is decided by the server from the person's role.
 */
export function LibraryTypeEditor(p: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const done = (r: SpecEditResult) => setMessage(COPY.saved(r.state, r.edit));
  return (
    <div className="flex flex-col gap-8">
      {message ? <p role="status" className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">{message}</p> : null}

      {p.rights.productTypes && p.ptRecord ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-medium">{COPY.productType}</h2>
          <RecordForm collection="productTypes" state={p.ptRecord} keys={["name", "description", "order"]} onSaved={done} />
        </section>
      ) : null}

      {p.rights.capabilities ? (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="text-base font-medium">{COPY.capabilities(p.capabilities.length)}</h2>
            <p className="text-sm text-muted-foreground">{COPY.capabilitiesNote}</p>
          </div>
          <AddCapability line={p.productType.line} groups={p.groups} onSaved={done} />
          <ul className="divide-y divide-border rounded-md border border-border">
            {p.capabilities.map((c, i) => (
              <CapabilityRow
                key={c.sourceId}
                cap={c}
                heading={c.group && c.group.name !== p.capabilities[i - 1]?.group?.name ? c.group.name : null}
                productType={p.productType}
                onSaved={done}
              />
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-medium">{COPY.history}</h2>
        <History edits={p.edits} labels={p.labels} />
      </section>
    </div>
  );
}

// ── one record's fields: edit, review the change, save ────────────────────────────────────────

function RecordForm(props: {
  collection: SpecCollection;
  state: SpecRecordState;
  keys: string[];
  withParameters?: boolean;
  onSaved: (r: SpecEditResult) => void;
  onCancel?: () => void;
}) {
  const [state, setState] = useState(props.state);
  const rec = state.record;
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(props.keys.map((k) => [k, rec[k] == null ? "" : String(rec[k])])),
  );
  const params = (Array.isArray(rec.parameters) ? rec.parameters : []) as Parameter[];
  const [paramValues, setParamValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(params.map((x) => [x.key, x.value == null ? "" : String(x.value)])),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [changes, setChanges] = useState<{ after: Record<string, unknown>; list: FieldChange[] } | null>(null);
  const router = useRouter();

  function review() {
    const errs: Record<string, string> = {};
    const after: Record<string, unknown> = { ...rec };
    for (const k of props.keys) {
      const v = values[k]!.trim();
      if (typeof rec[k] === "number" || isNumberValue(rec[k])) {
        if (!isNumberValue(v)) errs[k] = "must be a number";
        else after[k] = typeof rec[k] === "number" ? Number(v) : v;
      } else after[k] = v;
    }
    if (props.withParameters && params.length) {
      const res = withParameterValues(params, paramValues);
      if (!res.ok) for (const [k, m] of Object.entries(res.errors)) errs[`parameters.${k}`] = m;
      else after.parameters = res.params;
    }
    setErrors(errs);
    if (Object.keys(errs).length) return setChanges(null);
    setChanges({ after, list: recordChanges(rec, after) });
  }

  async function reload() {
    const res = await loadSpecRecordAction(props.collection, state.sourceId);
    if (res.ok) {
      setState(res.data);
      setChanges(null);
      setErrors({});
      router.refresh();
    }
  }

  const locked = state.lifecycle === "retired";
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-3 text-sm">
      {state.openEdits.length ? <Badge variant="outline" className="w-fit font-normal">{COPY.openProposal(state.openEdits)}</Badge> : null}
      {props.keys.map((k) => (
        <label key={k} className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            {COPY.fields[k] ?? k}
            {typeof rec[k] === "number" ? <span className="font-normal"> · {COPY.numberHint}</span> : null}
          </span>
          {k === "description" ? (
            <Textarea value={values[k]} rows={2} disabled={locked} onChange={(e) => setValues({ ...values, [k]: e.target.value })} />
          ) : (
            <Input
              value={values[k]}
              inputMode={typeof rec[k] === "number" ? "decimal" : undefined}
              disabled={locked}
              onChange={(e) => setValues({ ...values, [k]: e.target.value })}
            />
          )}
          {errors[k] ? <span className="text-xs text-destructive">{errors[k]}</span> : null}
        </label>
      ))}
      {props.withParameters ? (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">{COPY.fields.values}</span>
          {params.length === 0 ? <span className="text-muted-foreground">{COPY.noValues}</span> : null}
          {params.map((x) => (
            <label key={x.key} className="grid grid-cols-[minmax(8rem,auto)_1fr_auto] items-center gap-2">
              <span>{x.label ?? x.key}</span>
              <Input
                value={paramValues[x.key]}
                inputMode={isNumberValue(x.value) ? "decimal" : undefined}
                disabled={locked}
                onChange={(e) => setParamValues({ ...paramValues, [x.key]: e.target.value })}
                aria-label={x.label ?? x.key}
              />
              <span className="text-xs text-muted-foreground">
                {x.unit || ""}
                {isNumberValue(x.value) ? ` (${COPY.numberHint})` : ""}
              </span>
              {errors[`parameters.${x.key}`] ? (
                <span className="col-span-3 text-xs text-destructive">{errors[`parameters.${x.key}`]}</span>
              ) : null}
            </label>
          ))}
        </div>
      ) : null}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={review} disabled={locked}>{COPY.review}</Button>
        {props.onCancel ? <Button size="sm" variant="ghost" onClick={props.onCancel}>{COPY.cancel}</Button> : null}
      </div>
      {changes ? (
        <SaveStep
          changes={changes.list}
          run={(note) => saveSpecRecordAction(props.collection, state.sourceId, {
            action: "update", record: changes.after, baseRevision: state.revision, note,
          })}
          onSaved={(r) => { setChanges(null); props.onSaved(r); void reload(); }}
          onStale={reload}
        />
      ) : null}
    </div>
  );
}

/** The change, a note, and Save. A 409 offers Reload; field refusals are listed. */
function SaveStep(props: {
  changes: FieldChange[];
  /** Show the save step even with no field changes (a removal, a retire). */
  always?: boolean;
  noteRequired?: boolean;
  noteLabel?: string;
  confirm?: string;
  run: (note: string | null) => Promise<EditorResult<SpecEditResult>>;
  onSaved: (r: SpecEditResult) => void;
  onStale?: () => void;
}) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<{ text: string; fields?: Record<string, string>; stale?: boolean } | null>(null);
  const [pending, start] = useTransition();
  if (props.changes.length === 0 && !props.noteRequired && !props.always) return <p className="text-muted-foreground">{COPY.noChange}</p>;
  return (
    <div className="flex flex-col gap-2 rounded-md bg-muted/30 p-3">
      {props.changes.length ? <ChangeTable changes={props.changes} /> : null}
      <Textarea value={note} rows={1} maxLength={2000} placeholder={props.noteLabel ?? COPY.note} aria-label={props.noteLabel ?? COPY.note}
        onChange={(e) => setNote(e.target.value)} disabled={pending} />
      <div className="flex gap-2">
        <Button size="sm" disabled={pending || (props.noteRequired && !note.trim())}
          onClick={() => start(async () => {
            const res = await props.run(note.trim() || null);
            if (!res.ok) return setError({ text: res.stale ? COPY.stale : res.error, fields: res.fields, stale: res.stale });
            setError(null);
            props.onSaved(res.data);
          })}>
          {pending ? COPY.saving : (props.confirm ?? COPY.save)}
        </Button>
        {error?.stale && props.onStale ? <Button size="sm" variant="outline" onClick={props.onStale}>{COPY.reload}</Button> : null}
      </div>
      {error ? (
        <div role="alert" className="text-destructive">
          <p>{error.text}</p>
          {error.fields ? (
            <ul className="list-disc pl-5">
              {Object.entries(error.fields).map(([k, m]) => <li key={k}><span className="font-mono">{k}</span>: {m}</li>)}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function show(v: unknown): string {
  if (v === undefined || v === null || v === "") return "—";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v) && v.every((x) => typeof x === "string")) return v.length ? v.join(", ") : "—";
  if (Array.isArray(v) && v.every((x) => x && typeof x === "object" && "key" in x)) {
    return (v as Parameter[]).map((x) => `${x.label ?? x.key}: ${x.value ?? "—"}${x.unit ? ` ${x.unit}` : ""}`).join("; ") || "—";
  }
  const s = JSON.stringify(v);
  return s.length > 300 ? `${s.slice(0, 300)}…` : s;
}

function ChangeTable({ changes }: { changes: FieldChange[] }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="font-medium">{COPY.changeHeading}</p>
      <table className="w-full text-left text-xs">
        <thead className="text-muted-foreground">
          <tr><th className="py-1 pr-2 font-medium" /><th className="py-1 pr-2 font-medium">{COPY.before}</th><th className="py-1 font-medium">{COPY.after}</th></tr>
        </thead>
        <tbody>
          {changes.map((c) => (
            <tr key={c.key} className="align-top">
              <td className="py-1 pr-2 font-medium">{COPY.fields[c.key] ?? c.key}</td>
              <td className="py-1 pr-2 text-muted-foreground line-through decoration-muted-foreground/50">{show(c.before)}</td>
              <td className="py-1">{show(c.after)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── a capability of the line ────────────────────────────────────────────────────────────────

function CapabilityRow(props: {
  cap: EditorCapability;
  heading: string | null;
  productType: Props["productType"];
  onSaved: (r: SpecEditResult) => void;
}) {
  const { cap } = props;
  const [panel, setPanel] = useState<"none" | "edit" | "remove" | "retire">("none");
  const [state, setState] = useState<SpecRecordState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function open(next: "edit" | "retire" | "remove") {
    if (panel === next) return setPanel("none");
    setError(null);
    if (next === "remove") return setPanel("remove");
    start(async () => {
      const res = await loadSpecRecordAction("capabilities", cap.sourceId);
      if (!res.ok) return setError(res.error);
      setState(res.data);
      setPanel(next);
    });
  }
  const finish = (r: SpecEditResult) => { setPanel("none"); props.onSaved(r); router.refresh(); };

  return (
    <li className="flex flex-col gap-2 px-3 py-2 text-sm">
      {props.heading ? <p className="-mx-3 -mt-2 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">{props.heading}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{cap.label ?? cap.sourceId}</span>
        <span className="font-mono text-xs text-muted-foreground">{cap.sourceId}</span>
        <span className="ml-auto flex gap-2">
          <Button size="sm" variant={panel === "edit" ? "secondary" : "outline"} disabled={pending} onClick={() => open("edit")}>{COPY.edit}</Button>
          <Button size="sm" variant={panel === "remove" ? "secondary" : "outline"} disabled={pending} onClick={() => open("remove")}>{COPY.remove}</Button>
          <Button size="sm" variant={panel === "retire" ? "secondary" : "outline"} disabled={pending} onClick={() => open("retire")}>{COPY.retire}</Button>
        </span>
      </div>
      {pending ? <p className="text-muted-foreground">{COPY.loading}</p> : null}
      {error ? <p role="alert" className="text-destructive">{error}</p> : null}
      {panel === "edit" && state ? (
        <RecordForm collection="capabilities" state={state} keys={["name", "description"]} withParameters onSaved={finish} onCancel={() => setPanel("none")} />
      ) : null}
      {panel === "retire" && state ? (
        state.lifecycle === "retired" ? <p className="text-muted-foreground">{COPY.retired}</p> : (
          <div className="flex flex-col gap-2 rounded-md border border-border p-3">
            <p>{COPY.retireLead(cap.label ?? cap.sourceId)}</p>
            <SaveStep changes={[]} noteRequired noteLabel={COPY.retireNote} confirm={COPY.retire.replace("…", "")}
              run={(note) => saveSpecRecordAction("capabilities", cap.sourceId, { action: "retire", baseRevision: state.revision, note })}
              onSaved={finish} />
          </div>
        )
      ) : null}
      {panel === "remove" ? <RemovePanel cap={cap} productType={props.productType} onSaved={finish} /> : null}
    </li>
  );
}

/** Remove from this product type only, or from the whole line: both previewed, then one confirmed. */
function RemovePanel(props: { cap: EditorCapability; productType: Props["productType"]; onSaved: (r: SpecEditResult) => void }) {
  const { cap, productType: pt } = props;
  const name = cap.label ?? cap.sourceId;
  const [previews, setPreviews] = useState<{ type: EditorResult<RemovalPreview>; line: EditorResult<RemovalPreview> } | null>(null);
  const [choice, setChoice] = useState<"type" | "line" | null>(null);
  useEffect(() => {
    let live = true;
    void Promise.all([
      previewRemovalAction(cap.sourceId, { productType: pt.sourceId }),
      previewRemovalAction(cap.sourceId, { line: pt.line }),
    ]).then(([type, line]) => { if (live) setPreviews({ type, line }); });
    return () => { live = false; };
  }, [cap.sourceId, pt.sourceId, pt.line]);
  if (!previews) return <p className="text-muted-foreground">{COPY.loading}</p>;
  const option = (key: "type" | "line", res: EditorResult<RemovalPreview>, label: string) => (
    <label className="flex flex-col gap-1 rounded-md border border-border p-2">
      <span className="flex items-center gap-2">
        <input type="radio" name={`rm-${cap.sourceId}`} checked={choice === key} disabled={!res.ok || !res.data.writable}
          onChange={() => setChoice(key)} />
        <span className="font-medium">{label}</span>
      </span>
      <RemovalSummary res={res} />
    </label>
  );
  const lineCount = previews.line.ok ? previews.line.data.affected?.length ?? 0 : 0;
  const chosen = choice === "type" ? previews.type : choice === "line" ? previews.line : null;
  const from: RemovalFrom | null = choice === "type" ? { productType: pt.sourceId } : choice === "line" ? { line: pt.line } : null;
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <p>{COPY.removal.lead(name, pt.name, pt.lineName)}</p>
      <div className="grid gap-2 md:grid-cols-2">
        {option("type", previews.type, COPY.removal.fromType(pt.name))}
        {option("line", previews.line, COPY.removal.fromLine(pt.lineName, lineCount))}
      </div>
      {chosen?.ok && from ? (
        <SaveStep
          key={choice}
          changes={removalChanges(chosen.data)}
          always
          confirm={COPY.removal.confirm}
          run={(note) => confirmRemovalAction(cap.sourceId, from, chosen.data.baseRevision, note)}
          onSaved={props.onSaved}
        />
      ) : <p className="text-xs text-muted-foreground">{COPY.removal.choose}</p>}
    </div>
  );
}

/** What a removal changes, for the save step: a field's capability list, or the capability's lines. */
function removalChanges(d: RemovalPreview): FieldChange[] {
  if (d.kind === "line") {
    return [{ key: COPY.removal.linesKey, before: d.categories?.before ?? COPY.removal.everyLine, after: d.categories?.after ?? [] }];
  }
  return (d.fields ?? []).map((f) => ({
    key: f.label ?? f.fieldId,
    before: f.before ?? COPY.removal.everyMatching,
    after: f.after,
  }));
}

function RemovalSummary({ res }: { res: EditorResult<RemovalPreview> }) {
  if (!res.ok) return <span className="text-xs text-destructive">{res.error}</span>;
  const d = res.data;
  return (
    <span className="flex flex-col gap-1 text-xs text-muted-foreground">
      {d.edit && d.owner !== "spec_system" ? (
        <span className="text-destructive">{COPY.removal.notOwned(d.edit.collection)}</span>
      ) : null}
      {d.blockers.length ? (
        <span className="text-destructive">
          {COPY.removal.blocked} {d.blockers.map((b) => `${b.fieldId}: ${b.reason}`).join("; ")}
        </span>
      ) : null}
      {d.kind === "productType" && d.edit ? (
        <>
          <span>{COPY.removal.typeTemplate(d.edit.sourceId, d.edit.action === "create")}</span>
          {d.fields?.length ? <span>{COPY.removal.typeFields(d.fields.length)} {d.fields.map((f) => f.label ?? f.fieldId).join(", ")}</span> : null}
        </>
      ) : null}
      {d.kind === "line" && d.affected?.length ? (
        <span>{COPY.removal.lineAffected} {d.affected.map((a) => a.name ?? a.productType).join(", ")}</span>
      ) : null}
    </span>
  );
}

// ── add a capability to the line ────────────────────────────────────────────────────────────

function AddCapability(props: { line: string; groups: { sourceId: string; name: string }[]; onSaved: (r: SpecEditResult) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [description, setDescription] = useState("");
  const [id, setId] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  const [, start] = useTransition();
  const router = useRouter();

  if (!open) return <Button size="sm" variant="outline" className="w-fit" onClick={() => setOpen(true)}>{COPY.add.button}</Button>;

  function suggest() {
    const parts = idParts(name);
    if (!parts.length) return;
    start(async () => {
      const res = await suggestIdAction("capabilities", parts);
      if (res.ok) setId(res.data);
    });
  }
  function review() {
    const p = !name.trim() ? COPY.add.needName : !groupId ? COPY.add.needGroup : !id.trim() ? COPY.add.needId : null;
    setProblem(p);
    setRecord(p ? null : newCapability({ id: id.trim(), name, groupId, line: props.line, description }));
  }
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-3 text-sm">
      <p className="font-medium">{COPY.add.heading}</p>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">{COPY.fields.name}</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => { if (!id) suggest(); }} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">{COPY.fields.group}</span>
        <select className="h-9 rounded-md border border-input bg-background px-2" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          <option value="">{COPY.add.groupPick}</option>
          {props.groups.map((g) => <option key={g.sourceId} value={g.sourceId}>{g.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">{COPY.fields.description}</span>
        <Textarea value={description} rows={2} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">{COPY.fields.id}</span>
        <span className="flex gap-2">
          <Input className="font-mono" value={id} onChange={(e) => setId(e.target.value.toUpperCase())} />
          <Button size="sm" variant="outline" onClick={suggest}>{COPY.add.suggest}</Button>
        </span>
        <span className="text-xs text-muted-foreground">{COPY.add.idHint}</span>
      </label>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={review}>{COPY.review}</Button>
        <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setRecord(null); }}>{COPY.cancel}</Button>
      </div>
      {problem ? <p role="alert" className="text-destructive">{problem}</p> : null}
      {record ? (
        <SaveStep
          changes={recordChanges(null, record)}
          run={(note) => saveSpecRecordAction("capabilities", String(record.id), { action: "create", record, note })}
          onSaved={(r) => {
            setOpen(false); setRecord(null); setName(""); setGroupId(""); setDescription(""); setId("");
            props.onSaved(r); router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

// ── history ───────────────────────────────────────────────────────────────────────────────

function History({ edits, labels }: { edits: SpecEdit[]; labels: Record<string, string> }) {
  if (!edits.length) return <p className="text-sm text-muted-foreground">{COPY.historyNone}</p>;
  const H = COPY.historyColumns;
  return (
    <table className="w-full text-left text-sm">
      <thead className="text-xs text-muted-foreground">
        <tr>{["when", "who", "what", "record", "state"].map((k) => <th key={k} className="py-1 pr-3 font-medium">{H[k]}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-border">
        {edits.map((e) => (
          <tr key={e.id} className="align-top">
            <td className="py-1 pr-3 whitespace-nowrap text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</td>
            <td className="py-1 pr-3">{e.createdByName ?? "—"}</td>
            <td className="py-1 pr-3">{COPY.actions[e.action] ?? e.action}{e.note ? <span className="block text-xs text-muted-foreground">{e.note}</span> : null}</td>
            <td className="py-1 pr-3">{labels[`${e.collection}/${e.sourceId}`] ?? e.sourceId} <span className="font-mono text-xs text-muted-foreground">#{e.id}</span></td>
            <td className="py-1">{COPY.states[e.state] ?? e.state}{e.decisionNote ? <span className="block text-xs text-muted-foreground">{e.decisionNote}</span> : null}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
