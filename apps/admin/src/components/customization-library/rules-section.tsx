import { Badge } from "@pakfactory/ui/components/badge";
import { DEPS, LOGIC } from "@/lib/customization/rules-data";

export function RulesSection() {
  return (
    <section id="rules" className="pt-8">
      <div className="mb-2 flex items-baseline gap-3 border-t border-border pt-4">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Rules reference
        </h2>
      </div>
      <p className="mb-4 max-w-[74ch] text-sm text-muted-foreground">
        Two different kinds of work, so two tables.{" "}
        <b className="text-foreground">A — Field dependencies</b> asks{" "}
        <i>what determines the contents of this list</i>; most resolve to a
        mapping table that lives outside this page and still needs building.{" "}
        <b className="text-foreground">B — Logic rules</b> is the if-X-then-Y
        behaviour the form itself performs. Every row needs a confirm.
      </p>

      <h3 className="mt-6 mb-1 flex items-baseline gap-2 text-sm font-semibold text-foreground">
        A · Field dependencies{" "}
        <span className="font-medium text-xs text-muted-foreground">
          what determines each list
        </span>
      </h3>
      <p className="mb-2 max-w-[76ch] text-xs text-muted-foreground">
        None of these run in the sandbox — the mapping data doesn&apos;t exist
        yet. Each row is a table someone has to author.
      </p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-2 py-2">#</th>
              <th className="px-2 py-2">Field</th>
              <th className="px-2 py-2">Driven by</th>
              <th className="px-2 py-2">Resolved by</th>
              <th className="px-2 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {DEPS.map((d) => (
              <tr
                key={d.id}
                className="border-b border-muted last:border-b-0 hover:bg-muted/50"
              >
                <td className="whitespace-nowrap px-2 py-2 font-bold text-primary">
                  {d.id}
                </td>
                <td className="px-2 py-2">
                  <b className="text-foreground">{d.field}</b>
                </td>
                <td className="px-2 py-2 text-muted-foreground">
                  {d.drivenBy}
                </td>
                <td className="px-2 py-2">
                  <Badge variant="outline" className="font-semibold">
                    {d.resolvedBy}
                  </Badge>
                </td>
                <td className="px-2 py-2 font-semibold text-[var(--chart-4)]">
                  Confirm
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mt-6 mb-1 flex items-baseline gap-2 text-sm font-semibold text-foreground">
        B · Logic rules{" "}
        <span className="font-medium text-xs text-muted-foreground">
          if X then Y
        </span>
      </h3>
      <p className="mb-2 max-w-[76ch] text-xs text-muted-foreground">
        All of these are fully specified by the conditions in the catalogue, and
        all of them run live in the sandbox above.
      </p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-2 py-2">Rule</th>
              <th className="px-2 py-2">When (trigger)</th>
              <th className="px-2 py-2">Then (effect)</th>
              <th className="px-2 py-2">Type</th>
              <th className="px-2 py-2">Applies to</th>
              <th className="px-2 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {LOGIC.map((r) => (
              <tr
                key={r.id}
                className="border-b border-muted last:border-b-0 hover:bg-muted/50"
              >
                <td className="whitespace-nowrap px-2 py-2 font-bold text-primary">
                  {r.id}
                </td>
                <td className="px-2 py-2 text-muted-foreground">{r.when}</td>
                <td className="px-2 py-2 text-muted-foreground">{r.then}</td>
                <td className="px-2 py-2">
                  <Badge variant="outline" className="font-semibold">
                    {r.type}
                  </Badge>
                </td>
                <td className="px-2 py-2 text-muted-foreground">
                  {r.appliesTo}
                </td>
                <td className="whitespace-nowrap px-2 py-2">
                  <span className="font-bold text-primary">● Live</span>{" "}
                  <span className="font-semibold text-[var(--chart-4)]">
                    Confirm
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
