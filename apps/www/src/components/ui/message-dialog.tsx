'use client';

import {Loader2} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@pakfactory/ui/components/dialog';
import {cn} from '@pakfactory/ui/lib/utils';

type MessageDialogProps = {
    open: boolean;
    title: string;
    description: string;
    actionLabel: string;
    onAction: () => void;
    /** Omit for a single-button acknowledgement. */
    secondaryLabel?: string;
    onSecondary?: () => void;
    /** Dismissal (Escape, overlay, close affordance). Defaults to onAction. */
    onDismiss?: () => void;
    pending?: boolean;
};

export function MessageDialog({
    open,
    title,
    description,
    actionLabel,
    onAction,
    secondaryLabel,
    onSecondary,
    onDismiss,
    pending = false,
}: MessageDialogProps) {
    const showSecondary = Boolean(secondaryLabel && onSecondary);

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (next) return;
                // Hold the dialog open while an action is in flight so its
                // buttons keep carrying the pending state.
                if (pending) return;
                (onDismiss ?? onAction)();
            }}
        >
            <DialogContent
                className="gap-6 sm:max-w-md"
                showCloseButton={false}
                onPointerDownOutside={(e) => e.preventDefault()}
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader className="items-center text-center sm:text-center">
                    <DialogTitle className="text-2xl font-semibold tracking-tight">
                        {title}
                    </DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <DialogFooter className="sm:justify-center">
                    {showSecondary ? (
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={pending}
                            onClick={onSecondary}
                            className="sm:flex-1"
                        >
                            {secondaryLabel}
                        </Button>
                    ) : null}
                    <Button
                        type="button"
                        disabled={pending}
                        onClick={onAction}
                        className={cn(showSecondary ? 'sm:flex-1' : 'sm:min-w-40')}
                    >
                        {pending ? (
                            <Loader2
                                className="size-4 animate-spin"
                                aria-hidden
                            />
                        ) : null}
                        {actionLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
