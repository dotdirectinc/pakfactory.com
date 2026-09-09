import type {ShippingAddress} from '@/lib/request/request.storage';

export type PlacesFailReason = 'disabled' | 'rate_limited' | 'unavailable';

export type PlacesSuggestion = {
    placeId: string;
    primaryText: string;
    secondaryText: string;
};

export type PlacesAutocompleteOk = {
    ok: true;
    suggestions: PlacesSuggestion[];
};

export type PlacesAutocompleteFail = {
    ok: false;
    reason: PlacesFailReason;
};

export type PlacesAutocompleteResult =
    | PlacesAutocompleteOk
    | PlacesAutocompleteFail;

export type PlacesDetailsOk = {
    ok: true;
    address: Partial<ShippingAddress>;
};

export type PlacesDetailsFail = {
    ok: false;
    reason: PlacesFailReason;
};

export type PlacesDetailsResult = PlacesDetailsOk | PlacesDetailsFail;
