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
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    {showSecondary ? (
                        <Button
                            type="button"
                            variant="link"
                            disabled={pending}
                            onClick={onSecondary}
                            className="text-foreground hover:text-foreground"
                        >
                            {secondaryLabel}
                        </Button>
                    ) : null}
                    <Button type="button" disabled={pending} onClick={onAction}>
                        {pending ? (
                            <Loader2 className="size-4 animate-spin" aria-hidden />
                        ) : null}
                        {actionLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
