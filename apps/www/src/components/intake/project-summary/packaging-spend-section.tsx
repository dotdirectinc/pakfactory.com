'use client';

import {AnnualSpendField} from '@/components/request/annual-spend-field';
import {
    resolveAnnualSpendCurrency,
} from '@/lib/request/annual-spend';
import type {RequestDraft} from '@/lib/request/request.storage';

/** Project summary — Yearly packaging budget (optional). */
export function PackagingSpendSection({
    draft,
    onPatch,
    className,
}: {
    draft: RequestDraft;
    onPatch: (patch: Partial<RequestDraft>) => void;
    className?: string;
}) {
    const currency =
        resolveAnnualSpendCurrency(draft.annualSpend, draft.annualSpendCurrency) ?? 'USD';

    return (
        <AnnualSpendField
            className={className}
            value={draft.annualSpend}
            currency={currency}
            onChange={(annualSpend) => onPatch({annualSpend})}
            onCurrencyChange={(annualSpendCurrency) => onPatch({annualSpendCurrency})}
        />
    );
}
