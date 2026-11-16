import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {isHeavyCatalogHref} from '@/lib/ui/heavy-catalog-href';

describe('isHeavyCatalogHref', () => {
    it('matches catalog index paths', () => {
        assert.equal(isHeavyCatalogHref('/products'), true);
        assert.equal(isHeavyCatalogHref('/customizations'), true);
        assert.equal(isHeavyCatalogHref('/customizations/compatibility'), true);
        assert.equal(isHeavyCatalogHref('/products/'), true);
        assert.equal(isHeavyCatalogHref('/products?foo=1'), true);
    });

    it('ignores detail and other routes', () => {
        assert.equal(isHeavyCatalogHref('/products/boxes'), false);
        assert.equal(isHeavyCatalogHref('/customizations/materials/x'), false);
        assert.equal(isHeavyCatalogHref('/request'), false);
        assert.equal(isHeavyCatalogHref('/'), false);
    });
});
