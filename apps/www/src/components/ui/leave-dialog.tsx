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

type LeaveDialogProps = {
    open: boolean;
    title: string;
    description: string;
    cancelLabel: string;
    onCancel: () => void;
    discardLabel: string;
    onDiscard: () => void;
    /** Omit both to render a two-button dialog for flows with nothing to save. */
    saveLabel?: string;
    onSave?: () => void;
    pending?: boolean;
};

export function LeaveDialog({
    open,
    title,
    description,
    cancelLabel,
    onCancel,
    discardLabel,
    onDiscard,
    saveLabel,
    onSave,
    pending = false,
}: LeaveDialogProps) {
    const showSave = Boolean(saveLabel && onSave);

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (next) return;
                // Escape, overlay click and the close affordance must never
                // discard. Hold the dialog open while a leave is in flight so
                // its buttons keep carrying the pending state.
                if (pending) return;
                onCancel();
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                {/* Keeping the destructive action out of the primary's cluster
                    costs a wrapper, but stops a stray click from discarding. */}
                <DialogFooter className="sm:justify-between">
                    <Button
                        type="button"
                        variant="link"
                        disabled={pending}
                        onClick={onDiscard}
                        // The negative margins cancel the button's padding to
                        // align the label with the header text, and must track
                        // the primitive's has-[>svg] step or the label shifts
                        // when the spinner mounts.
                        className="-ml-4 text-destructive hover:text-destructive focus-visible:ring-destructive/20 has-[>svg]:-ml-3"
                    >
                        {pending ? (
                            <Loader2 className="size-4 animate-spin" aria-hidden />
                        ) : null}
                        {discardLabel}
                    </Button>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row">
                        <Button
                            type="button"
                            variant="link"
                            disabled={pending}
                            onClick={onCancel}
                            className="text-foreground hover:text-foreground"
                        >
                            {cancelLabel}
                        </Button>
                        {showSave ? (
                            <Button
                                type="button"
                                disabled={pending}
                                onClick={onSave}
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
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
