import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {
    clampSanityLoaderWidth,
    SANITY_LOADER_MAX_WIDTH,
    sanityImageDimensions,
    sanitySquareImageLoader,
} from './image';

describe('sanityImageDimensions (PROD-3004)', () => {
    it('reads the size from a Sanity asset filename', () => {
        assert.deepEqual(
            sanityImageDimensions(
                'https://cdn.sanity.io/images/8293wrxp/development/bf831fcd-640x360.png?w=200',
            ),
            {width: 640, height: 360},
        );
    });

    it('is null for other hosts and unsized names', () => {
        assert.equal(sanityImageDimensions('/logo.png'), null);
        assert.equal(sanityImageDimensions('https://example.com/a-640x360.png'), null);
        assert.equal(sanityImageDimensions('https://cdn.sanity.io/images/p/d/abc.png'), null);
    });
});

describe('clampSanityLoaderWidth (PROD-3102)', () => {
    it('caps width at SANITY_LOADER_MAX_WIDTH', () => {
        assert.equal(clampSanityLoaderWidth(3840), SANITY_LOADER_MAX_WIDTH);
        assert.equal(clampSanityLoaderWidth(1600), 1600);
        assert.equal(clampSanityLoaderWidth(640), 640);
    });

    it('guards non-positive and non-finite values', () => {
        assert.equal(clampSanityLoaderWidth(0), 1);
        assert.equal(clampSanityLoaderWidth(-10), 1);
        assert.equal(clampSanityLoaderWidth(Number.NaN), 1);
    });

    it('applies the clamp in the square loader CDN URL', () => {
        const url = new URL(
            sanitySquareImageLoader({
                src: 'https://cdn.sanity.io/images/p/d/abc-2000x2000.png',
                width: 3840,
                quality: 80,
            }),
        );
        assert.equal(url.searchParams.get('w'), String(SANITY_LOADER_MAX_WIDTH));
        assert.equal(url.searchParams.get('h'), String(SANITY_LOADER_MAX_WIDTH));
        assert.equal(url.searchParams.get('fit'), 'crop');
    });
});
