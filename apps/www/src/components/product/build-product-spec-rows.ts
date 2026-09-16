import type {LucideIcon} from 'lucide-react';
import {
    CircleDot,
    Layers,
    Magnet,
    Package,
    Palette,
    Sparkles,
    Square,
    Star,
    Tag,
} from 'lucide-react';

import type {Product} from '@/lib/catalog/types';
import {productStyleHref} from '@/lib/www-routes';

export type ProductSpecChip = {
    label: string;
    href?: string;
};

export type ProductSpecValue =
    | {kind: 'text'; text: string}
    | {kind: 'chips'; items: ProductSpecChip[]};

export type ProductSpecRow = {
    label: string;
    value: ProductSpecValue;
    icon?: LucideIcon;
};

/** Buy-box facts — not shown in “The details” table (POC). */
const EXCLUDED_SPEC_LABELS = new Set([
    'Dimensions',
    'Minimum order',
    'MOQ',
    'Lead time',
    'Pricing',
]);

const SPEC_LABEL_ICONS: Record<string, LucideIcon> = {
    Style: Layers,
    'Structure type': Layers,
    Closure: Magnet,
    Shape: Square,
    'Base material': Package,
    'Wrapping options': Palette,
    'Surface finishes': Sparkles,
    'Special finishes': Star,
    'Best for': Tag,
};

/** Build buyer-facing style-fact rows from catalog properties (PROD-1913). */
export function buildProductSpecRows(product: Product): ProductSpecRow[] {
    const rows: ProductSpecRow[] = [];
    const style = product.productStyle;
    const line = product.productLine;
    const injectedStyle = Boolean(style?.title && style?.slug && line?.slug);

    if (injectedStyle) {
        rows.push({
            label: 'Style',
            icon: SPEC_LABEL_ICONS.Style,
            value: {
                kind: 'chips',
                items: [
                    {
                        label: style.title,
                        href: productStyleHref(line.slug, style.slug),
                    },
                ],
            },
        });
    }

    for (const property of product.properties ?? []) {
        const label = property.label.trim();
        if (!label || EXCLUDED_SPEC_LABELS.has(label)) continue;
        if (injectedStyle && label.toLowerCase() === 'style') continue;
        const text = property.value.trim() || 'N/A';
        rows.push({
            label,
            value: {kind: 'text', text},
            icon: SPEC_LABEL_ICONS[label] ?? CircleDot,
        });
    }

    return rows;
}
