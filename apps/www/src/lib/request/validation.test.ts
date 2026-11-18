import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {REQUEST_FORM_RULES} from './request-rules';
import {EMPTY_DRAFT, type RequestDraft, type RequestLine} from './request.storage';
import {
    canSubmitRequest,
    isContentsReady,
    isNotesReady,
    isServicesOnlyRequest,
    isServicesReady,
} from './validation';

function draft(overrides: Partial<RequestDraft> = {}): RequestDraft {
    return {
        ...EMPTY_DRAFT,
        id: 'draft-test',
        ...overrides,
    };
}

function productLine(overrides: Partial<RequestLine> = {}): RequestLine {
    return {
        id: 'line-1',
        productSlug: 'counter-display-boxes',
        quantities: [500],
        contents: '',
        customizations: [],
        addedAt: '2026-11-17T12:00:00.000Z',
        ...overrides,
    };
}

describe('PROD-3320 RFQ submit gates', () => {
    describe('services-only', () => {
        const servicesOnly = draft({
            entryKind: 'services',
            express: false,
            productsExpanded: false,
            servicesEnabled: true,
            services: ['packaging-design'],
            shipToOptional: true,
            notes: '',
            packagingContents: '',
            contactFirstName: '',
            contactLastName: '',
            contactEmail: '',
        });

        it('isServicesOnlyRequest when entryKind is services and products are not expanded', () => {
            assert.equal(isServicesOnlyRequest(servicesOnly), true);
        });

        it('needs only a selected service — empty brief/contact/lines still submit-ready', () => {
            assert.equal(isServicesReady(servicesOnly), true);
            assert.equal(isNotesReady(servicesOnly, [], REQUEST_FORM_RULES), true);
            assert.equal(isContentsReady(servicesOnly, []), true);
            assert.equal(canSubmitRequest(servicesOnly, [], REQUEST_FORM_RULES), true);
        });

        it('blocks submit when no service is selected', () => {
            const empty = draft({
                entryKind: 'services',
                servicesEnabled: true,
                services: [],
            });
            assert.equal(isServicesReady(empty), false);
            assert.equal(canSubmitRequest(empty, [], REQUEST_FORM_RULES), false);
        });
    });

    describe('general / express', () => {
        it('is submit-ready with brief, contact, optional ship-to, and express qty', () => {
            const general = draft({
                entryKind: 'express',
                express: true,
                productsExpanded: false,
                shipToOptional: true,
                // Default need is packaging → express qty gate applies.
                expressQuantities: [500],
                notes: 'Need mailer boxes for a skincare launch',
                contactFirstName: 'Smoke',
                contactLastName: 'General',
                contactEmail: 'smoke.general+prod3320@pakfactory.com',
            });
            assert.equal(canSubmitRequest(general, [], REQUEST_FORM_RULES), true);
        });

        it('blocks submit when brief is empty and no uploaded file', () => {
            const general = draft({
                entryKind: 'express',
                express: true,
                productsExpanded: false,
                shipToOptional: true,
                expressQuantities: [500],
                notes: '',
                contactFirstName: 'Smoke',
                contactLastName: 'General',
                contactEmail: 'smoke.general+prod3320@pakfactory.com',
            });
            assert.equal(isNotesReady(general, [], REQUEST_FORM_RULES), false);
            assert.equal(canSubmitRequest(general, [], REQUEST_FORM_RULES), false);
        });
    });

    describe('products', () => {
        const contact = {
            contactFirstName: 'Smoke',
            contactLastName: 'Products',
            contactEmail: 'smoke.products+prod3320@pakfactory.com',
        } as const;
        const shipTo = {
            city: 'Toronto',
            country: 'Canada',
            countryCode: 'CA',
        };

        it('allows qty-only lines with empty contents when brief, contact, and ship-to are set', () => {
            const products = draft({
                entryKind: 'products',
                express: false,
                productsExpanded: true,
                notes: 'Qty-only smoke for PROD-3320',
                packagingContents: '',
                shippingAddress: shipTo,
                ...contact,
            });
            const lines = [productLine({contents: '  '})];
            assert.equal(isContentsReady(products, lines), true);
            assert.equal(canSubmitRequest(products, lines, REQUEST_FORM_RULES), true);
        });

        it('still requires a brief for products under REQUEST_FORM_RULES', () => {
            const products = draft({
                entryKind: 'products',
                express: false,
                productsExpanded: true,
                notes: '',
                shippingAddress: shipTo,
                ...contact,
            });
            const lines = [productLine({quantities: [1000], contents: ''})];
            assert.equal(isNotesReady(products, lines, REQUEST_FORM_RULES), false);
            assert.equal(canSubmitRequest(products, lines, REQUEST_FORM_RULES), false);
        });
    });
});
