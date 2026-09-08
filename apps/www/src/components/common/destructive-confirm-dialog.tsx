'use client';

import {TriangleAlert} from 'lucide-react';
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
import {buttonVariants} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';

type DestructiveConfirmDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    cancelLabel: string;
    confirmLabel: string;
    onConfirm: () => void;
};

/**
 * Centered destructive confirm — composes AlertDialog with warning icon.
 * Props-only; callers own copy and confirm side effects.
 */
export function DestructiveConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    cancelLabel,
    confirmLabel,
    onConfirm,
}: DestructiveConfirmDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="gap-6 sm:max-w-md">
                <AlertDialogHeader className="items-center text-center sm:text-center">
                    <TriangleAlert
                        className="size-10 text-destructive"
                        aria-hidden
                    />
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="sm:justify-center">
                    <AlertDialogCancel
                        className={cn(
                            buttonVariants({variant: 'secondary'}),
                            'mt-0 sm:flex-1',
                        )}
                    >
                        {cancelLabel}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        className={cn(
                            buttonVariants({variant: 'destructive'}),
                            'sm:flex-1',
                        )}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
