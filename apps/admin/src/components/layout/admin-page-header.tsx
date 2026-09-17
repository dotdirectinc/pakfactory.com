import type { ReactNode } from "react";
import { cn } from "@pakfactory/ui/lib/utils";
import { AdminPageContainer } from "@/components/layout/admin-page-container";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <AdminPageContainer
      className={cn("flex flex-col gap-2 pt-6", className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          {description ? (
            <div className="max-w-3xl text-sm text-muted-foreground">
              {description}
            </div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </AdminPageContainer>
  );
}
