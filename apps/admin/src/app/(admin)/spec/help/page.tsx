import type { ReactNode } from "react";
import { requireRegistryGrant } from "@/lib/spec/require-grant";
import { PageHeader } from "@/components/ui/page-header";
import { ADMIN_SPEC_HELP_COPY as HELP } from "@/lib/copy/spec";

export const metadata = { title: "Spec System help" };

/**
 * Spec System help (PROD-2771 · planned 2026-10-02, written 2026-10-08). For the people who use the
 * pages — Crystal, Eric — not developers: what each page shows, what each button does, how the
 * catalog is structured, how syncing works, and what a registry code means. Plain words; terms are
 * the ones the pages themselves use. Keep it in step with lib/copy/spec.ts when a page changes.
 */
function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-20 flex-col gap-3">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function Term({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[12rem_1fr] sm:gap-4">
      <dt className="font-medium text-foreground">{name}</dt>
      <dd>{children}</dd>
    </div>
  );
}

const TOC = [
  ["pages", "The pages"],
  ["sync", "Syncing and approving"],
  ["owners", "Who owns what"],
  ["structure", "How the catalog is structured"],
  ["status", "Status"],
  ["codes", "Registry IDs and codes"],
  ["why", "Why did…?"],
] as const;

export default async function SpecHelpPage() {
  await requireRegistryGrant();
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <PageHeader title={HELP.title} lead={HELP.lead} leadClassName="max-w-none" />
        <nav aria-label="On this page" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {TOC.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="text-foreground underline-offset-2 hover:underline">
              {label}
            </a>
          ))}
        </nav>
      </div>

      <Section id="pages" title="The pages">
        <dl className="flex flex-col gap-3">
          <Term name="Rules">
            What the rules say right now (page title <em>Spec rules</em>). Tabs: <em>By type</em> and <em>By option</em> (what goes with
            what), <em>Product exceptions</em> (where one product differs from its line), <em>Needs attention</em>
            (rules that look wrong or incomplete), and <em>Old explorer rules</em> (the old explorer's hand-written rules
            and where each stands). To change a rule, use <em>edit</em> on its row or select the record on the <em>Map</em>,
            then <em>Edit rules</em>; changes go through the Registry for approval.
          </Term>
          <Term name="Registry">
            Proposed changes waiting for a decision (the number next to it), plus the <strong>Sync</strong> panel and recent syncs. A frame is one group of
            related changes; open it to see every row as a sentence.
          </Term>
          <Term name="Catalog">
            Every record as a table, in three tabs — <em>Products</em>, <em>Customizations</em>, <em>Solutions</em> — with
            a <em>Show</em> picker for the level: product lines → styles → standard products → product properties &amp; values;
            categories → types → options → option properties &amp; values; solutions → solution styles → inspiration
            products. Properties and their values are one shared list; each stream shows the ones it uses, and how many
            of its records use each value. Search, filter by status
            or parent, choose columns (<em>Columns</em>), drag a header to move it, click a header to sort or hide it. A
            product's or option's name opens its page: for an option, what it offers, how a customer configures it, and its
            exceptions. Your column choice is remembered in your browser.
          </Term>
        </dl>
        <p>
          <strong>Copy</strong> next to a record's Registry ID copies it. <strong>Edit in Studio</strong>{" "}
          opens the record in Sanity Studio, where content is edited.
        </p>
      </Section>

      <Section id="sync" title="Syncing and approving">
        <p>
          Notion and Sanity can both change the catalog. <strong>The sync you run decides which one is the source</strong>
          {" "}for that round: it proposes what <em>its</em> side changed, and you approve or not.
        </p>
        <dl className="flex flex-col gap-3">
          <Term name="Sync Changes">
            On Registry. Compares Sanity with the registry. Names, status and content that Sanity owns are{" "}
            <strong>copied in straight away</strong>, no frame (see <a href="#owners" className="text-foreground underline underline-offset-2">Who owns what</a>);
            relations and SKUs are proposed as frames named <em>Spec registry · …</em>. Approvers and admins.
          </Term>
          <Term name="Sync Notion">
            In your avatar menu (top right), admins only. Compares Notion with Sanity and proposes Sanity changes —
            frames named <em>Website content · …</em>. Approved ones are written to Sanity; run Sync Changes afterwards to
            carry them into the registry.
          </Term>
          <Term name="Automatic">
            Sync Changes also runs by itself: every 10 minutes the system checks whether a catalog record was published
            in Sanity since the last run, and runs it if so — marked <em>Automatic</em>. When nothing was published,
            nothing runs and Sync history shows no entry, so overnight gaps are normal. A frame waiting for review is
            never replaced: content still applies, and the relation changes held behind it are proposed once that frame
            is decided. Sync Notion never runs by itself.
          </Term>
          <Term name="Dataset">Development only for now. Production follows its catalog rebuild.</Term>
        </dl>
        <p>
          <strong>Only what changed since it was last decided is proposed.</strong> Approving, excluding or discarding a
          change records it as decided. It is not proposed again unless its source changes it again — so an edit made on
          the other side is never pushed back by accident.
        </p>
        <dl className="flex flex-col gap-3">
          <Term name="Approve">Applies every included row of the frame at once. It cannot be undone.</Term>
          <Term name="Discard">Drops the frame. Its changes count as decided (they stay quiet until their source changes).</Term>
          <Term name="Exclude / Include">
            On sync frames: leaves one record out of the approval — all of its rows together — and approve the rest. An
            excluded change counts as decided too.
          </Term>
          <Term name="Re-sync">
            On a pending sync frame: runs that sync again. Its pending frames are <em>replaced</em> with the newest values
            (the old frame is marked superseded). Undecided changes come back; a row marked <em>New since last sync</em>{" "}
            was not in the frame it replaced.
          </Term>
          <Term name="Compare">
            On rows bound for Sanity: Sanity's value next to the proposed one. When only formatting differs (e.g.
            paragraphs vs a bulleted list), it says so.
          </Term>
        </dl>
        <p>
          <strong>After you approve a Website content frame</strong>, each row shows <em>Writing to Sanity…</em>, then
          {" "}<em>Written to Sanity</em> — or why it was not: <em>changed in Sanity since</em> (someone edited it after
          the proposal, so it was not overwritten) or <em>failed</em>. Rows that were not written are listed in the Sync
          panel and are <strong>not</strong> counted as decided: run the same sync again and they are proposed again with
          current values.
        </p>
        <p>
          Failed sync runs stop showing once a later run of the same kind succeeds; you can also <strong>Dismiss</strong>{" "}
          one. Runs are kept as history either way.
        </p>
        <p>
          <strong>Sync history</strong> (from the Sync panel: <em>All syncs and results</em>) lists every sync with
          who started it, the frames it produced and what was decided on each. For an approved frame, the next sync of
          the same kind <strong>re-checks</strong> it: <em>all fields still match</em> means the change landed and holds;
          otherwise it names the rows that no longer match — not written, or changed again since.
        </p>
      </Section>

      <Section id="owners" title="Who owns what">
        <p>
          Each field is edited in one place. Edit it there; a change made anywhere else is overwritten or never copied.
          <em> Automatic</em> means Sync Changes copies Sanity's value into the registry with no frame, and records it in
          Sync history and on the record (<em>Changes from Sanity</em>).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-foreground">
                <th className="py-2 pr-3 font-medium">Fields</th>
                <th className="py-2 pr-3 font-medium">Edit in</th>
                <th className="py-2 pr-3 font-medium">Reaches the registry</th>
                <th className="py-2 pr-3 font-medium">Reaches Sanity</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border align-top last:border-0">
                <td className="py-2 pr-3"><div className="font-medium text-foreground">Names</div><div className="text-xs">options, lines, styles, products, solutions, solution styles, properties, property values</div></td>
                <td className="py-2 pr-3 text-foreground">Studio</td>
                <td className="py-2 pr-3">Automatic</td>
                <td className="py-2 pr-3">—<div className="mt-1 text-xs">Sanity is the only owner of names. Sync Notion reports a different name; it does not propose it. Category and type names are not copied to the registry.</div></td>
              </tr>
              <tr className="border-b border-border align-top last:border-0">
                <td className="py-2 pr-3"><div className="font-medium text-foreground">Status</div><div className="text-xs">every record</div></td>
                <td className="py-2 pr-3 text-foreground">Studio</td>
                <td className="py-2 pr-3">Automatic</td>
                <td className="py-2 pr-3">—<div className="mt-1 text-xs">Sync Notion can propose a status (products: from Notion's <em>Sanity Status</em> column only).</div></td>
              </tr>
              <tr className="border-b border-border align-top last:border-0">
                <td className="py-2 pr-3"><div className="font-medium text-foreground">Slugs</div><div className="text-xs">lines, styles, products, solution styles</div></td>
                <td className="py-2 pr-3 text-foreground">Studio</td>
                <td className="py-2 pr-3">Automatic</td>
                <td className="py-2 pr-3">—</td>
              </tr>
              <tr className="border-b border-border align-top last:border-0">
                <td className="py-2 pr-3"><div className="font-medium text-foreground">Properties and values</div><div className="text-xs">the values set on options and standard products; a value's label, facts and kind-of; a property's name</div></td>
                <td className="py-2 pr-3 text-foreground">Studio</td>
                <td className="py-2 pr-3">Automatic</td>
                <td className="py-2 pr-3">—<div className="mt-1 text-xs">Stays in Studio after the switch below. Sync Notion may add values to a product, never remove them.</div></td>
              </tr>
              <tr className="border-b border-border align-top last:border-0">
                <td className="py-2 pr-3"><div className="font-medium text-foreground">Solution axis</div><div className="text-xs">solution type</div></td>
                <td className="py-2 pr-3 text-foreground">Notion</td>
                <td className="py-2 pr-3">Automatic</td>
                <td className="py-2 pr-3">—<div className="mt-1 text-xs">Proposed by Sync Notion, then copied in from Sanity.</div></td>
              </tr>
              <tr className="border-b border-border align-top last:border-0">
                <td className="py-2 pr-3"><div className="font-medium text-foreground">Website copy</div><div className="text-xs">short name, H1, descriptions, short descriptions, meta descriptions, benefits, MOQ</div></td>
                <td className="py-2 pr-3 text-foreground">Notion</td>
                <td className="py-2 pr-3">Not copied</td>
                <td className="py-2 pr-3">—<div className="mt-1 text-xs">Sync Notion proposes it; approved rows are written to Sanity.</div></td>
              </tr>
              <tr className="border-b border-border align-top last:border-0">
                <td className="py-2 pr-3"><div className="font-medium text-foreground">Rules</div><div className="text-xs">decided by / customer selects, depends on, compatible customizations, available customizations, product exceptions</div></td>
                <td className="py-2 pr-3 text-foreground">Studio or Spec System</td>
                <td className="py-2 pr-3">Studio edit: a frame to approve</td>
                <td className="py-2 pr-3">Spec edit: on approval<div className="mt-1 text-xs">Both can edit until the switch below is turned. An approved Spec System change wins over Studio.</div></td>
              </tr>
              <tr className="border-b border-border align-top last:border-0">
                <td className="py-2 pr-3"><div className="font-medium text-foreground">Parents</div><div className="text-xs">a product's line, styles, solutions and base product; a style's line; a type's category; an option's type; a solution style's solution</div></td>
                <td className="py-2 pr-3 text-foreground">Studio or Spec System</td>
                <td className="py-2 pr-3">Studio edit: a frame to approve</td>
                <td className="py-2 pr-3">Spec edit (Map): on approval<div className="mt-1 text-xs">A move re-issues the registry code (the ID never changes) and adds a redirect. Sync Notion can also propose parents.</div></td>
              </tr>
              <tr className="border-b border-border align-top last:border-0">
                <td className="py-2 pr-3"><div className="font-medium text-foreground">SKU</div><div className="text-xs">standard products</div></td>
                <td className="py-2 pr-3 text-foreground">Studio</td>
                <td className="py-2 pr-3">A frame to approve</td>
                <td className="py-2 pr-3">—<div className="mt-1 text-xs">Permanent once set.</div></td>
              </tr>
              <tr className="border-b border-border align-top last:border-0">
                <td className="py-2 pr-3"><div className="font-medium text-foreground">New solution styles</div><div className="text-xs">the record itself</div></td>
                <td className="py-2 pr-3 text-foreground">Studio</td>
                <td className="py-2 pr-3">A frame to approve</td>
                <td className="py-2 pr-3">—</td>
              </tr>
              <tr className="border-b border-border align-top last:border-0">
                <td className="py-2 pr-3"><div className="font-medium text-foreground">Display order and filters</div><div className="text-xs">order lists, solution style filters, an inspiration product's pre-selected customizations</div></td>
                <td className="py-2 pr-3 text-foreground">Studio</td>
                <td className="py-2 pr-3">Not copied</td>
                <td className="py-2 pr-3">—<div className="mt-1 text-xs">Stays in Studio after the switch.</div></td>
              </tr>
              <tr className="border-b border-border align-top last:border-0">
                <td className="py-2 pr-3"><div className="font-medium text-foreground">Media, SEO titles, templates, featured and related lists, lead time</div></td>
                <td className="py-2 pr-3 text-foreground">Studio (media from Drive)</td>
                <td className="py-2 pr-3">Not copied</td>
                <td className="py-2 pr-3">—</td>
              </tr>
              <tr className="border-b border-border align-top last:border-0">
                <td className="py-2 pr-3"><div className="font-medium text-foreground">Registry ID and code</div><div className="text-xs">every record</div></td>
                <td className="py-2 pr-3 text-foreground">Spec System</td>
                <td className="py-2 pr-3">—</td>
                <td className="py-2 pr-3">Written to Sanity<div className="mt-1 text-xs">Read-only in Studio.</div></td>
              </tr>
            </tbody>
          </table>
        </div>
        <dl className="flex flex-col gap-3">
          <Term name="How fast">
            <strong>Sanity → Spec System:</strong> within about 10 minutes of publishing — the next automatic check — for
            the <em>Automatic</em> rows. Relations from Studio wait in a frame until someone approves it.{" "}
            <strong>Spec System → Sanity:</strong> the moment a rule or parent change is approved (including{" "}
            <em>Submit &amp; approve</em>), on both the published record and any Studio draft.
          </Term>
          <Term name="Inspiration products">
            Show their base product's properties. A difference from the base is reported on each run, never copied in —
            fix it in Studio.
          </Term>
          <Term name="The switch">
            Registry → <em>Who edits catalog relations</em>. Set to Spec System, rules and parents become read-only in
            Studio (parents only once a record has a Registry ID) and Sync Changes stops proposing them. Today Studio
            and the Spec System can both edit them.
          </Term>
        </dl>
      </Section>

      <Section id="structure" title="How the catalog is structured">
        <dl className="flex flex-col gap-3">
          <Term name="Customization stream">
            <strong>Category → Type → Option</strong>, e.g. Finishing → Foiling Technique → Hot Foil Stamping. An option belongs
            to one type; a type to one category.
          </Term>
          <Term name="Product stream">
            <strong>Line → Style → Product</strong>, e.g. Rigid Boxes → Double Door Rigid Boxes → Custom Double Door
            Rigid Boxes. A product's first style is its primary; others are extra listings.
          </Term>
          <Term name="Inspiration products">
            Presets based on one standard product (its line and style come from it), filed under one or more solutions
            — the first is the primary.
          </Term>
          <Term name="Properties">
            Shared by both streams. A product or option can <em>state</em> a value, let the <em>customer pick</em>, or
            state it <em>hidden</em> (used by rules, not shown).
          </Term>
        </dl>
      </Section>

      <Section id="status" title="Status">
        <p>One status field on every catalog record:</p>
        <dl className="flex flex-col gap-3">
          <Term name="Active">Live: page, listings, orderable.</Term>
          <Term name="Coming soon">Visible but not orderable yet.</Term>
          <Term name="Discontinued">Page stays and says so; drops out of listings; not orderable.</Term>
          <Term name="Not active">Not launched: nothing anywhere; kept only to be referenced.</Term>
          <Term name="Active (Internal)">
            Launched but internal: no page, but it still works as structure (e.g. the base of an inspiration product).
          </Term>
        </dl>
        <p>
          Each type offers a subset: inspiration products never <em>Active (Internal)</em>; solutions never{" "}
          <em>Discontinued</em>; customization options only <em>Active</em> or <em>Not active</em>. A product's status
          from Notion comes only from its <strong>Sanity Status</strong> column.
        </p>
      </Section>

      <Section id="codes" title="Registry IDs and codes">
        <dl className="flex flex-col gap-3">
          <Term name="Registry ID">
            Permanent and never changes — not on rename, move or retirement. Looks like <code>prd_01kzy6…</code> (a
            kind prefix plus a unique part).
          </Term>
          <Term name="Registry code">
            Readable: <code>KIND-PARENT-SEQ-CHECK</code>, e.g. <code>PRD-LBL-0214-4</code> or{" "}
            <code>OPT-FIN-0348-5</code>. <strong>KIND</strong> is the record type (inspiration products use{" "}
            <code>INS</code>); <strong>PARENT</strong> a 3-letter mnemonic of its parent; <strong>SEQ</strong> a number
            counted per kind; <strong>CHECK</strong> a last character that catches a mistyped character or two swapped
            neighbours. Categories and lines have short codes, e.g. <code>CAT-FIN</code>, <code>LIN-FCT</code>.
          </Term>
          <Term name="When a record moves">
            It keeps its number and gets a new code under its new parent; the old code still works as an alias.
          </Term>
        </dl>
      </Section>

      <Section id="why" title="Why did…?">
        <dl className="flex flex-col gap-3">
          <Term name="…a change I approved come back?">
            It was not written to Sanity (see the Sync panel), or its source changed it again since.
          </Term>
          <Term name="…my Studio edit not show up in Sync Notion?">
            Sync Notion only proposes what Notion changed. Run Sync Changes to carry Studio edits into the registry.
          </Term>
          <Term name="…a frame I was looking at disappear?">
            A newer run of the same sync replaced it. Its undecided changes are in the new frame.
          </Term>
          <Term name="…my Studio edit take a few minutes to show here?">
            Automatic runs check every 10 minutes. Names, status and content arrive with the next one; rules and parents
            arrive as a frame to approve. To bring it in now, run <strong>Sync Changes</strong>.
          </Term>
          <Term name="…a sync propose nothing?">
            Everything that differs has already been decided, or both sides already agree.
          </Term>
        </dl>
      </Section>
    </div>
  );
}
