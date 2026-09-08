'use client';

import {cn} from '@pakfactory/ui/lib/utils';
import {CUSTOMIZATION_BUILDER_COPY} from '@/components/customization-builder/copy';

type NotSureToggleProps = {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    helperText?: string;
    className?: string;
};

export function NotSureToggle({
    checked,
    onCheckedChange,
    helperText = CUSTOMIZATION_BUILDER_COPY.notSureHelper,
    className,
}: NotSureToggleProps) {
    return (
        <div className={cn('flex flex-col gap-2', className)}>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onCheckedChange(!checked)}
                className={cn(
                    'inline-flex w-fit cursor-pointer items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                    checked
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border bg-background text-foreground hover:bg-muted',
                )}
            >
                {CUSTOMIZATION_BUILDER_COPY.skipNotSure}
            </button>
            {checked && helperText ? (
                <p className="text-xs text-muted-foreground">{helperText}</p>
            ) : null}
        </div>
    );
}
