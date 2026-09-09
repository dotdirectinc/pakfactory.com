'use server';

import {headers} from 'next/headers';
import {
    fetchAutocompleteSuggestions,
    fetchPlaceDetails,
} from '@/lib/places/google-adapter';
import {allowAutocomplete, allowDetails} from '@/lib/places/rate-limit';
import type {
    PlacesAutocompleteResult,
    PlacesDetailsResult,
} from '@/lib/places/types';

const SESSION_TOKEN_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MIN_INPUT_LENGTH = 3;

function placesEnabled(): boolean {
    const flag = process.env.PLACES_AUTOCOMPLETE_ENABLED?.trim().toLowerCase();
    if (flag === 'false' || flag === '0' || flag === 'off') return false;
    const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
    return Boolean(key);
}

function apiKey(): string | null {
    const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
    return key || null;
}

async function clientIp(): Promise<string> {
    const h = await headers();
    const forwarded = h.get('x-forwarded-for');
    const first = forwarded?.split(',')[0]?.trim();
    return first || h.get('x-real-ip') || 'unknown';
}

function isValidSessionToken(token: string): boolean {
    return SESSION_TOKEN_RE.test(token.trim());
}

export async function placesAutocomplete(input: {
    input: string;
    sessionToken: string;
    countryCode?: string;
}): Promise<PlacesAutocompleteResult> {
    if (!placesEnabled()) {
        return {ok: false, reason: 'disabled'};
    }
    const key = apiKey();
    if (!key) return {ok: false, reason: 'disabled'};

    const sessionToken = input.sessionToken?.trim() ?? '';
    if (!isValidSessionToken(sessionToken)) {
        return {ok: false, reason: 'unavailable'};
    }

    const text = input.input?.trim() ?? '';
    if (text.length < MIN_INPUT_LENGTH) {
        return {ok: true, suggestions: []};
    }

    const ip = await clientIp();
    if (!allowAutocomplete(sessionToken, ip)) {
        return {ok: false, reason: 'rate_limited'};
    }

    const result = await fetchAutocompleteSuggestions({
        apiKey: key,
        text,
        sessionToken,
        countryCode: input.countryCode,
    });

    if (!result.ok) return {ok: false, reason: 'unavailable'};
    return {ok: true, suggestions: result.suggestions};
}

export async function placesDetails(input: {
    placeId: string;
    sessionToken: string;
}): Promise<PlacesDetailsResult> {
    if (!placesEnabled()) {
        return {ok: false, reason: 'disabled'};
    }
    const key = apiKey();
    if (!key) return {ok: false, reason: 'disabled'};

    const sessionToken = input.sessionToken?.trim() ?? '';
    const placeId = input.placeId?.trim() ?? '';
    if (!isValidSessionToken(sessionToken) || !placeId) {
        return {ok: false, reason: 'unavailable'};
    }

    const ip = await clientIp();
    if (!allowDetails(ip)) {
        return {ok: false, reason: 'rate_limited'};
    }

    const result = await fetchPlaceDetails({
        apiKey: key,
        placeId,
        sessionToken,
    });

    if (!result.ok) return {ok: false, reason: 'unavailable'};
    return {ok: true, address: result.address};
}
