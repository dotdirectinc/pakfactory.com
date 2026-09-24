import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import type {
    PageSectionDoc,
    PageSectionExpertiseSequenceDoc,
    PageSectionSignatureSystemDoc,
} from '@pakfactory/sanity/queries';

import {
    applyStageSequenceInherit,
    mapExpertiseLifecycle,
} from './lifecycle';
import {applySignatureSystemInherit} from '../sections/inherit-signature-system';
import {mapSignatureSystem} from '../sections/map-signature-system';
import type {ExpertiseStageCard} from './types';

const STAGES: ExpertiseStageCard[] = [
    {slug: 'packaging-strategy', title: 'Packaging Strategy', status: 'active'},
    {slug: 'packaging-design', title: 'Packaging Design', status: 'active'},
    {slug: 'prototyping', title: 'Prototyping', status: 'coming-soon'},
    {slug: 'managed-manufacturing', title: 'Managed Manufacturing', status: 'active'},
];

function sequence(
    partial: Partial<PageSectionExpertiseSequenceDoc> = {},
): PageSectionExpertiseSequenceDoc {
    return {_type: 'expertiseSequence', _key: 'seq', ...partial};
}

describe('applyStageSequenceInherit', () => {
    it('fills an empty sequence with every stage in hub order', () => {
        const [row] = applyStageSequenceInherit([sequence()], STAGES) as [
            PageSectionExpertiseSequenceDoc,
        ];
        assert.deepEqual(
            row.stages?.map((stage) => stage.slug),
            STAGES.map((stage) => stage.slug),
        );
    });

    it('keeps a curated list', () => {
        const curated = sequence({
            stages: [{_id: 'x', title: 'Packaging Design', slug: 'packaging-design'}],
        });
        const [row] = applyStageSequenceInherit([curated], STAGES) as [
            PageSectionExpertiseSequenceDoc,
        ];
        assert.equal(row.stages?.length, 1);
    });
});

describe('mapExpertiseLifecycle', () => {
    const inherited = applyStageSequenceInherit(
        [sequence({heading: 'One partner, every stage.'})],
        STAGES,
    )[0] as PageSectionExpertiseSequenceDoc;

    it('marks the current stage and does not link it', () => {
        const mapped = mapExpertiseLifecycle(inherited, 'packaging-design');
        const current = mapped?.steps.find((step) => step.current);
        assert.equal(current?.id, 'packaging-design');
        assert.equal(current?.href, undefined);
    });

    it('skips unreleased stages for previous / next', () => {
        const mapped = mapExpertiseLifecycle(inherited, 'packaging-design');
        assert.equal(mapped?.previous?.href, '/expertise/packaging-strategy');
        // Prototyping is coming soon → next jumps to Manufacturing.
        assert.equal(mapped?.next?.href, '/expertise/managed-manufacturing');
        const prototyping = mapped?.steps.find((step) => step.id === 'prototyping');
        assert.equal(prototyping?.comingSoon, true);
        assert.equal(prototyping?.href, undefined);
    });

    it('has no previous link on the first stage', () => {
        const mapped = mapExpertiseLifecycle(inherited, 'packaging-strategy');
        assert.equal(mapped?.previous, undefined);
        assert.equal(mapped?.next?.label, 'Next: Packaging Design');
    });
});

describe('signature system', () => {
    const services = [
        {_id: 'svc-brand', title: 'Brand Equity & Portfolio Alignment', summary: 'Keep brand fidelity.', points: [{label: 'Packaging audit'}]},
        {_id: 'svc-value', title: 'Value Engineering', slug: 'value-engineering', points: [{label: 'TCO modelling', gloss: 'Total Cost of Ownership'}]},
    ];

    function section(
        partial: Partial<PageSectionSignatureSystemDoc> = {},
    ): PageSectionSignatureSystemDoc {
        return {
            _type: 'signatureSystem',
            _key: 'sig',
            systemName: '360° Strategic Framework',
            problems: [
                {label: 'Inconsistent branding', serviceId: 'svc-brand'},
                {label: 'Missed launch windows', serviceId: 'svc-not-shown'},
            ],
            bodyPlain: 'First paragraph.\n\nSecond paragraph.',
            ...partial,
        };
    }

    it('inherits the host services when the section list is empty', () => {
        const [row] = applySignatureSystemInherit(
            [section() as PageSectionDoc],
            services,
        ) as [PageSectionSignatureSystemDoc];
        assert.equal(row.services?.length, 2);
    });

    it('does not inherit into a custom list', () => {
        const [row] = applySignatureSystemInherit(
            [section({listSource: 'custom'}) as PageSectionDoc],
            services,
        ) as [PageSectionSignatureSystemDoc];
        assert.equal(row.services, undefined);
    });

    it('links problems only to shown dimensions and slugifies anchors', () => {
        const mapped = mapSignatureSystem(section({services}));
        assert.deepEqual(
            mapped?.dimensions.map((dimension) => dimension.id),
            ['brand-equity-and-portfolio-alignment', 'value-engineering'],
        );
        assert.equal(
            mapped?.problems[0]?.dimensionId,
            'brand-equity-and-portfolio-alignment',
        );
        assert.equal(mapped?.problems[1]?.dimensionId, undefined);
        assert.deepEqual(mapped?.body, ['First paragraph.', 'Second paragraph.']);
    });

    it('renders nothing without dimensions', () => {
        assert.equal(mapSignatureSystem(section()), null);
    });
});
