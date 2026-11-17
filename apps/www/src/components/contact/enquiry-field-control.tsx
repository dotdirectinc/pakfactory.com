'use client';

import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@pakfactory/ui/components/form';
import {Input} from '@pakfactory/ui/components/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@pakfactory/ui/components/select';
import {Textarea} from '@pakfactory/ui/components/textarea';
import {CONTACT_FALLBACK} from '@/lib/contact/copy';
import type {ScreenAnswers} from '@/lib/contact/enquiry-schema';
import type {ContactEnquiryFieldView} from '@/lib/contact/map-channels';
import type {Control} from 'react-hook-form';

type EnquiryFieldControlProps = {
    field: ContactEnquiryFieldView;
    control: Control<ScreenAnswers>;
    /** When the screen heading already shows this label as description. */
    hideLabel?: boolean;
};

/** One Studio-defined enquiry field wired to react-hook-form. */
export function EnquiryFieldControl({
    field,
    control,
    hideLabel = false,
}: EnquiryFieldControlProps) {
    return (
        <FormField
            control={control}
            name={field.key}
            render={({field: rhf}) => (
                <FormItem className="flex flex-col gap-2">
                    <FormLabel
                        className={
                            hideLabel
                                ? 'sr-only'
                                : 'text-xs font-medium'
                        }
                    >
                        {field.label}
                        {!hideLabel && !field.required ? (
                            <span className="font-normal text-muted-foreground">
                                {' '}
                                {CONTACT_FALLBACK.optional}
                            </span>
                        ) : null}
                    </FormLabel>
                    <FormControl>
                        {field.kind === 'choice' ? (
                            <Select
                                value={rhf.value || undefined}
                                onValueChange={rhf.onChange}
                            >
                                <SelectTrigger
                                    id={`enquiry-${field.key}`}
                                    className="h-11 w-full rounded-sm bg-background text-sm"
                                >
                                    <SelectValue
                                        placeholder={
                                            CONTACT_FALLBACK.choosePlaceholder
                                        }
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {(field.options ?? []).map((option) => (
                                        <SelectItem
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : field.kind === 'textarea' ? (
                            <Textarea
                                {...rhf}
                                rows={6}
                                className="min-h-40"
                                placeholder={field.placeholder}
                            />
                        ) : (
                            <Input
                                {...rhf}
                                type={field.kind}
                                className="h-11 rounded-sm bg-background text-sm"
                                placeholder={field.placeholder}
                                autoComplete={
                                    field.kind === 'email'
                                        ? 'email'
                                        : field.kind === 'tel'
                                          ? 'tel'
                                          : undefined
                                }
                            />
                        )}
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}
