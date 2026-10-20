import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {
    createEmptyBuilderState,
    parseBuilderState,
    patchCustomColorReference,
} from '@/lib/customization-builder/state';

describe('parseBuilderState — custom color references', () => {
    it('keeps an uploaded image that has an S3 key', () => {
        const parsed = parseBuilderState({
            ...createEmptyBuilderState(),
            propertySelections: {
                'o.color': {
                    color: ['custom-color'],
                    'custom-color-hex:color': ['#aabbcc'],
                },
            },
            customColorReferences: {
                'o.color': {
                    color: {
                        image: {
                            id: 'cref-1',
                            name: 'Color reference — Color — a.png',
                            url: 'blob:dead',
                            key: 'pending/d1/a.png',
                            status: 'uploaded',
                            bytes: 10,
                        },
                    },
                },
            },
        });

        assert.deepEqual(
            parsed.propertySelections?.['o.color']?.['custom-color-hex:color'],
            ['#aabbcc'],
        );
        assert.equal(
            parsed.customColorReferences?.['o.color']?.color?.image?.key,
            'pending/d1/a.png',
        );
        assert.equal(
            parsed.customColorReferences?.['o.color']?.color?.image?.status,
            'uploaded',
        );
    });

    it('drops a preview that has no key (blob URLs die with the tab)', () => {
        const parsed = parseBuilderState({
            ...createEmptyBuilderState(),
            customColorReferences: {
                'o.color': {
                    color: {
                        image: {
                            id: 'cref-local',
                            name: 'Color reference — Color — b.png',
                            url: 'blob:local',
                            status: 'uploading',
                        },
                    },
                },
            },
        });

        assert.deepEqual(parsed.customColorReferences, {});
    });
});

describe('patchCustomColorReference', () => {
    it('sets and clears an image for one option + property', () => {
        let state = createEmptyBuilderState();
        state = patchCustomColorReference(state, 'o.color', 'color', {
            id: 'cref-1',
            name: 'Color reference — Color — a.png',
            url: 'blob:x',
            key: 'pending/d1/a.png',
            status: 'uploaded',
        });
        assert.equal(
            state.customColorReferences?.['o.color']?.color?.image?.key,
            'pending/d1/a.png',
        );

        state = patchCustomColorReference(state, 'o.color', 'color', null);
        assert.deepEqual(state.customColorReferences, {});
    });
});
