'use client';

import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    useFormField,
} from '@pakfactory/ui/components/form';
import type {ControllerRenderProps} from 'react-hook-form';
import {
    Collapsible,
    CollapsibleContent,
} from '@pakfactory/ui/components/collapsible';
import {Input} from '@pakfactory/ui/components/input';
import {cn} from '@pakfactory/ui/lib/utils';
import {AddressLineAutocomplete} from '@/components/request/address-line-autocomplete';
import {
    LocationCountryField,
    LocationRegionField,
    shouldShowRegionField,
} from '@/components/request/location-country-region-fields';
import type {ShippingAddress} from '@/lib/request/request.storage';
import {
    addressFieldsFromValue,
    addressFieldsOptionalSchema,
    addressFieldsSchema,
    type AddressFieldsValues,
} from '@/lib/request/schemas/address';

const FIELD_CLASS = 'h-11 rounded-sm bg-background text-sm';

const REVEAL_CONTENT_CLASS =
    'overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down motion-reduce:animate-none';

const REVEAL_INNER_CLASS =
    'mt-4 grid gap-4 animate-in fade-in fill-mode-both duration-[var(--motion-base)] motion-reduce:animate-none';

export type AddressFormFieldsValue = Pick<
    ShippingAddress,
    | 'line1'
    | 'line2'
    | 'city'
    | 'region'
    | 'country'
    | 'postalCode'
    | 'countryCode'
    | 'regionCode'
>;

type AddressFormFieldsProps = {
    value: AddressFormFieldsValue;
    onPatch: (patch: Partial<ShippingAddress>) => void;
    className?: string;
    /**
     * Ship-to: country first; remaining lines slide/fade open inside the same
     * card. Street/city/region/postal stay optional. Company address leaves this off.
     */
    revealAfterCountry?: boolean;
};

/**
 * Shopify-style address block (geography only): Country → Street → Apt →
 * City | Region | Postal. Props-only; parents own chrome. Validation via
 * `addressFieldsSchema` (or optional schema when `revealAfterCountry`) + Form kit.
 */
export function AddressFormFields({
    value,
    onPatch,
    className,
    revealAfterCountry = false,
}: AddressFormFieldsProps) {
    const form = useForm<AddressFieldsValues>({
        resolver: zodResolver(
            revealAfterCountry ? addressFieldsOptionalSchema : addressFieldsSchema,
        ),
        mode: 'onBlur',
        reValidateMode: 'onChange',
        values: addressFieldsFromValue(value),
    });

    const location = {
        country: value.country,
        countryCode: value.countryCode,
        region: value.region,
        regionCode: value.regionCode,
    };
    const showRegion = shouldShowRegionField(location);
    const countryReady = Boolean(value.country?.trim());

    const detailFields = (
        <>
            <FormField
                control={form.control}
                name="line1"
                render={({field}) => (
                    <FormItem>
                        <FormLabel className="text-xs font-medium">Address</FormLabel>
                        <AddressLine1Control
                            field={field}
                            countryCode={value.countryCode}
                            onPatch={onPatch}
                            setValue={form.setValue}
                        />
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="line2"
                render={({field}) => (
                    <FormItem>
                        <FormLabel className="text-xs font-medium">
                            Apartment, suite, etc.
                            <span className="ml-1 font-normal text-muted-foreground">
                                (optional)
                            </span>
                        </FormLabel>
                        <FormControl>
                            <Input
                                className={FIELD_CLASS}
                                placeholder="Apartment, suite, etc."
                                autoComplete="address-line2"
                                {...field}
                                value={field.value ?? ''}
                                onChange={(e) => {
                                    field.onChange(e);
                                    onPatch({line2: e.target.value});
                                }}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <div
                className={cn(
                    'grid gap-4',
                    showRegion ? 'sm:grid-cols-3' : 'sm:grid-cols-2',
                )}
            >
                <FormField
                    control={form.control}
                    name="city"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel className="text-xs font-medium">City</FormLabel>
                            <FormControl>
                                <Input
                                    className={FIELD_CLASS}
                                    placeholder="City"
                                    autoComplete="address-level2"
                                    {...field}
                                    onChange={(e) => {
                                        field.onChange(e);
                                        onPatch({city: e.target.value});
                                    }}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                {showRegion ? (
                    <FormField
                        control={form.control}
                        name="region"
                        render={() => (
                            <FormItem>
                                <LocationRegionField
                                    value={location}
                                    onPatch={(patch) => {
                                        if (patch.region !== undefined) {
                                            form.setValue('region', patch.region ?? '', {
                                                shouldValidate: true,
                                            });
                                        }
                                        onPatch(patch);
                                    }}
                                />
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                ) : null}
                <FormField
                    control={form.control}
                    name="postalCode"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel className="text-xs font-medium">
                                Postal code
                            </FormLabel>
                            <FormControl>
                                <Input
                                    className={FIELD_CLASS}
                                    placeholder="Postal code"
                                    autoComplete="postal-code"
                                    {...field}
                                    value={field.value ?? ''}
                                    onChange={(e) => {
                                        field.onChange(e);
                                        onPatch({postalCode: e.target.value});
                                    }}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </>
    );

    return (
        <Form {...form}>
            <div className={cn(!revealAfterCountry && 'grid gap-4', className)}>
                <FormField
                    control={form.control}
                    name="country"
                    render={() => (
                        <FormItem>
                            <LocationCountryField
                                value={location}
                                onPatch={(patch) => {
                                    if (patch.country !== undefined) {
                                        form.setValue('country', patch.country ?? '', {
                                            shouldValidate: true,
                                        });
                                    }
                                    if (patch.region !== undefined) {
                                        form.setValue('region', patch.region ?? '', {
                                            shouldValidate: true,
                                        });
                                    }
                                    onPatch(patch);
                                }}
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {revealAfterCountry ? (
                    <Collapsible open={countryReady}>
                        <CollapsibleContent className={REVEAL_CONTENT_CLASS}>
                            <div className={REVEAL_INNER_CLASS}>{detailFields}</div>
                        </CollapsibleContent>
                    </Collapsible>
                ) : (
                    detailFields
                )}
            </div>
        </Form>
    );
}

/** Autocomplete root is a div — wire Form a11y onto the inner input, not via Slot. */
function AddressLine1Control({
    field,
    countryCode,
    onPatch,
    setValue,
}: {
    field: ControllerRenderProps<AddressFieldsValues, 'line1'>;
    countryCode?: string;
    onPatch: (patch: Partial<ShippingAddress>) => void;
    setValue: ReturnType<typeof useForm<AddressFieldsValues>>['setValue'];
}) {
    const {formItemId, formDescriptionId, formMessageId, error} = useFormField();

    return (
        <AddressLineAutocomplete
            id={formItemId}
            aria-invalid={!!error}
            aria-describedby={
                !error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`
            }
            value={field.value}
            countryCode={countryCode}
            inputClassName={FIELD_CLASS}
            onBlur={field.onBlur}
            onLine1Change={(line1) => {
                field.onChange(line1);
                onPatch({line1});
            }}
            onAddressFill={(patch) => {
                if (patch.line1 !== undefined) {
                    setValue('line1', patch.line1 ?? '', {shouldValidate: true});
                }
                if (patch.city !== undefined) {
                    setValue('city', patch.city ?? '', {shouldValidate: true});
                }
                if (patch.region !== undefined) {
                    setValue('region', patch.region ?? '', {shouldValidate: true});
                }
                if (patch.postalCode !== undefined) {
                    setValue('postalCode', patch.postalCode ?? '', {shouldValidate: true});
                }
                if (patch.country !== undefined) {
                    setValue('country', patch.country ?? '', {shouldValidate: true});
                }
                onPatch(patch);
            }}
        />
    );
}
