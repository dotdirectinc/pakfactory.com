import type {CustomizationCategory, CustomizationOption} from '@/lib/catalog/types';

/**
 * Guided / workspace step keys.
 * `dimensions` is UI-only; other keys are Sanity customizationCategory.slug values.
 */
export type BuilderStepKey = 'dimensions' | (string & {});

export type DimensionFace = 'external' | 'internal';

export type FaceMeasurements = {
    length: string;
    width: string;
    height: string;
};

/** Dual external/internal measurements for the Dimensions category. */
export type DimensionsValue = {
    unit: 'in' | 'mm';
    external: FaceMeasurements;
    internal: FaceMeasurements;
};

export type SelectionValue = {
    typeId: string;
    optionId: string;
    label: string;
};

export type StepAnswer =
    | {status: 'unset'}
    | {status: 'not-sure'}
    | {status: 'set'; dimensions: DimensionsValue}
    | {status: 'set'; selection: SelectionValue};

export type CustomizationBuilderState = {
    answers: Partial<Record<string, StepAnswer>>;
    /** True after the guided walk finishes (or when reopening a configured line). */
    guidedComplete: boolean;
    /**
     * Free-text notes per detail entry.
     * Keys: optionId, or `dimensions:external` / `dimensions:internal`.
     */
    entryNotes: Partial<Record<string, string>>;
};

export type BuilderChoice = {
    id: string;
    label: string;
    category: CustomizationCategory;
    shortDescription?: string;
    description?: string;
    typeId?: string;
    groupType?: string;
};

export type BuilderCardinality = 'one' | 'many';

export type BuilderType = {
    id: string;
    slug: string;
    title: string;
    categoryId: string;
    description: string;
    cardinality: BuilderCardinality;
};

export type BuilderOption = {
    id: string;
    slug: string;
    title: string;
    typeId: string;
    shortDescription: string;
    description: string;
    imageUrl: string | null;
    status: 'active';
    preselected?: boolean;
};

export type BuilderStep = {
    key: BuilderStepKey;
    label: string;
    description: string;
    kind: 'dimensions' | 'selection';
    category?: CustomizationCategory;
    types: BuilderType[];
    options: BuilderOption[];
};

export type BuilderMode = 'guided' | 'workspace';

/** Dimensions always leads; selection steps follow category order from the product. */
export const DIMENSIONS_STEP_KEY: BuilderStepKey = 'dimensions';

export const EMPTY_FACE: FaceMeasurements = {
    length: '',
    width: '',
    height: '',
};

export const EMPTY_DIMENSIONS: DimensionsValue = {
    unit: 'in',
    external: {...EMPTY_FACE},
    internal: {...EMPTY_FACE},
};

export const DIMENSION_FACES: {id: DimensionFace; title: string}[] = [
    {id: 'external', title: 'External'},
    {id: 'internal', title: 'Internal'},
];

export function dimensionEntryNoteKey(face: DimensionFace): string {
    return `dimensions:${face}`;
}

export const EMPTY_BUILDER_STATE: CustomizationBuilderState = {
    answers: {},
    guidedComplete: false,
    entryNotes: {},
};

export type CatalogOptionLike = Pick<
    CustomizationOption,
    | 'id'
    | 'label'
    | 'category'
    | 'categoryTitle'
    | 'categoryOrder'
    | 'categoryDescription'
    | 'typeId'
    | 'typeSlug'
    | 'typeTitle'
    | 'typeDescription'
    | 'cardinality'
    | 'slug'
    | 'shortDescription'
    | 'description'
    | 'imageUrl'
    | 'preselected'
>;
