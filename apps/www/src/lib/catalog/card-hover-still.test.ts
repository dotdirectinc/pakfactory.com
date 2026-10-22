import assert from 'node:assert/strict';
import {test} from 'node:test';

import {cardGalleryStills, pickCardHoverStill} from './card-hover-still';

const rest = {src: 'https://cdn.example/front.png', alt: 'Front'};
const side = {src: 'https://cdn.example/side.png', alt: 'Side'};

test('pickCardHoverStill uses the second still when it differs from rest', () => {
    assert.deepEqual(pickCardHoverStill(rest.src, side), side);
});

test('pickCardHoverStill returns null when the second still is missing', () => {
    assert.equal(pickCardHoverStill(rest.src, null), null);
    assert.equal(pickCardHoverStill(rest.src, {src: '  '}), null);
    assert.equal(pickCardHoverStill(rest.src, undefined), null);
});

test('pickCardHoverStill returns null when the second URL matches rest', () => {
    assert.equal(
        pickCardHoverStill(rest.src, {src: rest.src, alt: 'Same file'}),
        null,
    );
});

test('cardGalleryStills is rest plus a distinct second still', () => {
    assert.deepEqual(cardGalleryStills(rest, side), [rest, side]);
});

test('cardGalleryStills is rest only when there is no distinct hover', () => {
    assert.deepEqual(cardGalleryStills(rest, null), [rest]);
    assert.deepEqual(cardGalleryStills(rest, rest), [rest]);
});

test('cardGalleryStills is undefined when there is no resting still', () => {
    assert.equal(cardGalleryStills(null, side), undefined);
    assert.equal(cardGalleryStills({src: ''}, side), undefined);
});

test('hover still is images[1]; a lifestyle URL is never the hover frame', () => {
    const lifestyle = {
        src: 'https://cdn.example/lifestyle.png',
        alt: 'In use',
    };
    const hover = pickCardHoverStill(rest.src, side);
    assert.equal(hover?.src, side.src);
    assert.notEqual(hover?.src, lifestyle.src);
    // Callers pass Sanity images[1], not lifestyleImages.
    assert.deepEqual(cardGalleryStills(rest, side), [rest, side]);
});
