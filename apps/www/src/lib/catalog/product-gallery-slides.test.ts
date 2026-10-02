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
        {src: 'https://cdn.example/a.jpg', alt: 'A'},
        {src: 'https://cdn.example/b.jpg', alt: 'B'},
        {src: 'https://cdn.example/featured.jpg', alt: 'Featured'},
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
        {src: 'https://cdn.example/a.jpg', alt: 'A'},
        {src: 'https://cdn.example/b.jpg', alt: 'B'},
    ]);
});

test('productGallerySlides returns featured only when media is empty', () => {
    const slides = productGallerySlides(
        {url: 'https://cdn.example/featured.jpg', alt: 'Featured'},
        [],
        'Product',
    );
    assert.deepEqual(slides, [
        {src: 'https://cdn.example/featured.jpg', alt: 'Featured'},
    ]);
});

test('productGallerySlides returns placeholder when neither media nor featured', () => {
    const slides = productGallerySlides(null, null, 'Product');
    assert.deepEqual(slides, [{alt: 'Product'}]);
});
