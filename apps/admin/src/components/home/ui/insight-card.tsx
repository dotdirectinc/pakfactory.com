import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@pakfactory/ui/components/card";

export type InsightCardProps = {
  title: string;
  description: ReactNode;
  children: ReactNode;
};

/** Props-only insight tile. Chart / report CTA stay in children. */
export function InsightCard({ title, description, children }: InsightCardProps) {
  return (
    <Card className="flex h-full flex-col gap-4">
      <CardHeader className="gap-2">
        <CardTitle className="text-base leading-snug font-semibold tracking-tight">
          {title}
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-auto flex flex-col gap-3 pt-2">
        {children}
      </CardContent>
    </Card>
  );
}
