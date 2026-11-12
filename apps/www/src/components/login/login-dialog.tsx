'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@pakfactory/ui/components/dialog';
import {LoginForm} from '@/components/login/login-form';
import {LOGIN_COPY} from '@/lib/copy/login';

type LoginDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Return path after sign-in / Google OAuth (same as full-page login `?next=`). */
    next?: string;
};

export function LoginDialog({open, onOpenChange, next}: LoginDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="text-center sm:text-center">
                    <DialogTitle>{LOGIN_COPY.title}</DialogTitle>
                    <DialogDescription>{LOGIN_COPY.subtitle}</DialogDescription>
                </DialogHeader>
                <div className="flex justify-center py-2">
                    <LoginForm embedded next={next} />
                </div>
            </DialogContent>
        </Dialog>
    );
}
