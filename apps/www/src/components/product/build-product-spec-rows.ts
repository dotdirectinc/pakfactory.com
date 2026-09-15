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

export type ProductSpecRow = {
    label: string;
    value: string;
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

    for (const property of product.properties ?? []) {
        const label = property.label.trim();
        if (!label || EXCLUDED_SPEC_LABELS.has(label)) continue;
        const value = property.value.trim() || 'N/A';
        rows.push({
            label,
            value,
            icon: SPEC_LABEL_ICONS[label] ?? CircleDot,
        });
    }

    return rows;
}
