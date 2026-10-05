import assert from 'node:assert/strict';
import {beforeEach, describe, it} from 'node:test';

import {
    EMPTY_DRAFT,
    REQUEST_STORAGE_KEY,
    consumeSubmittedRequestLines,
    getRequestStateSnapshot,
    saveRequestState,
    type RequestLine,
    type RequestState,
} from './request.storage';

/** Minimal localStorage so persist()/readRaw() work under node:test. */
function installLocalStorage() {
    const store = new Map<string, string>();
    const localStorage = {
        getItem(key: string) {
            return store.has(key) ? store.get(key)! : null;
        },
        setItem(key: string, value: string) {
            store.set(key, value);
        },
        removeItem(key: string) {
            store.delete(key);
        },
        clear() {
            store.clear();
        },
    };
    Object.defineProperty(globalThis, 'window', {
        value: {localStorage},
        configurable: true,
        writable: true,
    });
    return localStorage;
}

function line(id: string, productSlug = id): RequestLine {
    return {
        id,
        productSlug,
        quantities: [500],
        contents: 'Widgets',
        customizations: [],
        addedAt: '2026-10-05T12:00:00.000Z',
    };
}

function seed(state: RequestState) {
    saveRequestState(state);
}

beforeEach(() => {
    const ls = installLocalStorage();
    ls.clear();
    // Force the in-module cache to miss on the next read.
    ls.removeItem(REQUEST_STORAGE_KEY);
});

describe('consumeSubmittedRequestLines', () => {
    it('removes only builder-scoped lines when a subset was selected', () => {
        seed({
            lines: [line('a'), line('b'), line('c')],
            draft: {
                ...EMPTY_DRAFT,
                id: 'draft-1',
                builderLineIds: ['a', 'c'],
                submittedAt: '2026-10-05T12:00:00.000Z',
                ref: 'RFQ-1001',
            },
        });

        consumeSubmittedRequestLines();

        const next = getRequestStateSnapshot();
        assert.deepEqual(
            next.lines.map((l) => l.id),
            ['b'],
        );
        assert.equal(next.draft.builderLineIds, null);
        assert.equal(next.draft.productsExpanded, true);
        assert.equal(next.draft.submittedAt, '2026-10-05T12:00:00.000Z');
        assert.equal(next.draft.ref, 'RFQ-1001');
    });

    it('empties the pool when builderLineIds is null (all lines in scope)', () => {
        seed({
            lines: [line('a'), line('b')],
            draft: {
                ...EMPTY_DRAFT,
                id: 'draft-2',
                builderLineIds: null,
                submittedAt: '2026-10-05T12:00:00.000Z',
                ref: 'RFQ-1002',
            },
        });

        consumeSubmittedRequestLines();

        const next = getRequestStateSnapshot();
        assert.deepEqual(next.lines, []);
        assert.equal(next.draft.builderLineIds, null);
        assert.equal(next.draft.productsExpanded, false);
        assert.equal(next.draft.ref, 'RFQ-1002');
        assert.equal(next.draft.submittedAt, '2026-10-05T12:00:00.000Z');
    });

    it('leaves the pool unchanged for express (builderLineIds: [])', () => {
        const parked = [line('parked-1'), line('parked-2')];
        seed({
            lines: parked,
            draft: {
                ...EMPTY_DRAFT,
                id: 'draft-3',
                express: true,
                entryKind: 'express',
                builderLineIds: [],
                submittedAt: '2026-10-05T12:00:00.000Z',
                ref: 'RFQ-1003',
            },
        });

        consumeSubmittedRequestLines();

        const next = getRequestStateSnapshot();
        assert.deepEqual(
            next.lines.map((l) => l.id),
            ['parked-1', 'parked-2'],
        );
        assert.equal(next.draft.builderLineIds, null);
        assert.equal(next.draft.productsExpanded, true);
        assert.equal(next.draft.ref, 'RFQ-1003');
        assert.equal(next.draft.submittedAt, '2026-10-05T12:00:00.000Z');
    });
});
