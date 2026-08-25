import type {ReactNode} from 'react';
import {Button} from '@pakfactory/ui/components/button';

type ProfileSectionProps = {
    title: string;
    actionLabel?: string;
    onAction?: () => void;
    children: ReactNode;
};

export function ProfileSection({
    title,
    actionLabel,
    onAction,
    children,
}: ProfileSectionProps) {
    return (
        <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
                <h2 className="text-base font-semibold tracking-tight">
                    {title}
                </h2>
                {actionLabel && onAction ? (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={onAction}
                    >
                        {actionLabel}
                    </Button>
                ) : null}
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
                {children}
            </div>
        </section>
    );
}
