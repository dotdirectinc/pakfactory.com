"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@pakfactory/ui/components/badge";
import { Button } from "@pakfactory/ui/components/button";
import { Input } from "@pakfactory/ui/components/input";
import { Textarea } from "@pakfactory/ui/components/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@pakfactory/ui/components/sheet";
import { cn } from "@pakfactory/ui/lib/utils";
import { WARNING_BADGE } from "@/components/spec/library/spec-value";
import { decideMappingsAction } from "@/app/(admin)/spec/mapping/actions";
import {
  createViaMapAction, loadMapAction, saveMapAction, searchRecordsAction, type MapEditorData,
} from "@/app/(admin)/spec/mapping/edit-actions";
import { suggestIdAction } from "@/app/(admin)/spec/library/editor-actions";
import {
  draftErrors, draftOf, isProductLike, mapChanges, newProductType, nounOf, productionOf, refillDraft, targetKinds,
  type DraftPreset, type MapDraft, type Ref, type RefKind,
} from "@/lib/spec/map-editor";
import { idParts, newCapability } from "@/lib/spec/type-editor";
import type { LibraryDecision, MappingItem } from "@/lib/spec/registry-api";
import { ADMIN_SPEC_MAPPING_COPY as MAP_COPY } from "@/lib/copy/spec-mapping";

const COPY = MAP_COPY.editor;

/**
 * Edit one map from Mapping review (PLAT-86): pick the production product type (or capability /
 * field for options and values) and its presets, or add a new record, see the change, then save.
 * Reject and Defer decide the map without changing it.
 */
export function MapEditor({ m, admin, canDecide }: { m: MappingItem; admin: boolean; canDecide: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setOpen(true)}>
        {COPY.open}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{COPY.title(m.subjectName ?? m.subjectCode)}</SheetTitle>
            <SheetDescription>{COPY.lead}</SheetDescription>
          </SheetHeader>
          {open ? <EditorBody m={m} admin={admin} canDecide={canDecide} onDone={() => setOpen(false)} /> : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

function EditorBody({ m, admin, canDecide, onDone }: { m: MappingItem; admin: boolean; canDecide: boolean; onDone: () => void }) {
  const [data, setData] = useState<MapEditorData | null>(null);
  const [before, setBefore] = useState<MapDraft | null>(null);
  const [draft, setDraft] = useState<MapDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  useEffect(() => {
    let live = true;
    loadMapAction(m.id).then((res) => {
      if (!live) return;
      if (!res.ok) return setError(res.error);
      const d = draftOf(res.data.doc, m);
      // Preset names: the list knows their ids only; show the id until a pick names them.
      setData(res.data);
      setBefore(d);
      setDraft(structuredClone(d));
    });
    return () => {
      live = false;
    };
  }, [m]);

  if (error && !draft) return <p role="alert" className="px-4 text-sm text-destructive">{error}</p>;
  if (!data || !draft || !before) return <p className="px-4 text-sm text-muted-foreground">{COPY.loading}</p>;

  const kinds = targetKinds(m.subjectKind);
  const errors = draftErrors(draft, m.subjectKind);
  const changes = mapChanges(before, draft);
  const proposal = !admin && m.state === "approve";
  const set = (f: (d: MapDraft) => void) => {
    const next = structuredClone(draft);
    f(next);
    setDraft(next);
    setReviewing(false);
  };

  function save() {
    start(async () => {
      const res = await saveMapAction(m.id, productionOf(draft!), data!.doc.revision, note.trim() || null);
      if (!res.ok) return setError(res.stale ? COPY.stale : res.error);
      toast.success(COPY.saved(res.data.mode, res.data.edit));
      router.refresh();
      onDone();
    });
  }

  function decide(decision: LibraryDecision) {
    if (!note.trim()) return setError(COPY.noteNeeded);
    start(async () => {
      const res = await decideMappingsAction(decision, note.trim(), [m.id]);
      if (!res.ok) return setError(res.error);
      toast.success(MAP_COPY.bar.done(1, MAP_COPY.bar.decided[decision]!));
      router.refresh();
      onDone();
    });
  }

  return (
    <div className="flex flex-col gap-6 px-4 pb-6 text-sm">
      {data.doc.derived ? (
        <section className={cn("flex flex-col gap-2 rounded-md border px-3 py-2", data.doc.drift ? WARNING_BADGE : "border-border")}>
          <p className="text-xs">{data.doc.drift ? COPY.refillDrift : COPY.refillHint}</p>
          <div>
            <Button size="sm" variant="outline" onClick={() => set((d) => void Object.assign(d, refillDraft(data.doc, m)!))}>
              {COPY.refill}
            </Button>
          </div>
        </section>
      ) : null}
      <section className="flex flex-col gap-2">
        <h3 className="font-medium">{COPY.targets}</h3>
        {draft.targets.map((t, i) => (
          <div key={`${t.ref.kind}/${t.ref.sourceId}`} className="flex flex-col gap-2 rounded-md border border-border p-2.5">
            <RefLine r={t.ref} />
            <div className="flex flex-wrap items-center gap-2">
              <Input
                aria-label={COPY.setting}
                placeholder={COPY.setting}
                value={t.setting}
                onChange={(e) => set((d) => void (d.targets[i]!.setting = e.target.value))}
                className="h-8 flex-1"
              />
              <Picker kinds={kinds} line={m.line} label={COPY.change} onPick={(r) => set((d) => void (d.targets[i] = { ref: r, setting: "" }))} />
              <Button size="sm" variant="ghost" onClick={() => set((d) => void d.targets.splice(i, 1))}>
                {COPY.remove}
              </Button>
            </div>
            {errors[`target ${i + 1}`] ? <p className="text-xs text-destructive">{errors[`target ${i + 1}`]}</p> : null}
          </div>
        ))}
        {errors.targets ? <p className="text-xs text-destructive">{errors.targets}</p> : null}
        <div className="flex flex-wrap items-center gap-2">
          {!isProductLike(m.subjectKind) || draft.targets.length === 0 ? (
            <Picker kinds={kinds} line={m.line} label={COPY.addTarget} onPick={(r) => set((d) => void d.targets.push({ ref: r, setting: "" }))} />
          ) : null}
          {isProductLike(m.subjectKind) ? (
            <AddNew
              what="productTypes"
              open={data.addable.productTypes}
              line={m.line}
              map={m.id}
              defaultName={m.subjectName ?? ""}
              onCreated={(r) => set((d) => void (d.targets = [{ ref: r, setting: "" }]))}
            />
          ) : null}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="font-medium">{COPY.presets}</h3>
        {draft.presets.map((p, i) => (
          <PresetRow
            key={i}
            p={p}
            line={m.line}
            error={errors[`preset ${i + 1}`]}
            onChange={(next) => set((d) => void (d.presets[i] = next))}
            onRemove={() => set((d) => void d.presets.splice(i, 1))}
          />
        ))}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => set((d) => void d.presets.push({ label: "", value: "", ref: null, raw: null }))}>
            {COPY.addPreset}
          </Button>
          <AddNew
            what="capabilities"
            open={data.addable.capabilities}
            line={m.line}
            map={m.id}
            defaultName=""
            onCreated={(r) => set((d) => void d.presets.push({ label: r.name ?? r.sourceId, value: "", ref: r, raw: null }))}
          />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <Textarea aria-label={COPY.note} placeholder={COPY.note} value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
        {reviewing ? (
          <ChangeList changes={changes} />
        ) : null}
        {reviewing && changes.length > 0 ? (
          proposal ? (
            <p className={cn("rounded-md border px-3 py-2 text-xs", WARNING_BADGE)}>{COPY.proposalWarning}</p>
          ) : admin ? (
            <p className="text-xs text-muted-foreground">{COPY.adminNote}</p>
          ) : null
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          {reviewing ? (
            <>
              <Button size="sm" onClick={save} disabled={pending || changes.length === 0}>
                {proposal ? COPY.sendProposal : COPY.save}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setReviewing(false)} disabled={pending}>
                {COPY.back}
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setReviewing(true)} disabled={pending || Object.keys(errors).length > 0}>
              {COPY.review}
            </Button>
          )}
          {canDecide ? (
            <span className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" onClick={() => decide("defer")} disabled={pending}>
                {COPY.defer}
              </Button>
              <Button size="sm" variant="outline" className="text-destructive" onClick={() => decide("reject")} disabled={pending}>
                {COPY.reject}
              </Button>
            </span>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function RefLine({ r }: { r: Ref }) {
  return (
    <span className="flex flex-col">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{COPY.kinds[r.kind]}</span>
      <span className="font-medium">{r.name ?? r.sourceId}</span>
      <span className="font-mono text-xs text-muted-foreground">{r.sourceId}</span>
    </span>
  );
}

function PresetRow({ p, line, error, onChange, onRemove }: { p: DraftPreset; line: string; error?: string; onChange: (p: DraftPreset) => void; onRemove: () => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-2.5">
      <div className="flex flex-wrap gap-2">
        <Input aria-label={COPY.presetLabel} placeholder={COPY.presetLabel} value={p.label} onChange={(e) => onChange({ ...p, label: e.target.value })} className="h-8 flex-1" />
        <Input aria-label={COPY.presetValue} placeholder={COPY.presetValue} value={p.value} onChange={(e) => onChange({ ...p, value: e.target.value })} className="h-8 flex-1" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {p.ref ? (
          <span className="flex-1 text-xs">
            {COPY.kinds[p.ref.kind]}: {p.ref.name ? <span className="font-medium">{p.ref.name}</span> : null}{" "}
            <span className="font-mono text-muted-foreground">{p.ref.sourceId}</span>
          </span>
        ) : (
          <span className="flex flex-1 flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Badge variant="outline" className={cn("px-1 py-0 text-[10px] font-normal", WARNING_BADGE)}>{MAP_COPY.needsCode}</Badge>
            {p.raw ? COPY.textOnly(p.raw) : COPY.pickRecord}
          </span>
        )}
        <Picker kinds={["capability", "field"]} line={line} label={p.ref ? COPY.change : COPY.pick} onPick={(r) => onChange({ ...p, ref: r })} />
        <Button size="sm" variant="ghost" onClick={onRemove}>
          {COPY.remove}
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

/** Search one line's records of the allowed kinds and pick one. */
function Picker({ kinds, line, label, onPick }: { kinds: RefKind[]; line: string; label: string; onPick: (r: Ref) => void }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<RefKind>(kinds[0]!);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Ref[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (!open) return;
    const n = ++seq.current;
    setItems(null);
    const t = setTimeout(async () => {
      const res = await searchRecordsAction(kind, line, q);
      if (n !== seq.current) return;
      if (!res.ok) return setError(res.error);
      setError(null);
      setItems(res.data);
    }, 250);
    return () => clearTimeout(t);
  }, [open, kind, line, q]);

  if (!open)
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        {label}
      </Button>
    );
  return (
    <div className="flex w-full flex-col gap-2 rounded-md border border-border bg-muted/20 p-2">
      <div className="flex flex-wrap items-center gap-2">
        {kinds.length > 1
          ? kinds.map((k) => (
              <Button key={k} size="sm" variant={k === kind ? "default" : "ghost"} className="h-7 px-2 text-xs" onClick={() => setKind(k)}>
                {COPY.kinds[k]}
              </Button>
            ))
          : null}
        <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={COPY.search(nounOf(kind))} className="h-8 flex-1" />
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          {COPY.back}
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {items === null ? (
        <p className="text-xs text-muted-foreground">{COPY.searching}</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{COPY.noResults}</p>
      ) : (
        <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-md border border-border bg-background">
          {items.map((r) => (
            <li key={r.sourceId}>
              <button
                type="button"
                className="flex w-full flex-col px-2.5 py-1.5 text-left hover:bg-muted/50"
                onClick={() => {
                  onPick(r);
                  setOpen(false);
                }}
              >
                <span>{r.name ?? r.sourceId}</span>
                <span className="font-mono text-xs text-muted-foreground">{r.sourceId}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** + Add new product… / preset…: a short form; the record is created (not approved) and selected. */
function AddNew({
  what, open: allowed, line, map, defaultName, onCreated,
}: {
  what: "productTypes" | "capabilities";
  open: boolean;
  line: string;
  map: number;
  defaultName: string;
  onCreated: (r: Ref) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [id, setId] = useState("");
  const [group, setGroup] = useState<Ref | null>(null);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const label = what === "productTypes" ? COPY.addNewProduct : COPY.addNewPreset;

  if (!allowed)
    return <span className="text-xs text-muted-foreground">{COPY.addNewClosed(what === "productTypes" ? "product types" : "capabilities")}</span>;
  if (!open)
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        {label}
      </Button>
    );

  function suggest() {
    const parts = idParts(name);
    if (!parts.length) return;
    start(async () => {
      const res = await suggestIdAction(what, what === "productTypes" ? [line.replace(/^CAT-/, "").toLowerCase(), ...parts] : parts);
      if (res.ok) setId(res.data);
      else setError(res.error);
    });
  }

  function create() {
    if (!name.trim() || !id.trim()) return setError(`${COPY.newName} and ${COPY.newId} are required.`);
    if (what === "capabilities" && !group) return setError(`${COPY.newGroup} is required.`);
    setError(null);
    const record =
      what === "productTypes"
        ? newProductType({ id: id.trim(), name, line, description })
        : newCapability({ id: id.trim(), name, groupId: group!.sourceId, line, description });
    start(async () => {
      const res = await createViaMapAction(what, record, map);
      if (!res.ok) return setError(res.fields ? Object.entries(res.fields).map(([k, v]) => `${k}: ${v}`).join("; ") : res.error);
      toast.success(COPY.created(res.data.sourceId));
      onCreated({ kind: what === "productTypes" ? "productType" : "capability", sourceId: res.data.sourceId, name: name.trim() });
      setOpen(false);
    });
  }

  return (
    <div className="flex w-full flex-col gap-2 rounded-md border border-border bg-muted/20 p-2.5">
      <span className="font-medium">{label.replace(/^\+ /, "").replace(/…$/, "")}</span>
      <Input aria-label={COPY.newName} placeholder={COPY.newName} value={name} onChange={(e) => setName(e.target.value)} onBlur={() => { if (!id) suggest(); }} className="h-8" />
      <div className="flex gap-2">
        <Input aria-label={COPY.newId} placeholder={COPY.newId} value={id} onChange={(e) => setId(e.target.value.toUpperCase())} className="h-8 flex-1 font-mono" />
        <Button size="sm" variant="ghost" onClick={suggest} disabled={pending}>
          {COPY.suggest}
        </Button>
      </div>
      {what === "capabilities" ? (
        group ? (
          <span className="flex items-center gap-2 text-xs">
            {COPY.newGroup}: <span className="font-medium">{group.name ?? group.sourceId}</span>
            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs" onClick={() => setGroup(null)}>
              {COPY.change}
            </Button>
          </span>
        ) : (
          <GroupPicker line={line} onPick={setGroup} />
        )
      ) : null}
      <Textarea aria-label={COPY.newDescription} placeholder={COPY.newDescription} value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      <p className="text-xs text-muted-foreground">{COPY.addNewNote}</p>
      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Button size="sm" onClick={create} disabled={pending}>
          {COPY.create}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          {COPY.back}
        </Button>
      </div>
    </div>
  );
}

function GroupPicker({ line, onPick }: { line: string; onPick: (r: Ref) => void }) {
  const [items, setItems] = useState<Ref[] | null>(null);
  useEffect(() => {
    searchRecordsAction("group", line, "").then((res) => setItems(res.ok ? res.data : []));
  }, [line]);
  return (
    <select
      aria-label={COPY.newGroup}
      className="h-8 rounded-md border border-border bg-background px-2 text-sm"
      defaultValue=""
      onChange={(e) => {
        const g = items?.find((x) => x.sourceId === e.target.value);
        if (g) onPick(g);
      }}
    >
      <option value="" disabled>
        {items === null ? COPY.searching : COPY.newGroup}
      </option>
      {(items ?? []).map((g) => (
        <option key={g.sourceId} value={g.sourceId}>
          {g.name ?? g.sourceId}
        </option>
      ))}
    </select>
  );
}

function ChangeList({ changes }: { changes: ReturnType<typeof mapChanges> }) {
  if (changes.length === 0) return <p className="text-xs text-muted-foreground">{COPY.nothing}</p>;
  return (
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr className="border-b border-border text-left text-muted-foreground">
          <th className="py-1 pr-2 font-medium">{COPY.columns.what}</th>
          <th className="py-1 pr-2 font-medium">{COPY.columns.before}</th>
          <th className="py-1 font-medium">{COPY.columns.after}</th>
        </tr>
      </thead>
      <tbody>
        {changes.map((c, i) => (
          <tr key={i} className="border-b border-border align-top">
            <td className="py-1 pr-2">
              {COPY.changeKind[c.kind]}: {c.what}
            </td>
            <td className="py-1 pr-2 text-muted-foreground">{c.before ?? "—"}</td>
            <td className="py-1">{c.after ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
