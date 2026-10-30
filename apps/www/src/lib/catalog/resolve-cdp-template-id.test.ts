import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {
    CDP_TEMPLATE_ACHIEVES,
    CDP_TEMPLATE_DEFAULT,
    CDP_TEMPLATE_KNOWLEDGE,
    resolveCdpTemplateId,
} from './resolve-cdp-template-id';

describe('resolveCdpTemplateId', () => {
    it('prefers an explicit template ref', () => {
        assert.equal(
            resolveCdpTemplateId({
                templateId: 'customizationDetailPageLearnFirst',
                appearsIn: 'not-configurable-with-page',
                achievesCount: 2,
            }),
            'customizationDetailPageLearnFirst',
        );
    });

    it('maps not-configurable with achieves to Achieves', () => {
        assert.equal(
            resolveCdpTemplateId({
                appearsIn: 'not-configurable-with-page',
                achievesCount: 1,
            }),
            CDP_TEMPLATE_ACHIEVES,
        );
    });

    it('maps not-configurable without achieves to Knowledge', () => {
        assert.equal(
            resolveCdpTemplateId({
                appearsIn: 'not-configurable-with-page',
                achievesCount: 0,
            }),
            CDP_TEMPLATE_KNOWLEDGE,
        );
        assert.equal(
            resolveCdpTemplateId({
                appearsIn: 'not-configurable-with-page',
            }),
            CDP_TEMPLATE_KNOWLEDGE,
        );
    });

    it('maps configurable / empty appearsIn to Default when template is empty', () => {
        assert.equal(
            resolveCdpTemplateId({
                appearsIn: 'configurable-with-page',
            }),
            CDP_TEMPLATE_DEFAULT,
        );
        assert.equal(
            resolveCdpTemplateId({
                appearsIn: 'configurable-no-page',
                achievesCount: 3,
            }),
            CDP_TEMPLATE_DEFAULT,
        );
        assert.equal(resolveCdpTemplateId({}), CDP_TEMPLATE_DEFAULT);
    });

    it('trims explicit ids and ignores blank strings', () => {
        assert.equal(
            resolveCdpTemplateId({
                templateId: '  customizationDetailPageKnowledge  ',
            }),
            CDP_TEMPLATE_KNOWLEDGE,
        );
        assert.equal(
            resolveCdpTemplateId({
                templateId: '   ',
                appearsIn: 'not-configurable-with-page',
            }),
            CDP_TEMPLATE_KNOWLEDGE,
        );
    });
});
