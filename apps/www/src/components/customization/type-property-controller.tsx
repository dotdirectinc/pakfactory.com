'use client';

import {useState} from 'react';
import {PropertyController} from '@pakfactory/ui/components/customization/property-controller/property-controller';
import {PropertyFieldPanel} from '@pakfactory/ui/components/customization/property-controller/property-field-panel';
import type {
    PropertyControllerValue,
    UiDescriptor,
} from '@pakfactory/ui/components/customization/types';

export type TypePropertyControllerProps = {
    /** Type-panel descriptor (listbox / toggles / dims / …). */
    ui: UiDescriptor;
    /** Optional section title above the control. */
    label?: string;
    value?: PropertyControllerValue;
    onChange?: (next: PropertyControllerValue) => void;
    controlId?: string;
    /** Forwarded to PropertyFieldPanel; builder uses ghost. */
    variant?: 'card' | 'ghost';
};

function initialValue(ui: UiDescriptor): PropertyControllerValue | undefined {
    switch (ui.kind) {
        case 'listbox':
            return {
                kind: 'listbox',
                value: ui.multi
                    ? [...(ui.values ?? [])]
                    : ui.value
                      ? [ui.value]
                      : [],
            };
        case 'toggles':
            return {
                kind: 'toggles',
                value: ui.items.map((item) => item.value),
            };
        case 'radio':
            return {kind: 'radio', value: ui.value};
        case 'radioPick':
            return {kind: 'radioPick', value: ui.value};
        case 'stepper':
            return {kind: 'stepper', value: ui.value};
        case 'dims':
            return {
                kind: 'dims',
                value: {unsure: false, values: {}},
            };
        case 'repeat':
            return {kind: 'repeat', value: ['']};
        case 'checks':
            return {kind: 'checks', value: []};
        case 'select':
            return {kind: 'select', value: ''};
        case 'textUpload':
            return {kind: 'textUpload', value: ''};
        case 'swatch':
            return {
                kind: 'swatch',
                value: ui.value ?? ui.swatches[0]?.id ?? '',
            };
        case 'chip':
            return {kind: 'chip', value: [...(ui.values ?? [])]};
        case 'cardGrid':
            return {
                kind: 'cardGrid',
                value: ui.value ?? ui.cards[0]?.id ?? '',
            };
        case 'specTable':
            return {
                kind: 'specTable',
                value: ui.segments[0]?.id ?? '',
            };
        default:
            return undefined;
    }
}

/**
 * www Type-panel wrapper around shared PropertyController.
 * Distinct from OptionPropertyControllers (Property-value chip/swatch rails).
 */
export function TypePropertyController({
    ui,
    label,
    value: controlled,
    onChange,
    controlId = 'type-panel',
    variant = 'card',
}: TypePropertyControllerProps) {
    const [internal, setInternal] = useState<
        PropertyControllerValue | undefined
    >(() => initialValue(ui));
    const value = controlled ?? internal;

    const handleChange = (next: PropertyControllerValue) => {
        if (controlled === undefined) setInternal(next);
        onChange?.(next);
    };

    return (
        <PropertyFieldPanel title={label} variant={variant}>
            <PropertyController
                ui={ui}
                controlId={controlId}
                {...(value !== undefined
                    ? {value, onChange: handleChange}
                    : {onChange: handleChange})}
            />
        </PropertyFieldPanel>
    );
}
