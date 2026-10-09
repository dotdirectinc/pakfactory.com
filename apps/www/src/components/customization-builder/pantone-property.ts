import type {PropertySelectionMap} from '@/components/customization/option-property-controllers';
import type {
    BuilderOption,
    PropertySelectionSummaryItem,
} from '@/lib/customization-builder';

/** Encoded under option propertySelections (string arrays). */
export const PANTONE_COUNT_KEY = 'pantone-count';
export const PANTONE_PMS_KEY = 'pantone-pms';
export const PANTONE_MAX_COUNT = 3;

/**
 * @deprecated Prefer a selectable declared property with `control: "pantone"`.
 * Title sniff kept for any leftover callers until content is backfilled.
 */
export function optionNeedsPantoneControllers(
    option: Pick<BuilderOption, 'slug' | 'title'>,
): boolean {
    const hay = `${option.slug} ${option.title}`.toLowerCase();
    return hay.includes('pantone') || hay.includes('hybrid');
}

export function clampPantoneCount(value: number): number {
    if (!Number.isFinite(value)) return 1;
    return Math.min(PANTONE_MAX_COUNT, Math.max(1, Math.floor(value)));
}

export function resizePantoneCodes(codes: string[], count: number): string[] {
    const n = clampPantoneCount(count);
    const next = codes.slice(0, n);
    while (next.length < n) next.push('');
    return next;
}

export function readPantoneSelection(selection: PropertySelectionMap): {
    count: number;
    codes: string[];
} {
    const raw = Number(selection[PANTONE_COUNT_KEY]?.[0] ?? '1');
    const count = clampPantoneCount(raw);
    const codes = resizePantoneCodes(selection[PANTONE_PMS_KEY] ?? [], count);
    return {count, codes};
}

export function defaultPantoneSelection(): PropertySelectionMap {
    return {
        [PANTONE_COUNT_KEY]: ['1'],
        [PANTONE_PMS_KEY]: [''],
    };
}

export function pantoneSelectionPatch(
    count: number,
    codes: string[],
): PropertySelectionMap {
    const n = clampPantoneCount(count);
    return {
        [PANTONE_COUNT_KEY]: [String(n)],
        [PANTONE_PMS_KEY]: resizePantoneCodes(codes, n),
    };
}

export function hasPantoneSelection(
    selection: PropertySelectionMap | undefined,
): boolean {
    return Boolean(selection?.[PANTONE_COUNT_KEY]?.[0]);
}

/** Rail / review chips for Pantone count + filled PMS codes. */
export function summariesForPantoneSelection(
    selection: PropertySelectionMap,
): PropertySelectionSummaryItem[] {
    if (!hasPantoneSelection(selection)) return [];
    const {count, codes} = readPantoneSelection(selection);
    const filled = codes.map((c) => c.trim()).filter(Boolean);
    const label =
        filled.length > 0
            ? `${count} Pantone · ${filled.join(', ')}`
            : `${count} Pantone`;
    return [
        {
            kind: 'chip',
            label,
            omitFromSummary: false,
        },
    ];
}
