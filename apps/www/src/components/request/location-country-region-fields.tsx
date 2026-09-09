'use client';

import {useEffect, useState} from 'react';
import {ChevronDownIcon} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@pakfactory/ui/components/dropdown-menu';
import {Input} from '@pakfactory/ui/components/input';
import {Label} from '@pakfactory/ui/components/label';
import {cn} from '@pakfactory/ui/lib/utils';
import {
    GEO_OTHER,
    PINNED_COUNTRY_COUNT,
    countryLabel,
    hasRegions,
    listCountries,
    listRegions,
    regionFieldLabel,
    regionLabel,
} from '@pakfactory/geo';
import type {ShippingAddress} from '@/lib/request/request.storage';

const TRIGGER_CLASS =
    'flex h-11 w-full items-center justify-between rounded-sm border border-input bg-background px-3 text-sm';
const INPUT_CLASS =
    'h-11 rounded-sm border border-input bg-background text-sm';
const MENU_CONTENT_CLASS =
    'overscroll-contain w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)]';

type LocationPatch = Partial<ShippingAddress>;

type LocationValue = Pick<
    ShippingAddress,
    'country' | 'countryCode' | 'region' | 'regionCode'
>;

type LocationCountryFieldProps = {
    value: LocationValue;
    onPatch: (patch: LocationPatch) => void;
    className?: string;
};

type LocationRegionFieldProps = {
    value: LocationValue;
    onPatch: (patch: LocationPatch) => void;
    className?: string;
};

/** Whether the region control should render for this country selection. */
export function shouldShowRegionField(value: LocationValue): boolean {
    const countryCode = value.countryCode?.trim() ?? '';
    const country = (value.country ?? '').trim();
    const region = (value.region ?? '').trim();
    const regionCode = value.regionCode?.trim() ?? '';
    if (countryCode && hasRegions(countryCode)) return true;
    if (!countryCode && country) return true;
    if (region || regionCode) return true;
    return false;
}

/**
 * Country picker (ISO list + Other…) via non-modal DropdownMenu.
 * Radix Select RemoveScroll breaks the Brief Builder sticky shell.
 */
export function LocationCountryField({
    value,
    onPatch,
    className,
}: LocationCountryFieldProps) {
    const countryCode = value.countryCode?.trim() ?? '';
    const country = value.country ?? '';

    const [countryOther, setCountryOther] = useState(
        () => Boolean(country.trim() && !countryCode),
    );

    useEffect(() => {
        if (countryCode) setCountryOther(false);
        else if (country.trim()) setCountryOther(true);
    }, [countryCode, country]);

    const countries = listCountries();
    const pinned = countries.slice(0, PINNED_COUNTRY_COUNT);
    const rest = countries.slice(PINNED_COUNTRY_COUNT);

    function pickCountry(code: string) {
        if (code === GEO_OTHER) {
            setCountryOther(true);
            onPatch({
                country: '',
                countryCode: undefined,
                region: '',
                regionCode: undefined,
            });
            return;
        }
        setCountryOther(false);
        onPatch({
            country: countryLabel(code),
            countryCode: code,
            region: '',
            regionCode: undefined,
        });
    }

    return (
        <div className={className}>
            <Label className="mb-1 block text-xs font-medium">Country</Label>
            {countryOther ? (
                <div className="space-y-2">
                    <Input
                        className={INPUT_CLASS}
                        value={country}
                        onChange={(e) =>
                            onPatch({
                                country: e.target.value,
                                countryCode: undefined,
                                regionCode: undefined,
                            })
                        }
                        placeholder="Country"
                        autoComplete="country-name"
                    />
                    <Button
                        type="button"
                        variant="link"
                        className="h-auto px-0 text-xs text-muted-foreground"
                        onClick={() => {
                            setCountryOther(false);
                            onPatch({
                                country: '',
                                countryCode: undefined,
                                region: '',
                                regionCode: undefined,
                            });
                        }}
                    >
                        Choose from list
                    </Button>
                </div>
            ) : (
                <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            className={cn(
                                TRIGGER_CLASS,
                                !countryCode && 'text-muted-foreground',
                            )}
                        >
                            <span className="truncate">
                                {countryCode
                                    ? countryLabel(countryCode)
                                    : 'Select country'}
                            </span>
                            <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="start"
                        className={MENU_CONTENT_CLASS}
                    >
                        <DropdownMenuLabel>Suggested</DropdownMenuLabel>
                        <DropdownMenuRadioGroup
                            value={countryCode || undefined}
                            onValueChange={pickCountry}
                        >
                            {pinned.map((c) => (
                                <DropdownMenuRadioItem
                                    key={c.code}
                                    value={c.code}
                                >
                                    {c.label}
                                </DropdownMenuRadioItem>
                            ))}
                        </DropdownMenuRadioGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>All countries</DropdownMenuLabel>
                        <DropdownMenuRadioGroup
                            value={countryCode || undefined}
                            onValueChange={pickCountry}
                        >
                            {rest.map((c) => (
                                <DropdownMenuRadioItem
                                    key={c.code}
                                    value={c.code}
                                >
                                    {c.label}
                                </DropdownMenuRadioItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioItem value={GEO_OTHER}>
                                Other…
                            </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    );
}

/**
 * Region / province / state picker filtered by countryCode, with Other….
 */
export function LocationRegionField({
    value,
    onPatch,
    className,
}: LocationRegionFieldProps) {
    const countryCode = value.countryCode?.trim() ?? '';
    const regionCode = value.regionCode?.trim() ?? '';
    const region = value.region ?? '';
    const country = value.country ?? '';

    const [regionOther, setRegionOther] = useState(
        () => Boolean(region.trim() && !regionCode),
    );

    useEffect(() => {
        if (regionCode) setRegionOther(false);
        else if (region.trim() && !countryCode) setRegionOther(true);
    }, [regionCode, region, countryCode]);

    const regions = countryCode ? listRegions(countryCode) : [];
    const showRegionSelect = Boolean(countryCode && hasRegions(countryCode));
    const showRegionFreeText =
        regionOther ||
        Boolean(country.trim() && !countryCode) ||
        (Boolean(region.trim()) && !regionCode && !showRegionSelect);
    const regionLabelText = countryCode
        ? regionFieldLabel(countryCode)
        : 'Region';

    function pickRegion(code: string) {
        if (code === GEO_OTHER) {
            setRegionOther(true);
            onPatch({
                region: '',
                regionCode: undefined,
            });
            return;
        }
        setRegionOther(false);
        onPatch({
            region: regionLabel(countryCode, code),
            regionCode: code,
        });
    }

    return (
        <div className={className}>
            <Label className="mb-1 block text-xs font-medium">
                {regionLabelText}
            </Label>
            {showRegionFreeText || !showRegionSelect ? (
                <div className="space-y-2">
                    <Input
                        className={INPUT_CLASS}
                        value={region}
                        onChange={(e) =>
                            onPatch({
                                region: e.target.value,
                                regionCode: undefined,
                            })
                        }
                        placeholder={regionLabelText}
                        autoComplete="address-level1"
                    />
                    {showRegionSelect ? (
                        <Button
                            type="button"
                            variant="link"
                            className="h-auto px-0 text-xs text-muted-foreground"
                            onClick={() => {
                                setRegionOther(false);
                                onPatch({
                                    region: '',
                                    regionCode: undefined,
                                });
                            }}
                        >
                            Choose from list
                        </Button>
                    ) : null}
                </div>
            ) : (
                <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild disabled={!countryCode}>
                        <button
                            type="button"
                            disabled={!countryCode}
                            className={cn(
                                TRIGGER_CLASS,
                                !regionCode && 'text-muted-foreground',
                                !countryCode &&
                                    'cursor-not-allowed opacity-50',
                            )}
                        >
                            <span className="truncate">
                                {regionCode
                                    ? regionLabel(countryCode, regionCode)
                                    : `Select ${regionLabelText.toLowerCase()}`}
                            </span>
                            <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="start"
                        className={MENU_CONTENT_CLASS}
                    >
                        <DropdownMenuRadioGroup
                            value={regionCode || undefined}
                            onValueChange={pickRegion}
                        >
                            {regions.map((r) => (
                                <DropdownMenuRadioItem
                                    key={r.code}
                                    value={r.code}
                                >
                                    {r.label}
                                </DropdownMenuRadioItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioItem value={GEO_OTHER}>
                                Other…
                            </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    );
}

/** @deprecated Prefer composing LocationCountryField + LocationRegionField. */
export function LocationCountryRegionFields({
    value,
    onPatch,
    className,
    gridClassName = 'grid gap-3 sm:grid-cols-2',
}: {
    value: LocationValue;
    onPatch: (patch: LocationPatch) => void;
    className?: string;
    gridClassName?: string;
}) {
    return (
        <div className={className}>
            <div className={gridClassName}>
                <LocationCountryField value={value} onPatch={onPatch} />
                {shouldShowRegionField(value) ? (
                    <LocationRegionField value={value} onPatch={onPatch} />
                ) : null}
            </div>
        </div>
    );
}
