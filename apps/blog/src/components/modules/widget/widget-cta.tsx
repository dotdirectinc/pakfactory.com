import Link from "next/link";
import { Button } from "@pakfactory/ui/components/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@pakfactory/ui/components/card";
import type { PostBodyWidget } from "@/lib/blog-post";

type WidgetCtaProps = {
  widget: PostBodyWidget;
};

/** CTA block widget embedded in post body portable text. */
export function WidgetCta({ widget }: WidgetCtaProps) {
  return (
    <Card className="my-8 bg-muted/30">
      <CardHeader>
        {widget.headline ? <CardTitle>{widget.headline}</CardTitle> : null}
        {widget.subtext ? <CardDescription>{widget.subtext}</CardDescription> : null}
      </CardHeader>
      {widget.buttonLabel && widget.buttonUrl ? (
        <CardFooter>
          <Button asChild variant={widget.variant === "secondary" ? "outline" : "default"}>
            <Link href={widget.buttonUrl}>{widget.buttonLabel}</Link>
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
