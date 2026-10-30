import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {resolveConfigurationFields} from './resolve-configuration-fields';
import type {PropertyFieldDescriptor} from './map-detail-to-property-fields';

const properties: PropertyFieldDescriptor[] = [
    {
        propertyKey: 'caliper',
        label: 'Caliper',
        valuesPerItem: 'one',
        kind: 'chip',
        options: [{id: 'pv-1', title: '18pt'}],
    },
];
const achieves: PropertyFieldDescriptor = {
    propertyKey: 'achieves',
    label: 'Achievable Finishes',
    valuesPerItem: 'one',
    kind: 'radio',
    options: [{id: 'opt-gloss', title: 'Gloss'}],
};

describe('resolveConfigurationFields', () => {
    it('returns selectable properties and never Achieves when source is properties', () => {
        const fields = resolveConfigurationFields(
            'properties',
            properties,
            achieves,
        );
        assert.deepEqual(
            fields.map((f) => f.propertyKey),
            ['caliper'],
        );
    });

    it('returns the Achieves radio group and never properties when source is achieves', () => {
        const fields = resolveConfigurationFields(
            'achieves',
            properties,
            achieves,
        );
        assert.deepEqual(
            fields.map((f) => f.propertyKey),
            ['achieves'],
        );
        assert.equal(fields[0]?.kind, 'radio');
    });

    it('omits the Achieves group when the list is empty', () => {
        assert.deepEqual(
            resolveConfigurationFields('achieves', properties, null),
            [],
        );
    });

    it('hides all selectors when source is none (No Configuration)', () => {
        assert.deepEqual(
            resolveConfigurationFields('none', properties, achieves),
            [],
        );
    });
});
