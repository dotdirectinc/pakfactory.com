'use client';

import {Loader2, X} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@pakfactory/ui/components/dialog';

type LeaveDialogProps = {
    open: boolean;
    title: string;
    description: string;
    onCancel: () => void;
    discardLabel: string;
    onDiscard: () => void;
    /** Omit both to render a discard-only footer for flows with nothing to save. */
    saveLabel?: string;
    onSave?: () => void;
    pending?: boolean;
};

export function LeaveDialog({
    open,
    title,
    description,
    onCancel,
    discardLabel,
    onDiscard,
    saveLabel,
    onSave,
    pending = false,
}: LeaveDialogProps) {
    const showSave = Boolean(saveLabel && onSave);

    function dismiss() {
        if (pending) return;
        onCancel();
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (next) return;
                // Escape / backdrop must never discard. Hold open while leave is in flight.
                dismiss();
            }}
        >
            <DialogContent
                className="gap-6 sm:max-w-md"
                showCloseButton={false}
                onPointerDownOutside={(e) => {
                    if (pending) e.preventDefault();
                }}
                onInteractOutside={(e) => {
                    if (pending) e.preventDefault();
                }}
                onEscapeKeyDown={(e) => {
                    if (pending) e.preventDefault();
                }}
            >
                <button
                    type="button"
                    disabled={pending}
                    onClick={dismiss}
                    className="absolute top-4 right-4 cursor-pointer rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
                >
                    <X className="size-4" aria-hidden />
                    <span className="sr-only">Close</span>
                </button>
                <DialogHeader className="items-center text-center sm:text-center">
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <DialogFooter className="sm:justify-center">
                    <Button
                        type="button"
                        variant="secondary"
                        disabled={pending}
                        className="mt-0 sm:flex-1"
                        onClick={() => {
                            if (pending) return;
                            onDiscard();
                        }}
                    >
                        {pending ? (
                            <Loader2
                                className="size-4 animate-spin"
                                aria-hidden
                            />
                        ) : null}
                        {discardLabel}
                    </Button>
                    {showSave ? (
                        <Button
                            type="button"
                            disabled={pending}
                            className="sm:flex-1"
                            onClick={() => {
                                if (pending) return;
                                onSave?.();
                            }}
                        >
                            {pending ? (
                                <Loader2
                                    className="size-4 animate-spin"
                                    aria-hidden
                                />
                            ) : null}
                            {saveLabel}
                        </Button>
                    ) : null}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
