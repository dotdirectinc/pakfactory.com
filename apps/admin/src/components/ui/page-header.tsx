import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@pakfactory/ui/lib/utils";
import { PageLead } from "@/components/ui/page-lead";

/**
 * A page's header: an optional back link, the title (with an optional badge beside it), the description
 * held to two lines, and an optional action on the right.
 *
 * The same header is rendered by the page and by its `loading.tsx`. The title and description are fixed
 * text, so the loading state shows them for real rather than as grey bars: the description is usually
 * the largest text on screen — the page's LCP (2026-10-20: 2.45 s on /spec while it waited behind the
 * route's loading boundary) — and it is now painted with the first frame.
 */
export function PageHeader({
  title,
  lead,
  leadClassName,
  back,
  badge,
  aside,
  className,
}: {
  title: ReactNode;
  lead?: ReactNode;
  /** The description's width (PageLead defaults to max-w-3xl). */
  leadClassName?: string;
  back?: { href: string; label: string };
  badge?: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="flex min-w-0 flex-col gap-1">
        {back ? (
          <Link href={back.href} className="text-sm text-muted-foreground underline-offset-2 hover:underline">
            ← {back.label}
          </Link>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          {badge}
        </div>
        {lead ? <PageLead className={leadClassName}>{lead}</PageLead> : null}
      </div>
      {aside}
    </div>
  );
}
