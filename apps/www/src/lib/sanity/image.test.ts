import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {sanityImageDimensions} from './image';

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
