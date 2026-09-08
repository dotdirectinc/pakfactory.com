'use client';

import {Switch} from '@pakfactory/ui/components/switch';
import {cn} from '@pakfactory/ui/lib/utils';
import {Callout} from '@/components/common/callout';

type ServicesUpsellToggleProps = {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    title: string;
    description: string;
    className?: string;
};

/**
 * Controlled services upsell row for Brief Builder (and similar flows).
 * Props-only — callers own draft wiring and copy.
 */
export function ServicesUpsellToggle({
    checked,
    onCheckedChange,
    title,
    description,
    className,
}: ServicesUpsellToggleProps) {
    return (
        <Callout
            className={cn(
                'flex items-center justify-between gap-4 py-4',
                className,
            )}
        >
            <div className="min-w-0">
                <p className="text-sm font-semibold tracking-tight text-foreground">
                    {title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                    {description}
                </p>
            </div>
            <Switch
                checked={checked}
                onCheckedChange={onCheckedChange}
                aria-label={title}
                className="shrink-0 data-[state=checked]:bg-foreground"
            />
        </Callout>
    );
}
