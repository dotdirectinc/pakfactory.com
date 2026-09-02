'use client';

import {Button} from '@pakfactory/ui/components/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@pakfactory/ui/components/dialog';
import {REQUEST_COPY} from '@/lib/copy/request';

type ExpressPoolDialogProps = {
    open: boolean;
    count: number;
    onInclude: () => void;
    onRequirementsOnly: () => void;
};

export function ExpressPoolDialog({
    open,
    count,
    onInclude,
    onRequirementsOnly,
}: ExpressPoolDialogProps) {
    const body =
        count === 1
            ? REQUEST_COPY.expressPoolBodyOne
            : REQUEST_COPY.expressPoolBodyMany.replace('{n}', String(count));
    const includeLabel =
        count === 1
            ? REQUEST_COPY.expressPoolIncludeOne
            : REQUEST_COPY.expressPoolIncludeMany.replace('{n}', String(count));

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next) onRequirementsOnly();
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{REQUEST_COPY.expressPoolTitle}</DialogTitle>
                    <DialogDescription>{body}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onRequirementsOnly}>
                        {REQUEST_COPY.expressPoolRequirementsOnly}
                    </Button>
                    <Button type="button" onClick={onInclude}>
                        {includeLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
