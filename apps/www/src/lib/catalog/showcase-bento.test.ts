import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {fillShowcaseBentoSlots} from './showcase-bento';
import type {CustomizationShowcaseTile} from './types';

function tile(
    kind: CustomizationShowcaseTile['kind'],
    id: string,
): CustomizationShowcaseTile {
    return {
        kind,
        src: `https://example.com/${id}.jpg`,
        alt: id,
        title: id,
        href: `/${id}`,
        linkLabel: 'Open',
    };
}

describe('fillShowcaseBentoSlots', () => {
    it('fills solutions first then case studies up to 5', () => {
        const tiles = fillShowcaseBentoSlots(
            [
                tile('solution', 's1'),
                tile('solution', 's2'),
                tile('solution', 's3'),
            ],
            [tile('caseStudy', 'c1'), tile('caseStudy', 'c2')],
        );
        assert.equal(tiles.length, 5);
        assert.equal(tiles[0]?.kind, 'solution');
        assert.equal(tiles[3]?.kind, 'caseStudy');
        assert.equal(tiles[4]?.title, 'c2');
    });

    it('uses case studies when solutions are short', () => {
        const tiles = fillShowcaseBentoSlots(
            [],
            [
                tile('caseStudy', 'c1'),
                tile('caseStudy', 'c2'),
                tile('caseStudy', 'c3'),
                tile('caseStudy', 'c4'),
                tile('caseStudy', 'c5'),
                tile('caseStudy', 'c6'),
            ],
        );
        assert.equal(tiles.length, 5);
        assert.ok(tiles.every((t) => t.kind === 'caseStudy'));
        assert.equal(tiles[4]?.title, 'c5');
    });

    it('returns empty when nothing to show', () => {
        assert.equal(fillShowcaseBentoSlots([], []).length, 0);
    });
});
