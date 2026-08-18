'use client';

import {Button} from '@pakfactory/ui/components/button';
import {REQUEST_COPY} from '@/lib/copy/request';

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
                {REQUEST_COPY.addToRequest}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
                {disabled
                    ? 'Add a quantity and say what you’re putting in the packaging.'
                    : 'Adds to your request — keep browsing and create your request later.'}
            </p>
        </div>
    );
}
