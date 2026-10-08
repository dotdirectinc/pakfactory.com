import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import type {PreparedRules} from '@/lib/catalog/customization-rules';
import type {ProductOfferIndex} from '@/lib/catalog/product-offer-index';
import {packOfferIndex, unpackOfferIndex} from '@/lib/catalog/offer-index-wire';

describe('offer-index-wire', () => {
    it('round-trips Set baseOfferIds and option type map', () => {
        const rules = {
            catalog: {types: [], options: [], categories: []},
            graph: {
                dependsOn: {},
                groups: {},
                unknownReferences: [],
                ignoredOnProductDecided: [],
                resolvedToNothing: [],
            },
            optionDocs: new Map([
                [
                    'opt-a',
                    {_id: 'opt-a', typeId: 'type-materials'},
                ],
            ]),
        } as unknown as PreparedRules;

        const index: ProductOfferIndex = {
            entries: [
                {
                    productId: 'prod-1',
                    slug: 'mailer-box',
                    kind: 'standard',
                    baseOfferIds: new Set(['opt-a', 'opt-b']),
                    rulesProduct: null,
                },
            ],
            hasRules: true,
            rules,
        };

        const packed = packOfferIndex(index);
        assert.deepEqual(packed.entries[0]?.baseOfferIds, ['opt-a', 'opt-b']);
        assert.equal(packed.rules?.optionTypeById['opt-a'], 'type-materials');

        const json = JSON.parse(JSON.stringify(packed));
        const restored = unpackOfferIndex(json);
        assert.ok(restored.entries[0]?.baseOfferIds instanceof Set);
        assert.equal(restored.entries[0]?.baseOfferIds.has('opt-a'), true);
        assert.equal(
            restored.rules?.optionDocs.get('opt-a')?.typeId,
            'type-materials',
        );
        assert.equal(restored.hasRules, true);
    });
});
