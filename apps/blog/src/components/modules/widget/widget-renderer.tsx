import type { PostBodyWidget } from "@/lib/blog-post";
import { WidgetCta } from "@/components/modules/widget/widget-cta";
import { WidgetProductCard } from "@/components/modules/widget/widget-product-card";

type WidgetRendererProps = {
  widget?: PostBodyWidget | null;
};

/** Dispatches embedded post-body widgets by `widgetType`. */
export function WidgetRenderer({ widget }: WidgetRendererProps) {
  if (!widget?.widgetType) return null;

  switch (widget.widgetType) {
    case "cta":
      return <WidgetCta widget={widget} />;
    case "product-card":
      return <WidgetProductCard widget={widget} />;
    default:
      return null;
  }
}
