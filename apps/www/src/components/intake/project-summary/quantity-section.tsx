'use client';

import {Label} from '@pakfactory/ui/components/label';
import {QuantityPicker} from '@/components/product/quantity-picker';
import {REQUEST_COPY} from '@/lib/copy/request';
import type {RequestDraft} from '@/lib/request/request.storage';

/** Project summary — How many units (general packaging need). */
export function QuantitySection({
    draft,
    onPatch,
}: {
    draft: RequestDraft;
    onPatch: (patch: Partial<RequestDraft>) => void;
}) {
    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
                <Label className="block text-base font-medium">{REQUEST_COPY.intakeQuantityLabel}</Label>
                <p className="text-sm text-muted-foreground">{REQUEST_COPY.intakeQuantityHint}</p>
            </div>
            <QuantityPicker
                volumes={draft.expressQuantities}
                onAdd={(volume) =>
                    onPatch({
                        expressQuantities: [...new Set([...draft.expressQuantities, volume])].sort(
                            (a, b) => a - b,
                        ),
                    })
                }
                onRemove={(volume) =>
                    onPatch({
                        expressQuantities: draft.expressQuantities.filter((n) => n !== volume),
                    })
                }
            />
        </div>
    );
}
