'use client';

import type {ReactNode} from 'react';
import {Button} from '@pakfactory/ui/components/button';
import {PRODUCT_DETAIL_COPY} from '@/lib/copy/product-detail';

type AddToRequestButtonProps = {
    disabled: boolean;
    onClick: () => void;
    /** Optional control to the right of Add (e.g. bookmark). */
    trailing?: ReactNode;
};

export function AddToRequestButton({
    disabled,
    onClick,
    trailing,
}: AddToRequestButtonProps) {
    return (
        <div className="space-y-2">
            <div className="flex items-stretch gap-2">
                <Button
                    type="button"
                    className="h-auto min-w-0 flex-1 px-6 py-3 text-base"
                    disabled={disabled}
                    onClick={onClick}
                >
                    {PRODUCT_DETAIL_COPY.addToRequest}
                </Button>
                {trailing}
            </div>
            {!disabled ? (
                <p className="text-center text-xs text-muted-foreground">
                    {PRODUCT_DETAIL_COPY.addToRequestEnabledHelp}
                </p>
            ) : null}
        </div>
    );
}
