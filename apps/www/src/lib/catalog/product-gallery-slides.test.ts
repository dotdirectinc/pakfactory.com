import assert from 'node:assert/strict';
import {test} from 'node:test';

import {productGallerySlides} from './map-sanity';

test('productGallerySlides puts media first, featured last', () => {
    const slides = productGallerySlides(
        {url: 'https://cdn.example/featured.jpg', alt: 'Featured'},
        [
            {url: 'https://cdn.example/a.jpg', alt: 'A'},
            {url: 'https://cdn.example/b.jpg', alt: 'B'},
        ],
        'Product',
    );
    assert.deepEqual(slides, [
        {src: 'https://cdn.example/a.jpg', alt: 'A', kind: 'product'},
        {src: 'https://cdn.example/b.jpg', alt: 'B', kind: 'product'},
        {src: 'https://cdn.example/featured.jpg', alt: 'Featured', kind: 'product'},
    ]);
});

test('productGallerySlides dedupes featured when it matches a media URL', () => {
    const slides = productGallerySlides(
        {url: 'https://cdn.example/a.jpg', alt: 'Featured'},
        [
            {url: 'https://cdn.example/a.jpg', alt: 'A'},
            {url: 'https://cdn.example/b.jpg', alt: 'B'},
        ],
        'Product',
    );
    assert.deepEqual(slides, [
        {src: 'https://cdn.example/a.jpg', alt: 'A', kind: 'product'},
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
        {src: 'https://cdn.example/a.jpg', alt: 'A', kind: 'product'},
        {src: 'https://cdn.example/featured.jpg', alt: 'Featured', kind: 'product'},
        {src: 'https://cdn.example/life.jpg', alt: 'Life', kind: 'lifestyle'},
    ]);
});

test('productGallerySlides returns placeholder when neither media nor featured', () => {
    const slides = productGallerySlides(null, null, 'Product');
    assert.deepEqual(slides, [{alt: 'Product', kind: 'product'}]);
});
