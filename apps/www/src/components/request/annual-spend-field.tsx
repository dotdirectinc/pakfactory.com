'use client';

import {Button} from '@pakfactory/ui/components/button';
import {Input} from '@pakfactory/ui/components/input';
import {Label} from '@pakfactory/ui/components/label';
import {ToggleGroup, ToggleGroupItem} from '@pakfactory/ui/components/toggle-group';
import {cn} from '@pakfactory/ui/lib/utils';
import {REQUEST_COPY} from '@/lib/copy/request';
import {
    type AnnualSpendCurrency,
    digitsOnlySpend,
    formatSpendInput,
    formatSpendLabel,
} from '@/lib/request/annual-spend';

const FIELD_CLASS = 'h-11 rounded-sm bg-background text-sm';

type AnnualSpendFieldProps = {
    value?: string;
    currency?: AnnualSpendCurrency;
    previousAmount?: string;
    onChange: (value: string) => void;
    onCurrencyChange: (currency: AnnualSpendCurrency) => void;
    onCommit?: (digits: string) => void;
    className?: string;
};

export function AnnualSpendField({
    value = '',
    currency = 'USD',
    previousAmount = '',
    onChange,
    onCurrencyChange,
    onCommit,
    className,
}: AnnualSpendFieldProps) {
    const currentDigits = digitsOnlySpend(value);
    const prevDigits = digitsOnlySpend(previousAmount);
    const showPrevious = Boolean(prevDigits) && prevDigits !== currentDigits;
    const prevLabel = formatSpendLabel(prevDigits, currency);

    return (
        <div className={className}>
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <Label className="text-xs font-medium">{REQUEST_COPY.annualSpendLabel}</Label>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
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
                    <ToggleGroup
                        type="single"
                        value={currency}
                        onValueChange={(v) => {
                            if (v === 'USD' || v === 'CAD') onCurrencyChange(v);
                        }}
                        aria-label={REQUEST_COPY.annualSpendCurrencyLabel}
                        size="sm"
                        className="rounded-lg bg-muted p-1"
                    >
                        <ToggleGroupItem
                            value="USD"
                            className="rounded-md px-2.5 text-xs data-[spacing=0]:rounded-md data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
                        >
                            {REQUEST_COPY.annualSpendCurrencyUsd}
                        </ToggleGroupItem>
                        <ToggleGroupItem
                            value="CAD"
                            className="rounded-md px-2.5 text-xs data-[spacing=0]:rounded-md data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
                        >
                            {REQUEST_COPY.annualSpendCurrencyCad}
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>
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
                    className={cn(FIELD_CLASS, 'pl-7')}
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
            </div>
        </div>
    );
}
