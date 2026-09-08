import type {CustomizationCategory} from '@/lib/catalog/types';
import {
    DIMENSIONS_STEP_KEY,
    EMPTY_BUILDER_STATE,
    EMPTY_DIMENSIONS,
    EMPTY_FACE,
    dimensionEntryNoteKey,
    type BuilderOption,
    type BuilderStep,
    type BuilderStepKey,
    type BuilderType,
    type CatalogOptionLike,
    type CustomizationBuilderState,
    type DimensionFace,
    type DimensionsValue,
    type FaceMeasurements,
    type StepAnswer,
} from '@/lib/customization-builder/types';

export type BuilderRequestCustomization = {
    id: string;
    label: string;
    category: CustomizationCategory;
};

const DIMENSIONS_META = {
    label: 'Dimensions',
    description: 'Outside length, width, and height for this structure.',
} as const;

export function createEmptyBuilderState(): CustomizationBuilderState {
    return {
        answers: {},
        guidedComplete: false,
        entryNotes: {},
    };
}

export function getAnswer(
    state: CustomizationBuilderState,
    key: BuilderStepKey,
): StepAnswer {
    return state.answers[key] ?? {status: 'unset'};
}

function faceIsFilled(face: FaceMeasurements): boolean {
    return Boolean(
        face.length.trim() && face.width.trim() && face.height.trim(),
    );
}

export function isAnswerReady(answer: StepAnswer | undefined): boolean {
    if (!answer || answer.status === 'unset') return false;
    if (answer.status === 'not-sure') return true;
    if ('dimensions' in answer) {
        return (
            faceIsFilled(answer.dimensions.external) ||
            faceIsFilled(answer.dimensions.internal)
        );
    }
    if ('selection' in answer) {
        return Boolean(answer.selection.optionId);
    }
    return false;
}

/**
 * First guided step that is still unset / incomplete.
 * Indices `<=` this value are clickable; later steps are locked.
 * Returns `steps.length` when every step is ready.
 */
export function firstUnresolvedStepIndex(
    state: CustomizationBuilderState,
    steps: BuilderStep[],
): number {
    const index = steps.findIndex(
        (step) => !isAnswerReady(getAnswer(state, step.key)),
    );
    return index === -1 ? steps.length : index;
}

/** Any self-serve signal means the item is configured and skips guided. */
export function isBuilderConfigured(state: CustomizationBuilderState): boolean {
    if (state.guidedComplete) return true;
    return Object.values(state.answers).some(
        (answer) => answer !== undefined && answer.status !== 'unset',
    );
}

export function shouldEnterGuided(state: CustomizationBuilderState): boolean {
    return !isBuilderConfigured(state);
}

export function isBuilderReady(
    state: CustomizationBuilderState,
    steps: BuilderStep[],
): boolean {
    if (steps.length === 0) return true;
    return steps.every((step) => isAnswerReady(getAnswer(state, step.key)));
}

export function formatFaceSummary(
    face: FaceMeasurements,
    unit: DimensionsValue['unit'],
): string {
    const l = face.length.trim();
    const w = face.width.trim();
    const h = face.height.trim();
    if (!l && !w && !h) return '';
    return `${l || '—'} × ${w || '—'} × ${h || '—'} ${unit}`;
}

export function formatDimensionsSummary(value: DimensionsValue): string {
    const ext = formatFaceSummary(value.external, value.unit);
    const inn = formatFaceSummary(value.internal, value.unit);
    if (ext && inn) return `Ext ${ext} · Int ${inn}`;
    if (ext) return `Ext ${ext}`;
    if (inn) return `Int ${inn}`;
    return '';
}

export function summarizeAnswer(
    answer: StepAnswer,
    specialistLabel: string,
): string {
    if (answer.status === 'unset') return 'Not set';
    if (answer.status === 'not-sure') return specialistLabel;
    if ('dimensions' in answer) {
        return formatDimensionsSummary(answer.dimensions) || 'Not set';
    }
    return answer.selection.label;
}

function dimensionsStep(): BuilderStep {
    return {
        key: DIMENSIONS_STEP_KEY,
        label: DIMENSIONS_META.label,
        description: DIMENSIONS_META.description,
        kind: 'dimensions',
        types: [
            {
                id: 'external',
                slug: 'external',
                title: 'External',
                categoryId: 'dimensions',
                cardinality: 'one',
                description: 'Outside length, width, and height.',
            },
            {
                id: 'internal',
                slug: 'internal',
                title: 'Internal',
                categoryId: 'dimensions',
                cardinality: 'one',
                description: 'Inside length, width, and height.',
            },
        ],
        options: [],
    };
}

/**
 * Build guided/workspace steps from the product's available customizations.
 * Categories/types/options come only from that set (Sanity option → type → category).
 */
export function buildStepsFromCatalog(
    available: CatalogOptionLike[],
): BuilderStep[] {
    const steps: BuilderStep[] = [dimensionsStep()];

    type CategoryBucket = {
        slug: string;
        title: string;
        order: number;
        description: string;
        types: Map<
            string,
            {
                type: BuilderType;
                options: BuilderOption[];
            }
        >;
    };

    const categories = new Map<string, CategoryBucket>();

    for (const item of available) {
        const categorySlug = item.category?.trim();
        if (!categorySlug) continue;

        let bucket = categories.get(categorySlug);
        if (!bucket) {
            bucket = {
                slug: categorySlug,
                title: item.categoryTitle?.trim() || categorySlug,
                order:
                    typeof item.categoryOrder === 'number'
                        ? item.categoryOrder
                        : Number.MAX_SAFE_INTEGER,
                description: item.categoryDescription?.trim() || '',
                types: new Map(),
            };
            categories.set(categorySlug, bucket);
        }

        const typeId = item.typeId?.trim() || `fallback-${categorySlug}`;
        let typeBucket = bucket.types.get(typeId);
        if (!typeBucket) {
            typeBucket = {
                type: {
                    id: typeId,
                    slug: item.typeSlug?.trim() || typeId,
                    title: item.typeTitle?.trim() || bucket.title,
                    categoryId: categorySlug,
                    cardinality: item.cardinality === 'many' ? 'many' : 'one',
                    description: item.typeDescription?.trim() || '',
                },
                options: [],
            };
            bucket.types.set(typeId, typeBucket);
        }

        if (typeBucket.options.some((opt) => opt.id === item.id)) continue;

        typeBucket.options.push({
            id: item.id,
            slug: item.slug?.trim() || item.id,
            title: item.label,
            typeId,
            shortDescription: item.shortDescription ?? '',
            description: item.description ?? '',
            imageUrl: item.imageUrl ?? null,
            status: 'active',
            ...(item.preselected ? {preselected: true} : {}),
        });
    }

    const orderedCategories = [...categories.values()].sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return a.title.localeCompare(b.title);
    });

    for (const category of orderedCategories) {
        const types: BuilderType[] = [];
        const options: BuilderOption[] = [];
        for (const typeBucket of category.types.values()) {
            if (typeBucket.options.length === 0) continue;
            types.push(typeBucket.type);
            options.push(...typeBucket.options);
        }
        if (types.length === 0) continue;

        steps.push({
            key: category.slug,
            label: category.title,
            description: category.description,
            kind: 'selection',
            category: category.slug,
            types,
            options,
        });
    }

    return steps;
}

export function optionsForType(
    step: BuilderStep,
    typeId: string,
): BuilderOption[] {
    return step.options.filter((item) => item.typeId === typeId);
}

export function patchAnswer(
    state: CustomizationBuilderState,
    key: BuilderStepKey,
    answer: StepAnswer,
): CustomizationBuilderState {
    return {
        ...state,
        answers: {
            ...state.answers,
            [key]: answer,
        },
    };
}

/** Unset a step answer and drop related entry notes. */
export function clearStep(
    state: CustomizationBuilderState,
    key: BuilderStepKey,
): CustomizationBuilderState {
    const previous = getAnswer(state, key);
    const entryNotes = {...(state.entryNotes ?? {})};

    if (key === DIMENSIONS_STEP_KEY) {
        delete entryNotes[dimensionEntryNoteKey('external')];
        delete entryNotes[dimensionEntryNoteKey('internal')];
    } else if (previous.status === 'set' && 'selection' in previous) {
        delete entryNotes[previous.selection.optionId];
    }

    return {
        ...state,
        answers: {
            ...state.answers,
            [key]: {status: 'unset'},
        },
        entryNotes,
    };
}

/** Flip every still-unset category to Need consultation (Done / Save). */
export function fillUnsetWithConsultation(
    state: CustomizationBuilderState,
    stepKeys?: BuilderStepKey[],
): CustomizationBuilderState {
    const answers = {...state.answers};
    const keys =
        stepKeys ??
        Object.keys(answers).filter((key) => key !== DIMENSIONS_STEP_KEY);
    for (const key of keys) {
        const current = answers[key];
        if (!current || current.status === 'unset') {
            answers[key] = {status: 'not-sure'};
        }
    }
    return {...state, answers};
}

export function patchEntryNote(
    state: CustomizationBuilderState,
    entryKey: string,
    note: string,
): CustomizationBuilderState {
    return {
        ...state,
        entryNotes: {
            ...(state.entryNotes ?? {}),
            [entryKey]: note,
        },
    };
}

export function markGuidedComplete(
    state: CustomizationBuilderState,
    steps?: BuilderStep[],
): CustomizationBuilderState {
    const stepKeys = steps?.map((step) => step.key);
    return fillUnsetWithConsultation(
        {...state, guidedComplete: true},
        stepKeys,
    );
}

export function toRequestCustomizations(
    state: CustomizationBuilderState,
    specialistLabel: string,
    steps?: BuilderStep[],
): BuilderRequestCustomization[] {
    const out: BuilderRequestCustomization[] = [];
    const keys =
        steps
            ?.filter((step) => step.kind === 'selection')
            .map((step) => step.key) ??
        Object.keys(state.answers).filter((key) => key !== DIMENSIONS_STEP_KEY);

    for (const key of keys) {
        const answer = state.answers[key];
        if (!answer || answer.status === 'unset') continue;

        const category =
            steps?.find((step) => step.key === key)?.category ?? key;

        if (answer.status === 'not-sure') {
            out.push({
                id: `${key}-not-sure`,
                label: specialistLabel,
                category,
            });
            continue;
        }

        if ('selection' in answer) {
            out.push({
                id: answer.selection.optionId,
                label: answer.selection.label,
                category,
            });
        }
    }

    return out;
}

export function parseBuilderState(value: unknown): CustomizationBuilderState {
    if (!value || typeof value !== 'object') {
        return createEmptyBuilderState();
    }
    const raw = value as Partial<CustomizationBuilderState>;
    const answers: CustomizationBuilderState['answers'] = {};

    if (raw.answers && typeof raw.answers === 'object') {
        for (const [key, valueAnswer] of Object.entries(raw.answers)) {
            const answer = parseAnswer(valueAnswer);
            if (answer) answers[key] = answer;
        }
    }

    const entryNotes: CustomizationBuilderState['entryNotes'] = {};
    if (raw.entryNotes && typeof raw.entryNotes === 'object') {
        for (const [entryKey, note] of Object.entries(raw.entryNotes)) {
            if (typeof note === 'string') entryNotes[entryKey] = note;
        }
    }

    return {
        answers,
        guidedComplete: Boolean(raw.guidedComplete),
        entryNotes,
    };
}

function parseFace(value: unknown): FaceMeasurements {
    if (!value || typeof value !== 'object') return {...EMPTY_FACE};
    const raw = value as FaceMeasurements;
    return {
        length: String(raw.length ?? ''),
        width: String(raw.width ?? ''),
        height: String(raw.height ?? ''),
    };
}

function parseAnswer(value: unknown): StepAnswer | null {
    if (!value || typeof value !== 'object') return null;
    const raw = value as StepAnswer;
    if (raw.status === 'unset' || raw.status === 'not-sure') {
        return {status: raw.status};
    }
    if (raw.status !== 'set') return null;
    if ('dimensions' in raw && raw.dimensions) {
        const d = raw.dimensions as Record<string, unknown>;
        // Legacy single-face {length,width,height,unit}
        if ('length' in d && !('external' in d)) {
            return {
                status: 'set',
                dimensions: {
                    unit: d.unit === 'mm' ? 'mm' : 'in',
                    external: {
                        length: String(d.length ?? ''),
                        width: String(d.width ?? ''),
                        height: String(d.height ?? ''),
                    },
                    internal: {...EMPTY_FACE},
                },
            };
        }
        return {
            status: 'set',
            dimensions: {
                unit: d.unit === 'mm' ? 'mm' : 'in',
                external: parseFace(d.external),
                internal: parseFace(d.internal),
            },
        };
    }
    if ('selection' in raw && raw.selection) {
        const optionId = String(raw.selection.optionId ?? '');
        const typeId = String(raw.selection.typeId ?? '');
        return {
            status: 'set',
            selection: {
                typeId,
                optionId,
                label: String(raw.selection.label ?? ''),
            },
        };
    }
    return null;
}

export function seedFromCustomizations(
    customizations: CatalogOptionLike[],
): CustomizationBuilderState {
    if (!customizations.length) return createEmptyBuilderState();

    const hasExplicitPreselected = customizations.some(
        (item) => item.preselected === true,
    );
    const toSeed = hasExplicitPreselected
        ? customizations.filter((item) => item.preselected === true)
        : customizations;

    const answers: CustomizationBuilderState['answers'] = {};
    for (const item of toSeed) {
        const key = item.category?.trim();
        if (!key) continue;
        answers[key] = {
            status: 'set',
            selection: {
                typeId: item.typeId?.trim() || '',
                optionId: item.id,
                label: item.label,
            },
        };
    }

    const configured = Object.keys(answers).length > 0;
    return {
        answers,
        guidedComplete: configured,
        entryNotes: {},
    };
}

export function emptyDimensions(): DimensionsValue {
    return {
        unit: EMPTY_DIMENSIONS.unit,
        external: {...EMPTY_FACE},
        internal: {...EMPTY_FACE},
    };
}

export function emptyFace(): FaceMeasurements {
    return {...EMPTY_FACE};
}

export function getDimensionsValue(answer: StepAnswer): DimensionsValue {
    if (answer.status === 'set' && 'dimensions' in answer) {
        return answer.dimensions;
    }
    return emptyDimensions();
}

export function patchFace(
    current: DimensionsValue,
    face: DimensionFace,
    measurements: FaceMeasurements,
): DimensionsValue {
    return {
        ...current,
        [face]: measurements,
    };
}

export {EMPTY_BUILDER_STATE, DIMENSIONS_STEP_KEY};
