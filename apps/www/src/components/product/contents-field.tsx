'use client';

import {Input} from '@pakfactory/ui/components/input';
import {Label} from '@pakfactory/ui/components/label';
import {REQUEST_COPY} from '@/lib/copy/request';

type ContentsFieldProps = {
    id: string;
    value: string;
    onChange: (value: string) => void;
};

export function ContentsField({id, value, onChange}: ContentsFieldProps) {
    return (
        <div className="space-y-2">
            <Label htmlFor={id} className="text-base font-semibold text-brand-blue">
                {REQUEST_COPY.contentsLabel}
                <span className="text-destructive" aria-hidden>
                    {' '}
                    *
                </span>
            </Label>
            <p className="text-sm text-muted-foreground">{REQUEST_COPY.contentsHelp}</p>
            <Input
                id={id}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={REQUEST_COPY.contentsPlaceholder}
                aria-required="true"
            />
        </div>
    );
}
