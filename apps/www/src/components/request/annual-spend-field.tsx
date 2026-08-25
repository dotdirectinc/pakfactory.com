'use client';

import {Button} from '@pakfactory/ui/components/button';
import {Input} from '@pakfactory/ui/components/input';
import {Label} from '@pakfactory/ui/components/label';
import {cn} from '@pakfactory/ui/lib/utils';
import {REQUEST_COPY} from '@/lib/copy/request';
import {
    digitsOnlySpend,
    formatSpendInput,
    formatSpendLabel,
} from '@/lib/request/annual-spend';

const FIELD_CLASS = 'h-11 rounded-sm border border-input bg-background text-sm';

type AnnualSpendFieldProps = {
    value?: string;
    previousAmount?: string;
    onChange: (value: string) => void;
    onCommit?: (digits: string) => void;
    className?: string;
};

export function AnnualSpendField({
    value = '',
    previousAmount = '',
    onChange,
    onCommit,
    className,
}: AnnualSpendFieldProps) {
    const currentDigits = digitsOnlySpend(value);
    const prevDigits = digitsOnlySpend(previousAmount);
    const showPrevious = Boolean(prevDigits) && prevDigits !== currentDigits;
    const prevLabel = formatSpendLabel(prevDigits);

    return (
        <div className={className}>
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <Label className="text-xs font-medium">
                    {REQUEST_COPY.annualSpendLabel}
                </Label>
                {showPrevious ? (
                    <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto px-0 text-xs font-medium underline underline-offset-4"
                        onClick={() => {
                            const next = formatSpendInput(prevDigits);
                            onChange(next);
                            onCommit?.(prevDigits);
                        }}
                    >
                        Use previous amount · {prevLabel}
                    </Button>
                ) : null}
            </div>
            <div className="relative">
                <span
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                    aria-hidden
                >
                    $
                </span>
                <Input
                    inputMode="numeric"
                    className={cn(FIELD_CLASS, 'pl-7 pr-14')}
                    placeholder="50,000"
                    value={value}
                    onChange={(e) =>
                        onChange(
                            formatSpendInput(e.target.value) ||
                                e.target.value.replace(/[^0-9,]/g, ''),
                        )
                    }
                    onBlur={() => {
                        const digits = digitsOnlySpend(value);
                        if (digits) onCommit?.(digits);
                    }}
                />
                <span
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                    aria-hidden
                >
                    USD
                </span>
            </div>
        </div>
    );
}
