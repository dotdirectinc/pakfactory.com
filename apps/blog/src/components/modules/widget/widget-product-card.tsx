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

type WidgetProductCardProps = {
  widget: PostBodyWidget;
};

/** Product card widget embedded in post body portable text. */
export function WidgetProductCard({ widget }: WidgetProductCardProps) {
  if (!widget.productTitle) return null;

  return (
    <Card className="my-8">
      <CardHeader>
        <CardTitle>{widget.productTitle}</CardTitle>
        {widget.productExcerpt ? (
          <CardDescription>{widget.productExcerpt}</CardDescription>
        ) : null}
      </CardHeader>
      {widget.productSlug ? (
        <CardFooter>
          <Button asChild variant="outline">
            <Link href={`https://www.pakfactory.com/products/${widget.productSlug}`}>
              View product
            </Link>
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
