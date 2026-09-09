'use client';

import {
    useCallback,
    useEffect,
    useId,
    useRef,
    useState,
    useTransition,
    type KeyboardEvent,
} from 'react';
import {Input} from '@pakfactory/ui/components/input';
import {cn} from '@pakfactory/ui/lib/utils';
import {
    placesAutocomplete,
    placesDetails,
} from '@/lib/places/actions';
import type {PlacesSuggestion} from '@/lib/places/types';
import type {ShippingAddress} from '@/lib/request/request.storage';

const DEBOUNCE_MS = 300;
const MIN_CHARS = 3;

function newSessionToken(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

type AddressLineAutocompleteProps = {
    value: string;
    countryCode?: string;
    onLine1Change: (line1: string) => void;
    onAddressFill: (patch: Partial<ShippingAddress>) => void;
    className?: string;
    inputClassName?: string;
};

export function AddressLineAutocomplete({
    value,
    countryCode,
    onLine1Change,
    onAddressFill,
    className,
    inputClassName,
}: AddressLineAutocompleteProps) {
    const listId = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const sessionRef = useRef(newSessionToken());
    const requestSeq = useRef(0);
    const selectingRef = useRef(false);
    const [open, setOpen] = useState(false);
    const [suggestions, setSuggestions] = useState<PlacesSuggestion[]>([]);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [disabled, setDisabled] = useState(false);
    const [, startTransition] = useTransition();

    const clearSuggestions = useCallback(() => {
        setSuggestions([]);
        setActiveIndex(-1);
        setOpen(false);
    }, []);

    const rotateSession = useCallback(() => {
        sessionRef.current = newSessionToken();
    }, []);

    useEffect(() => {
        if (disabled) return;
        const q = value.trim();
        if (q.length < MIN_CHARS) {
            clearSuggestions();
            return;
        }

        const seq = ++requestSeq.current;
        const timer = window.setTimeout(() => {
            startTransition(async () => {
                const result = await placesAutocomplete({
                    input: q,
                    sessionToken: sessionRef.current,
                    countryCode,
                });
                if (seq !== requestSeq.current) return;

                if (!result.ok) {
                    if (result.reason === 'disabled') setDisabled(true);
                    clearSuggestions();
                    return;
                }
                setSuggestions(result.suggestions);
                setActiveIndex(result.suggestions.length ? 0 : -1);
                setOpen(result.suggestions.length > 0);
            });
        }, DEBOUNCE_MS);

        return () => window.clearTimeout(timer);
    }, [value, countryCode, disabled, clearSuggestions]);

    useEffect(() => {
        function onPointerDown(event: MouseEvent) {
            if (!rootRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', onPointerDown);
        return () => document.removeEventListener('mousedown', onPointerDown);
    }, []);

    const selectSuggestion = useCallback(
        async (suggestion: PlacesSuggestion) => {
            selectingRef.current = true;
            const sessionToken = sessionRef.current;
            onLine1Change(suggestion.primaryText);
            clearSuggestions();
            try {
                const result = await placesDetails({
                    placeId: suggestion.placeId,
                    sessionToken,
                });
                if (!result.ok) {
                    if (result.reason === 'disabled') setDisabled(true);
                    return;
                }
                onAddressFill(result.address);
            } finally {
                rotateSession();
                selectingRef.current = false;
            }
        },
        [clearSuggestions, onAddressFill, onLine1Change, rotateSession],
    );

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (!open || suggestions.length === 0) {
            if (event.key === 'Escape') setOpen(false);
            return;
        }
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex((i) => (i + 1) % suggestions.length);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex(
                (i) => (i - 1 + suggestions.length) % suggestions.length,
            );
        } else if (event.key === 'Enter' && activeIndex >= 0) {
            event.preventDefault();
            const pick = suggestions[activeIndex];
            if (pick) void selectSuggestion(pick);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            setOpen(false);
        }
    };

    return (
        <div ref={rootRef} className={cn('relative', className)}>
            <Input
                className={inputClassName}
                value={value}
                onBlur={() => {
                    // Delay so option mousedown can fire first.
                    window.setTimeout(() => {
                        if (selectingRef.current) return;
                        if (
                            !rootRef.current?.contains(document.activeElement)
                        ) {
                            setOpen(false);
                            // End abandoned Autocomplete session for billing.
                            rotateSession();
                        }
                    }, 100);
                }}
                onChange={(e) => {
                    const next = e.target.value;
                    onLine1Change(next);
                    if (!next.trim()) {
                        clearSuggestions();
                        rotateSession();
                        return;
                    }
                    if (!open && next.trim().length >= MIN_CHARS) {
                        setOpen(true);
                    }
                }}
                onKeyDown={onKeyDown}
                onFocus={() => {
                    if (suggestions.length > 0) setOpen(true);
                }}
                placeholder="Address"
                autoComplete="street-address"
                role="combobox"
                aria-expanded={open}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={
                    activeIndex >= 0
                        ? `${listId}-option-${activeIndex}`
                        : undefined
                }
            />
            {open && suggestions.length > 0 ? (
                <ul
                    id={listId}
                    role="listbox"
                    className="absolute z-50 mt-1 max-h-60 w-full overflow-auto overscroll-contain rounded-sm border border-input bg-background py-1 text-sm shadow-md"
                >
                    {suggestions.map((s, index) => {
                        const active = index === activeIndex;
                        return (
                            <li
                                key={s.placeId}
                                id={`${listId}-option-${index}`}
                                role="option"
                                aria-selected={active}
                                className={cn(
                                    'cursor-pointer px-3 py-2',
                                    active
                                        ? 'bg-accent text-accent-foreground'
                                        : 'hover:bg-muted',
                                )}
                                onMouseEnter={() => setActiveIndex(index)}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    void selectSuggestion(s);
                                }}
                            >
                                <div className="font-medium">
                                    {s.primaryText}
                                </div>
                                {s.secondaryText ? (
                                    <div className="text-xs text-muted-foreground">
                                        {s.secondaryText}
                                    </div>
                                ) : null}
                            </li>
                        );
                    })}
                </ul>
            ) : null}
        </div>
    );
}
