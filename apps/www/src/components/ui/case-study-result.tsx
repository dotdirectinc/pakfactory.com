import * as React from "react";
import {
  Card,
  CardContent,
} from "@pakfactory/ui/components/card";
import { cn } from "@pakfactory/ui/lib/utils";

export type CaseStudyResultProps = {
  value: string;
  metric: string;
  description?: string | null;
  className?: string;
};

export function CaseStudyResult({
  value,
  metric,
  description,
  className,
}: CaseStudyResultProps) {
  return (
    <Card className={cn("flex flex-col items-center text-center", className)}>
      <CardContent className="pt-6 flex flex-col items-center gap-1">
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        <p className="font-medium">{metric}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
