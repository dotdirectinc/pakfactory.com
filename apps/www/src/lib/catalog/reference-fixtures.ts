/**
 * Temporary Reference-band fixtures until Sanity authors structured
 * benefits / stated-spec rows (PROD-1299).
 */

export type ReferenceFeature = {
    title: string;
    description: string;
};

export type ReferenceSpecRow = {
    label: string;
    value: string;
};

const WHITE_LINED_SLUG = 'white-lined-corrugated-board';

const FEATURES_BY_SLUG: Record<string, ReferenceFeature[]> = {
    [WHITE_LINED_SLUG]: [
        {
            title: 'Print-ready white face',
            description:
                'Smooth white liner supports clear, high-quality graphics without a separate wrap.',
        },
        {
            title: 'Corrugated strength',
            description:
                'Fluted core protects products in shipping while staying light enough for e-commerce.',
        },
        {
            title: 'Cost-effective alternative',
            description:
                'Bright presentation without the cost of fully bleached white corrugated board.',
        },
        {
            title: 'Brand-ready shippers',
            description:
                'Ideal for shipping boxes and displays that need clean branding and simple graphics.',
        },
    ],
};

const SPECS_BY_SLUG: Record<string, ReferenceSpecRow[]> = {
    [WHITE_LINED_SLUG]: [
        {
            label: 'Face liner',
            value: 'White-lined kraft — print-ready surface',
        },
        {
            label: 'Structure',
            value: 'Corrugated board (fluted core)',
        },
        {
            label: 'Print quality',
            value: 'Good — suited to solid color and simple graphics',
        },
        {
            label: 'Strength',
            value: 'High — reliable product protection in transit',
        },
        {
            label: 'Sustainability',
            value: 'Recyclable; FSC® available on request',
        },
        {
            label: 'Relative cost',
            value: '$$',
        },
    ],
};

export function getReferenceFeatures(slug: string): ReferenceFeature[] {
    return FEATURES_BY_SLUG[slug] ?? [];
}

export function getReferenceSpecFixture(slug: string): ReferenceSpecRow[] {
    return SPECS_BY_SLUG[slug] ?? [];
}
