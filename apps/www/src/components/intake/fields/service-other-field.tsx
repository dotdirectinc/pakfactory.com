'use client';

import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from '@pakfactory/ui/components/form';
import {Input} from '@pakfactory/ui/components/input';
import {REQUEST_COPY} from '@/lib/copy/request';
import {
    serviceOtherSchema,
    type ServiceOtherValues,
} from '@/lib/request/schemas/details';

export function ServiceOtherField({
    value,
    onChange,
}: {
    value: string;
    onChange: (serviceOther: string) => void;
}) {
    const form = useForm<ServiceOtherValues>({
        resolver: zodResolver(serviceOtherSchema),
        mode: 'onBlur',
        reValidateMode: 'onChange',
        values: {serviceOther: value},
    });

    return (
        <Form {...form}>
            <FormField
                control={form.control}
                name="serviceOther"
                render={({field}) => (
                    <FormItem className="mt-2 gap-1">
                        <FormControl>
                            <Input
                                aria-label={REQUEST_COPY.serviceOtherLabel}
                                className="h-11 rounded-sm bg-background text-sm"
                                placeholder={REQUEST_COPY.serviceOtherPlaceholder}
                                {...field}
                                onChange={(e) => {
                                    field.onChange(e);
                                    onChange(e.target.value);
                                }}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </Form>
    );
}
