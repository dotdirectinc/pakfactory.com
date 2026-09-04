'use client';

import {useEffect, useState} from 'react';
import {Button} from '@pakfactory/ui/components/button';
import {Label} from '@pakfactory/ui/components/label';
import {cn} from '@pakfactory/ui/lib/utils';
import {CUSTOMIZATION_BUILDER_COPY} from '@/components/customization-builder/copy';

type AdditionalNoteFieldProps = {
    id: string;
    value: string;
    onChange: (value: string) => void;
    /** Lowercase category label for the placeholder, e.g. "material". */
    categoryLabel: string;
    className?: string;
};

export function AdditionalNoteField({
    id,
    value,
    onChange,
    categoryLabel,
    className,
}: AdditionalNoteFieldProps) {
    const [expanded, setExpanded] = useState(() => Boolean(value.trim()));

    useEffect(() => {
        if (value.trim()) {
            setExpanded(true);
        }
    }, [value]);

    const placeholder =
        CUSTOMIZATION_BUILDER_COPY.additionalNotePlaceholder.replace(
            '{category}',
            categoryLabel.toLowerCase(),
        );

    if (!expanded) {
        return (
            <div className={cn(className)}>
                <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-sm font-normal text-muted-foreground"
                    onClick={() => setExpanded(true)}
                >
                    {CUSTOMIZATION_BUILDER_COPY.addAdditionalNote}
                </Button>
            </div>
        );
    }

    return (
        <div className={cn('flex flex-col gap-2', className)}>
            <Label htmlFor={id} className="text-sm font-semibold text-foreground">
                {CUSTOMIZATION_BUILDER_COPY.additionalNote}
            </Label>
            <textarea
                id={id}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                rows={3}
                className="min-h-[72px] w-full resize-y rounded-md border border-border bg-muted/50 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
        </div>
    );
}
