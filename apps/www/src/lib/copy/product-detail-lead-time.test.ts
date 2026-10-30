import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {formatLeadTimeBusinessDays} from './product-detail';

describe('formatLeadTimeBusinessDays', () => {
    it('returns null when both unset', () => {
        assert.equal(formatLeadTimeBusinessDays(), null);
        assert.equal(formatLeadTimeBusinessDays(null, null), null);
        assert.equal(formatLeadTimeBusinessDays(0, 0), null);
    });

    it('formats a single bound', () => {
        assert.equal(formatLeadTimeBusinessDays(12, null), '12 business days');
        assert.equal(formatLeadTimeBusinessDays(null, 8), '8 business days');
    });

    it('formats equal min and max as one number', () => {
        assert.equal(formatLeadTimeBusinessDays(10, 10), '10 business days');
    });

    it('formats a range low–high', () => {
        assert.equal(formatLeadTimeBusinessDays(10, 15), '10–15 business days');
        assert.equal(formatLeadTimeBusinessDays(15, 10), '10–15 business days');
    });
});
