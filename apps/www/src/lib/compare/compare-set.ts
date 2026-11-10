'use client';

/**
 * Compare set (Website PRD v4.6 §4.7 — R43–R45): one set per visitor for products and
 * customizations, kept in this browser until Clear (localStorage, no expiry). Items group
 * themselves — products by product line (styles shown on /compare), customizations by
 * option type (library category) — up to COMPARE_GROUP_MAX per group; a fifth asks to
 * replace one. Adding is never refused.
 *
 * Also holds the dock's UI state (open, the group it opens on, a pending "replace one?")
 * so the add buttons and the dock stay in step.
 */
import {useSyncExternalStore} from 'react';

import {getCompareBehavior} from '@/lib/compare/compare-behavior';
import {COMPARE_GROUP_LIMIT, COMPARE_GROUP_MAX} from '@/lib/compare/compare-ids';
import {trackCompare} from '@/lib/compare/compare-events';

export {COMPARE_GROUP_MAX};
const STORAGE_KEY = 'pf-compare-v1';
const CHANGE_EVENT = 'pf-compare-set';

export type CompareKind = 'product' | 'customization';

export type CompareItem = {
    kind: CompareKind;
    /** Product slug, or `categoryValue/slug` for a customization (same as its bookmark id). */
    id: string;
    title: string;
    href: string;
    imageUrl?: string | null;
    /** Product line slug, or the customization's library category. */
    groupKey: string;
    groupLabel: string;
    /** Products: style title when the card knows it. */
    styleTitle?: string;
    inspiration?: boolean;
    sku?: string;
    /** Customizations. */
    categoryValue?: string;
    typeTitle?: string;
    addedAt: number;
};

export type CompareGroup = {kind: CompareKind; key: string; label: string; items: CompareItem[]};

type DockState = {
    open: boolean;
    /** `kind:groupKey` the dock shows first. */
    focus: string | null;
    /** A fifth item waiting for "replace one?". */
    pending: CompareItem | null;
    /** Compare spec CMP-1: the confirmation shown instead of opening the bar ("Added to Rigid boxes (2) · Compare · Undo"). */
    snack: CompareSnack | null;
    /** The set before the last add or replace, for Undo. */
    undo: CompareItem[] | null;
};

export type CompareSnack = {text: string; /** `kind:groupKey` to offer Compare for (2+ items), or null. */ compareGroup: string | null; at: number};

type State = {items: CompareItem[]; dock: DockState};

let state: State = {items: [], dock: {open: false, focus: null, pending: null, snack: null, undo: null}};
let loaded = false;

function load(): void {
    if (loaded || typeof window === 'undefined') return;
    loaded = true;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? (JSON.parse(raw) as CompareItem[]) : [];
        if (Array.isArray(parsed)) state = {...state, items: parsed.filter((i) => i && i.id && i.kind)};
    } catch {
        // Private mode or blocked storage: the set lives for this page view only.
    }
}

function persist(): void {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch {
        /* ignore */
    }
}

function set(next: Partial<State>, save = false): void {
    state = {...state, ...next};
    if (save) persist();
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGE_EVENT));
}

export const groupId = (kind: CompareKind, key: string) => `${kind}:${key}`;

export function getCompareState(): State {
    load();
    return state;
}

export function isInCompare(kind: CompareKind, id: string): boolean {
    load();
    return state.items.some((i) => i.kind === kind && i.id === id);
}

export function compareGroups(items: CompareItem[]): CompareGroup[] {
    const out = new Map<string, CompareGroup>();
    for (const it of items) {
        const k = groupId(it.kind, it.groupKey);
        if (!out.has(k)) out.set(k, {kind: it.kind, key: it.groupKey, label: it.groupLabel, items: []});
        out.get(k)!.items.push(it);
    }
    return [...out.values()];
}

export type AddInput = Omit<CompareItem, 'addedAt'>;
export type AddResult = 'added' | 'removed' | 'pending' | 'present';

/** Add (or, if already there, remove). Opens the dock on the item's group; never refused. */
export function toggleCompare(input: AddInput, page?: string): AddResult {
    load();
    if (state.items.some((i) => i.kind === input.kind && i.id === input.id)) {
        removeFromCompare(input.kind, input.id);
        return 'removed';
    }
    return addToCompare(input, page);
}

const FIRST_SHOWN_KEY = 'pf_compare_bar_shown';
function firstShown(): boolean {
    try {
        return window.sessionStorage.getItem(FIRST_SHOWN_KEY) === '1';
    } catch {
        return true;
    }
}
function markFirstShown(): void {
    try {
        window.sessionStorage.setItem(FIRST_SHOWN_KEY, '1');
    } catch {
        /* storage blocked */
    }
}

/**
 * Add one item (R43, never refused). Compare spec CMP-1/CMP-3: confirms with a snackbar instead of
 * opening the bar (the first add of a session opens it once); a fifth item in a full group
 * replaces the oldest with Undo, or asks "Replace which?" (getCompareBehavior).
 */
export function addToCompare(input: AddInput, page?: string): AddResult {
    load();
    if (state.items.some((i) => i.kind === input.kind && i.id === input.id)) return 'present';
    const item: CompareItem = {...input, addedAt: Date.now()};
    const focus = groupId(item.kind, item.groupKey);
    const inGroup = state.items.filter((i) => groupId(i.kind, i.groupKey) === focus);
    const behavior = getCompareBehavior();
    const prev = state.items;
    const where = page ?? (typeof window !== 'undefined' ? window.location.pathname : '');
    if (inGroup.length >= Math.min(behavior.maxPerGroup, COMPARE_GROUP_LIMIT)) {
        if (behavior.fifth === 'ask') {
            set({dock: {...state.dock, open: true, focus, pending: item, snack: null}});
            return 'pending';
        }
        const oldest = [...inGroup].sort((a, b) => a.addedAt - b.addedAt)[0]!;
        const items = [...prev.filter((i) => !(i.kind === oldest.kind && i.id === oldest.id)), item];
        set({items, dock: {...state.dock, focus, pending: null, undo: prev, snack: {text: `Replaced ${oldest.title} with ${item.title}`, compareGroup: focus, at: Date.now()}}}, true);
        trackCompare('compare_add', {item_type: item.kind, group: item.groupKey, page: where, replaced: true});
        return 'added';
    }
    const n = inGroup.length + 1;
    const openOnce = behavior.firstOpen && !state.dock.open && !firstShown();
    if (openOnce) markFirstShown();
    set(
        {
            items: [...prev, item],
            dock: {
                ...state.dock,
                open: state.dock.open || openOnce,
                focus,
                pending: null,
                undo: prev,
                snack: openOnce || state.dock.open ? null : {text: `Added to ${item.groupLabel} (${n})`, compareGroup: n >= 2 ? focus : null, at: Date.now()},
            },
        },
        true,
    );
    trackCompare('compare_add', {item_type: item.kind, group: item.groupKey, page: where});
    return 'added';
}

/** Undo the last add or replace (the snackbar's Undo). */
export function undoCompare(): void {
    load();
    if (!state.dock.undo) return;
    trackCompare('compare_action', {action: 'undo'});
    set({items: state.dock.undo, dock: {...state.dock, undo: null, snack: null}}, true);
}

export function dismissCompareSnack(): void {
    load();
    if (state.dock.snack) set({dock: {...state.dock, snack: null}});
}

/** Answer "replace one?": swap the pending item in for `replaceId`, or cancel with null. */
export function resolvePending(replaceId: string | null): void {
    load();
    const p = state.dock.pending;
    if (!p) return;
    if (!replaceId) {
        set({dock: {...state.dock, pending: null}});
        return;
    }
    const items = state.items.map((i) => (i.kind === p.kind && i.id === replaceId ? p : i));
    set({items, dock: {...state.dock, pending: null, undo: state.items, snack: null}}, true);
    trackCompare('compare_add', {item_type: p.kind, group: p.groupKey, page: window.location.pathname, replaced: true});
}

/** Swap one item for another in place (the /compare title switcher); keeps the column's position. */
export function replaceInCompare(kind: CompareKind, oldId: string, input: AddInput): void {
    load();
    if (state.items.some((i) => i.kind === input.kind && i.id === input.id)) return;
    const items = state.items.map((i) => (i.kind === kind && i.id === oldId ? {...input, addedAt: i.addedAt} : i));
    trackCompare('compare_action', {action: 'switch', from: oldId, to: input.id});
    set({items, dock: {...state.dock, undo: state.items, snack: null}}, true);
}

export function removeFromCompare(kind: CompareKind, id: string): void {
    load();
    set({items: state.items.filter((i) => !(i.kind === kind && i.id === id))}, true);
}

/** Add several (e.g. "Add these to my compare" from a shared link); groups that fill up ask per item. */
export function addManyToCompare(inputs: AddInput[]): void {
    for (const i of inputs) if (addToCompare(i) === 'pending') break;
}

/** Where Close on /compare returns to — shared tool-shell return (set by the compare bar on site pages). */
export {
    rememberToolShellReturn as rememberCompareReturn,
    toolShellReturnHref as compareReturnHref,
} from '@/lib/ui/tool-shell-return';

export function clearCompare(): void {
    load();
    trackCompare('compare_action', {action: 'clear', items: state.items.length});
    set({items: [], dock: {open: false, focus: null, pending: null, snack: null, undo: null}}, true);
}

/** Remove every item in one product line / customization group (one dock row). */
export function clearCompareGroup(kind: CompareKind, groupKey: string): void {
    load();
    const before = state.items.length;
    const items = state.items.filter((i) => !(i.kind === kind && i.groupKey === groupKey));
    const removed = before - items.length;
    if (removed === 0) return;
    trackCompare('compare_action', {action: 'clear_group', kind, groupKey, items: removed});
    const empty = items.length === 0;
    set(
        {
            items,
            dock: {
                ...state.dock,
                ...(empty
                    ? {open: false, focus: null, pending: null, snack: null, undo: null}
                    : {
                          pending:
                              state.dock.pending &&
                              state.dock.pending.kind === kind &&
                              state.dock.pending.groupKey === groupKey
                                  ? null
                                  : state.dock.pending,
                          snack: null,
                      }),
            },
        },
        true,
    );
}

export function setDockOpen(open: boolean, focus?: string | null): void {
    load();
    set({dock: {...state.dock, open, ...(focus !== undefined ? {focus} : {}), ...(open ? {snack: null} : {pending: null})}});
}

function subscribe(cb: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const h = () => cb();
    const storage = (e: StorageEvent) => {
        if (e.key !== STORAGE_KEY) return;
        loaded = false;
        load();
        cb();
    };
    window.addEventListener(CHANGE_EVENT, h);
    window.addEventListener('storage', storage);
    return () => {
        window.removeEventListener(CHANGE_EVENT, h);
        window.removeEventListener('storage', storage);
    };
}

const EMPTY: State = {items: [], dock: {open: false, focus: null, pending: null, snack: null, undo: null}};

/** The compare set and dock state; re-renders on every change (and across tabs). */
export function useCompareSet(): State {
    return useSyncExternalStore(subscribe, getCompareState, () => EMPTY);
}

/** "Compare" link for one group: /compare?type=products|customizations&ids=… */
export function compareHref(group: Pick<CompareGroup, 'kind' | 'items'>, opts?: {shared?: boolean}): string {
    const q = new URLSearchParams();
    q.set('type', group.kind === 'product' ? 'products' : 'customizations');
    q.set('ids', group.items.map((i) => i.id).join(','));
    if (opts?.shared) q.set('shared', '1');
    return `/compare?${q.toString()}`;
}

/** Title-case a slug for a fallback group label ("rigid-boxes" → "Rigid boxes"). */
export function labelFromSlug(slug: string): string {
    const s = slug.replace(/[-_]+/g, ' ').trim();
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Other';
}
