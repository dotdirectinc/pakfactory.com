'use client';

import {Loader2} from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@pakfactory/ui/components/alert-dialog';
import {Button, buttonVariants} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';

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
        <AlertDialog
            open={open}
            onOpenChange={(next) => {
                if (next) return;
                // Escape and overlay must never discard. Hold the dialog open
                // while a leave is in flight so buttons keep pending state.
                if (pending) return;
                onCancel();
            }}
        >
            <AlertDialogContent className="gap-6 sm:max-w-md">
                <AlertDialogHeader className="items-center text-center sm:text-center">
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex flex-col gap-4">
                    <AlertDialogFooter className="sm:justify-center">
                        <AlertDialogCancel
                            disabled={pending}
                            className={cn(
                                buttonVariants({variant: 'secondary'}),
                                'mt-0 sm:flex-1',
                            )}
                            onClick={(e) => {
                                if (pending) {
                                    e.preventDefault();
                                    return;
                                }
                                onCancel();
                            }}
                        >
                            {cancelLabel}
                        </AlertDialogCancel>
                        {showSave ? (
                            <AlertDialogAction
                                disabled={pending}
                                className={cn(buttonVariants(), 'sm:flex-1')}
                                onClick={(e) => {
                                    // Keep open while navigation runs (pending).
                                    e.preventDefault();
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
                            </AlertDialogAction>
                        ) : null}
                    </AlertDialogFooter>
                    <Button
                        type="button"
                        variant="link"
                        disabled={pending}
                        onClick={onDiscard}
                        className="mx-auto text-destructive hover:text-destructive focus-visible:ring-destructive/20"
                    >
                        {pending ? (
                            <Loader2
                                className="size-4 animate-spin"
                                aria-hidden
                            />
                        ) : null}
                        {discardLabel}
                    </Button>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
}
