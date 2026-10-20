import type {PropertySelectionMap} from '@/components/customization/option-property-controllers';
import {MAX_ATTACHMENT_BYTES} from '@/lib/rfq/use-attachment-upload';
import type {
    CustomColorReferenceImage,
    CustomColorReferencesByOption,
} from '@/lib/customization-builder/types';

export type {
    CustomColorReferenceImage,
    CustomColorReferenceEntry,
    CustomColorReferencesByOption,
} from '@/lib/customization-builder/types';

/** Reserved propertySelections key prefix — mirrors Pantone’s extra keys. */
export const CUSTOM_COLOR_HEX_KEY_PREFIX = 'custom-color-hex:';

/** PNG / JPEG / WebP only (stricter than line reference uploads). */
export const CUSTOM_COLOR_ALLOWED_TYPES = [
    'image/png',
    'image/jpeg',
    'image/webp',
] as const;

export function customColorHexKey(propertyKey: string): string {
    return `${CUSTOM_COLOR_HEX_KEY_PREFIX}${propertyKey}`;
}

export function isCustomColorHexKey(key: string): boolean {
    return key.startsWith(CUSTOM_COLOR_HEX_KEY_PREFIX);
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function normalizeCustomColorHex(value: string): string | null {
    const trimmed = value.trim();
    if (!HEX_RE.test(trimmed)) return null;
    return trimmed.toLowerCase();
}

export function readCustomColorHex(
    selection: PropertySelectionMap | undefined,
    propertyKey: string,
): string | undefined {
    const raw = selection?.[customColorHexKey(propertyKey)]?.[0];
    if (typeof raw !== 'string') return undefined;
    return normalizeCustomColorHex(raw) ?? undefined;
}

export function withCustomColorHex(
    selection: PropertySelectionMap,
    propertyKey: string,
    hex: string | null,
): PropertySelectionMap {
    const key = customColorHexKey(propertyKey);
    const next = {...selection};
    if (!hex) {
        delete next[key];
        return next;
    }
    const normalized = normalizeCustomColorHex(hex);
    if (!normalized) {
        delete next[key];
        return next;
    }
    next[key] = [normalized];
    return next;
}

/** Drop hex when leaving Custom Color. */
export function clearCustomColorHex(
    selection: PropertySelectionMap,
    propertyKey: string,
): PropertySelectionMap {
    return withCustomColorHex(selection, propertyKey, null);
}

export function customColorFileRejectionReason(file: File): string | null {
    if (
        !(CUSTOM_COLOR_ALLOWED_TYPES as readonly string[]).includes(file.type)
    ) {
        return `${file.name} must be PNG, JPG, or WebP.`;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
        return `${file.name} is larger than 25MB.`;
    }
    if (file.size === 0) {
        return `${file.name} is empty.`;
    }
    return null;
}

/** Readable name for the admin attachment list. */
export function formatCustomColorAttachmentName(
    propertyLabel: string,
    originalName: string,
): string {
    const label = propertyLabel.trim() || 'Color';
    return `Color reference — ${label} — ${originalName}`;
}

export function customColorSummaryLabel(
    optionTitle: string,
    hex: string | undefined,
): string {
    if (!hex) return optionTitle;
    return `${optionTitle} · ${hex}`;
}

/** Flatten uploaded color-reference images (with an S3 key) for wire submit. */
export function uploadedCustomColorImages(
    refs: CustomColorReferencesByOption | undefined,
): CustomColorReferenceImage[] {
    const out: CustomColorReferenceImage[] = [];
    if (!refs) return out;
    for (const byProp of Object.values(refs)) {
        if (!byProp) continue;
        for (const entry of Object.values(byProp)) {
            const image = entry?.image;
            if (image?.key) out.push(image);
        }
    }
    return out;
}
