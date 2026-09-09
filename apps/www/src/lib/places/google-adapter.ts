import {mapAddressComponents} from '@/lib/places/map-address';
import type {PlacesSuggestion} from '@/lib/places/types';
import type {ShippingAddress} from '@/lib/request/request.storage';

const AUTOCOMPLETE_URL =
    'https://places.googleapis.com/v1/places:autocomplete';

type GoogleSuggestion = {
    placePrediction?: {
        placeId?: string;
        structuredFormat?: {
            mainText?: {text?: string};
            secondaryText?: {text?: string};
        };
        text?: {text?: string};
    };
};

type AutocompleteResponse = {
    suggestions?: GoogleSuggestion[];
};

type PlaceDetailsResponse = {
    id?: string;
    formattedAddress?: string;
    addressComponents?: Array<{
        longText?: string;
        shortText?: string;
        types?: string[];
    }>;
};

export type GoogleAdapterError = 'unavailable';

function includedRegionCodes(countryCode?: string): string[] {
    const code = countryCode?.trim().toUpperCase();
    if (code === 'CA' || code === 'US') return [code];
    return ['CA', 'US'];
}

export async function fetchAutocompleteSuggestions(input: {
    apiKey: string;
    text: string;
    sessionToken: string;
    countryCode?: string;
}): Promise<
    | {ok: true; suggestions: PlacesSuggestion[]}
    | {ok: false; error: GoogleAdapterError}
> {
    try {
        const res = await fetch(AUTOCOMPLETE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': input.apiKey,
            },
            body: JSON.stringify({
                input: input.text,
                sessionToken: input.sessionToken,
                languageCode: 'en',
                includedRegionCodes: includedRegionCodes(input.countryCode),
            }),
            cache: 'no-store',
        });

        if (!res.ok) {
            console.error(
                '[places] autocomplete failed',
                res.status,
                await res.text().catch(() => ''),
            );
            return {ok: false, error: 'unavailable'};
        }

        const data = (await res.json()) as AutocompleteResponse;
        const suggestions: PlacesSuggestion[] = [];
        for (const row of data.suggestions ?? []) {
            const pred = row.placePrediction;
            if (!pred) continue;
            const placeId = pred.placeId?.trim();
            if (!placeId) continue;
            const primary =
                pred.structuredFormat?.mainText?.text?.trim() ||
                pred.text?.text?.trim() ||
                '';
            if (!primary) continue;
            suggestions.push({
                placeId,
                primaryText: primary,
                secondaryText:
                    pred.structuredFormat?.secondaryText?.text?.trim() ?? '',
            });
            if (suggestions.length >= 5) break;
        }
        return {ok: true, suggestions};
    } catch (err) {
        console.error('[places] autocomplete error', err);
        return {ok: false, error: 'unavailable'};
    }
}

export async function fetchPlaceDetails(input: {
    apiKey: string;
    placeId: string;
    sessionToken: string;
}): Promise<
    | {ok: true; address: Partial<ShippingAddress>}
    | {ok: false; error: GoogleAdapterError}
> {
    const placeId = input.placeId.replace(/^places\//, '');
    const url = new URL(
        `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    );
    url.searchParams.set('sessionToken', input.sessionToken);

    try {
        const res = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'X-Goog-Api-Key': input.apiKey,
                'X-Goog-FieldMask':
                    'id,formattedAddress,addressComponents',
            },
            cache: 'no-store',
        });

        if (!res.ok) {
            console.error(
                '[places] details failed',
                res.status,
                await res.text().catch(() => ''),
            );
            return {ok: false, error: 'unavailable'};
        }

        const data = (await res.json()) as PlaceDetailsResponse;
        const address = mapAddressComponents(
            data.addressComponents ?? [],
            data.formattedAddress,
        );
        return {ok: true, address};
    } catch (err) {
        console.error('[places] details error', err);
        return {ok: false, error: 'unavailable'};
    }
}
