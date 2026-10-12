import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {
    formatPrintedSideSummary,
    isPrintedSideComplete,
    parseBuilderState,
    patchPrintedSide,
    wantsAnyPrint,
} from '@/lib/customization-builder/state';
import {
    resolvePrintableSides,
    shouldShowPrintedSideGate,
} from '@/lib/customization-builder/printable-sides';
import type {ProductProperty} from '@/lib/catalog/types';

describe('resolvePrintableSides', () => {
    it('returns ordered slug+title values for printable-sides', () => {
        const properties: ProductProperty[] = [
            {
                label: 'Printable Sides',
                propertySlug: 'printable-sides',
                value: 'Outside, Inside',
                values: [
                    {slug: 'outside', title: 'Outside'},
                    {slug: 'inside', title: 'Inside'},
                ],
            },
        ];
        assert.deepEqual(resolvePrintableSides(properties), [
            {slug: 'outside', title: 'Outside'},
            {slug: 'inside', title: 'Inside'},
        ]);
        assert.equal(
            shouldShowPrintedSideGate(resolvePrintableSides(properties)),
            true,
        );
    });

    it('shows the gate for a single side; hides when missing', () => {
        assert.equal(
            shouldShowPrintedSideGate(
                resolvePrintableSides([
                    {
                        label: 'Printable Sides',
                        propertySlug: 'printable-sides',
                        value: 'Both Sides',
                        values: [{slug: 'both-sides', title: 'Both Sides'}],
                    },
                ]),
            ),
            true,
        );
        assert.equal(shouldShowPrintedSideGate(resolvePrintableSides([])), false);
        assert.equal(
            shouldShowPrintedSideGate(resolvePrintableSides(undefined)),
            false,
        );
    });
});

describe('printedSides gate helpers', () => {
    const outsideInside = [
        {slug: 'outside', title: 'Outside'},
        {slug: 'inside', title: 'Inside'},
    ];
    const outsideOnly = [{slug: 'outside', title: 'Outside'}];

    it('treats missing printable-sides as complete with print on', () => {
        const state = parseBuilderState({});
        assert.equal(isPrintedSideComplete(state, []), true);
        assert.equal(wantsAnyPrint(state, []), true);
        assert.equal(formatPrintedSideSummary(state, []), 'Print');
    });

    it('requires a Yes/No answer for a single printable side', () => {
        let state = parseBuilderState({});
        assert.equal(isPrintedSideComplete(state, outsideOnly), false);
        assert.equal(wantsAnyPrint(state, outsideOnly), false);

        state = patchPrintedSide(state, {outside: 'yes'}, outsideOnly);
        assert.equal(isPrintedSideComplete(state, outsideOnly), true);
        assert.equal(wantsAnyPrint(state, outsideOnly), true);
        assert.equal(formatPrintedSideSummary(state, outsideOnly), 'Outside');

        state = patchPrintedSide(state, {outside: 'no'}, outsideOnly);
        assert.equal(wantsAnyPrint(state, outsideOnly), false);
        assert.equal(formatPrintedSideSummary(state, outsideOnly), 'None');
    });

    it('requires every multi-side answer and formats classic summaries', () => {
        let state = parseBuilderState({});
        assert.equal(isPrintedSideComplete(state, outsideInside), false);

        state = patchPrintedSide(
            state,
            {outside: 'no', inside: 'yes'},
            outsideInside,
        );
        assert.equal(isPrintedSideComplete(state, outsideInside), true);
        assert.equal(wantsAnyPrint(state, outsideInside), true);
        assert.equal(
            formatPrintedSideSummary(state, outsideInside),
            'Inside only',
        );
    });

    it('migrates legacy printOutside / printInside on parse', () => {
        const state = parseBuilderState({
            printOutside: 'yes',
            printInside: 'no',
        });
        assert.deepEqual(state.printedSides, {
            outside: 'yes',
            inside: 'no',
        });
        assert.equal(
            formatPrintedSideSummary(state, outsideInside),
            'Outside only',
        );
    });
});
