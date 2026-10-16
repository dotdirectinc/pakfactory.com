'use client';

import {Button} from '@pakfactory/ui/components/button';
import {PRODUCT_DETAIL_COPY} from '@/lib/copy/product-detail';

type AddToRequestButtonProps = {
    disabled: boolean;
    onClick: () => void;
};

export function AddToRequestButton({disabled, onClick}: AddToRequestButtonProps) {
    return (
        <div className="space-y-2">
            <Button
                type="button"
                className="h-auto w-full px-6 py-3 text-base"
                disabled={disabled}
                onClick={onClick}
            >
                {PRODUCT_DETAIL_COPY.addToRequest}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
                {disabled
                    ? PRODUCT_DETAIL_COPY.addToRequestDisabledHelp
                    : PRODUCT_DETAIL_COPY.addToRequestEnabledHelp}
            </p>
        </div>
    );
}
