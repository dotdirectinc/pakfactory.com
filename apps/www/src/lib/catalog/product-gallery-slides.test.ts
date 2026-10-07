import assert from 'node:assert/strict';
import {test} from 'node:test';

import {
    firstLifestyleStill,
    primaryProductStill,
    productGallerySlides,
} from './map-sanity';

test('productGallerySlides puts primary first, then media, then lifestyle', () => {
    const slides = productGallerySlides(
        {url: 'https://cdn.example/featured.jpg', alt: 'Featured'},
        [
            {url: 'https://cdn.example/a.jpg', alt: 'A'},
            {url: 'https://cdn.example/b.jpg', alt: 'B'},
        ],
        'Product',
    );
    assert.deepEqual(slides, [
        {src: 'https://cdn.example/featured.jpg', alt: 'Featured', kind: 'product'},
        {src: 'https://cdn.example/a.jpg', alt: 'A', kind: 'product'},
        {src: 'https://cdn.example/b.jpg', alt: 'B', kind: 'product'},
    ]);
});

test('productGallerySlides dedupes media when it matches featured URL', () => {
    const slides = productGallerySlides(
        {url: 'https://cdn.example/a.jpg', alt: 'Featured'},
        [
            {url: 'https://cdn.example/a.jpg', alt: 'A'},
            {url: 'https://cdn.example/b.jpg', alt: 'B'},
        ],
        'Product',
    );
    assert.deepEqual(slides, [
        {src: 'https://cdn.example/a.jpg', alt: 'Featured', kind: 'product'},
        {src: 'https://cdn.example/b.jpg', alt: 'B', kind: 'product'},
    ]);
});

test('productGallerySlides returns featured only when media is empty', () => {
    const slides = productGallerySlides(
        {url: 'https://cdn.example/featured.jpg', alt: 'Featured'},
        [],
        'Product',
    );
    assert.deepEqual(slides, [
        {src: 'https://cdn.example/featured.jpg', alt: 'Featured', kind: 'product'},
    ]);
});

test('productGallerySlides appends lifestyle after product stills', () => {
    const slides = productGallerySlides(
        {url: 'https://cdn.example/featured.jpg', alt: 'Featured'},
        [{url: 'https://cdn.example/a.jpg', alt: 'A'}],
        'Product',
        [{url: 'https://cdn.example/life.jpg', alt: 'Life'}],
    );
    assert.deepEqual(slides, [
        {src: 'https://cdn.example/featured.jpg', alt: 'Featured', kind: 'product'},
        {src: 'https://cdn.example/a.jpg', alt: 'A', kind: 'product'},
        {src: 'https://cdn.example/life.jpg', alt: 'Life', kind: 'lifestyle'},
    ]);
});

test('productGallerySlides returns placeholder when neither media nor featured', () => {
    const slides = productGallerySlides(null, null, 'Product');
    assert.deepEqual(slides, [{alt: 'Product', kind: 'product'}]);
});

test('primaryProductStill skips lifestyle slides', () => {
    const still = primaryProductStill([
        {src: 'https://cdn.example/life.jpg', alt: 'Life', kind: 'lifestyle'},
        {src: 'https://cdn.example/product.jpg', alt: 'Product', kind: 'product'},
    ]);
    assert.deepEqual(still, {
        src: 'https://cdn.example/product.jpg',
        alt: 'Product',
        kind: 'product',
    });
});

test('firstLifestyleStill returns lifestyleImages[0] equivalent', () => {
    const still = firstLifestyleStill([
        {src: 'https://cdn.example/product.jpg', alt: 'Product', kind: 'product'},
        {src: 'https://cdn.example/life-a.jpg', alt: 'Life A', kind: 'lifestyle'},
        {src: 'https://cdn.example/life-b.jpg', alt: 'Life B', kind: 'lifestyle'},
    ]);
    assert.deepEqual(still, {
        src: 'https://cdn.example/life-a.jpg',
        alt: 'Life A',
        kind: 'lifestyle',
    });
});
