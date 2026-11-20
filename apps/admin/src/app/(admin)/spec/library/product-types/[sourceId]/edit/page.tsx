import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { LibraryTypeEditor, type EditorCapability } from "@/components/spec/library/library-type-editor";
import { canAdminSpec, canEditSpec, requireRegistryGrant } from "@/lib/spec/require-grant";
import { getLibraryProductTypeReview, getSpecCollectionOwners, getSpecRecord, listSpecEdits } from "@/lib/spec/registry-api";
import { sortBundle } from "@/lib/spec/library-bundle";
import { editRights, editsOf } from "@/lib/spec/type-editor";
import { ADMIN_SPEC_LIBRARY_COPY } from "@/lib/copy/spec-library";

export const metadata = { title: "Edit product type" };

const COPY = ADMIN_SPEC_LIBRARY_COPY.editor;

/**
 * Edit a product type and the capabilities of its line (PLAT-85 scope 4–5, ADR-028 D3, D5, D6). Only
 * collections the Spec System owns are editable; an admin's saves are approved at once, anyone else's
 * become proposals. The last changes to these records are listed with who made them.
 */
export default async function EditProductTypePage({ params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId: raw } = await params;
  const sourceId = decodeURIComponent(raw);
  if (!/^PT-[A-Z0-9][A-Z0-9-]{0,80}$/.test(sourceId)) notFound();

  const [me, review, owners, record, edits] = await Promise.all([
    requireRegistryGrant(),
    getLibraryProductTypeReview(sourceId),
    getSpecCollectionOwners(),
    getSpecRecord("productTypes", sourceId),
    listSpecEdits({ state: "all" }),
  ]);
  if (!review.ok) {
    if (review.status === 404) notFound();
    return <p role="alert" className="p-4 text-sm text-destructive">{ADMIN_SPEC_LIBRARY_COPY.unreachable} ({review.error})</p>;
  }
  const { productType: pt, items } = review.data;
  const rights = editRights(owners.ok ? owners.data : null, canEditSpec(me));
  const caps = sortBundle(items.filter((i) => i.collection === "capability"));
  const capabilities: EditorCapability[] = caps.map((c) => ({
    sourceId: c.sourceId,
    label: c.label,
    group: c.group?.sourceId ? { sourceId: c.group.sourceId, name: c.group.name ?? c.group.sourceId } : null,
  }));
  const groups = [...new Map(capabilities.filter((c) => c.group).map((c) => [c.group!.sourceId, c.group!])).values()];
  const labels: Record<string, string> = { [`productTypes/${pt.sourceId}`]: pt.name };
  for (const c of capabilities) labels[`capabilities/${c.sourceId}`] = c.label ?? c.sourceId;
  // Removals from this product type change its own template.
  for (const t of items.filter((i) => i.collection === "template")) labels[`templates/${t.sourceId}`] = t.label ?? t.sourceId;
  const typeTemplate = `TPL-${pt.sourceId.replace(/^PT-/, "")}`;
  labels[`templates/${typeTemplate}`] ??= typeTemplate;
  const history = edits.ok ? editsOf(edits.data.items, new Set(Object.keys(labels))).slice(0, 30) : [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        title={COPY.title(pt.name)}
        lead={
          <span className="flex flex-col gap-1">
            <span>{COPY.lead}</span>
            <span>{canAdminSpec(me) ? COPY.asAdmin : COPY.asEditor}</span>
          </span>
        }
        back={{ href: `/spec/library/product-types/${encodeURIComponent(pt.sourceId)}`, label: COPY.back }}
      />
      {!rights.any ? (
        <p className="text-sm text-muted-foreground">{COPY.nothingEditable}</p>
      ) : (
        <LibraryTypeEditor
          productType={{ sourceId: pt.sourceId, name: pt.name, line: pt.line, lineName: pt.lineName }}
          ptRecord={record.ok ? record.data : null}
          capabilities={capabilities}
          groups={groups}
          rights={{ productTypes: rights.productTypes, capabilities: rights.capabilities }}
          edits={history}
          labels={labels}
          admin={canAdminSpec(me)}
        />
      )}
    </div>
  );
}
