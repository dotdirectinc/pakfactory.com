'use client';

import type {ReactNode} from 'react';
import {Button} from '@pakfactory/ui/components/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@pakfactory/ui/components/dialog';
import {ACCOUNT_COPY} from '@/lib/copy/account';

type ProfileFormDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    children: ReactNode;
    /** Return `false` to keep the dialog open (e.g. validation failed). */
    onSave: () => boolean | void | Promise<boolean | void>;
};

export function ProfileFormDialog({
    open,
    onOpenChange,
    title,
    children,
    onSave,
}: ProfileFormDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-2">{children}</div>
                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        {ACCOUNT_COPY.cancel}
                    </Button>
                    <Button
                        type="button"
                        onClick={() => {
                            void (async () => {
                                const ok = await onSave();
                                if (ok === false) return;
                                onOpenChange(false);
                            })();
                        }}
                    >
                        {ACCOUNT_COPY.save}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
