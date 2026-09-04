'use client';

import {useRef, useState} from 'react';
import type {Dispatch, SetStateAction} from 'react';
import {ImagePlus, X} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {Input} from '@pakfactory/ui/components/input';
import {Label} from '@pakfactory/ui/components/label';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@pakfactory/ui/components/tabs';
import {REQUEST_COPY} from '@/lib/copy/request';
import {
    fileRejectionReason,
    useAttachmentUpload,
} from '@/lib/rfq/use-attachment-upload';
import type {RequestReferenceImage} from '@/lib/request/request.storage';

export const MAX_REF_IMAGES = 5;

const TEXTAREA_CLASS =
    'min-h-[8.5rem] w-full min-w-0 rounded-sm border border-input bg-background px-3 py-2 text-base outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm';

type DetailsOptInTab = 'no' | 'yes';

type ContentsFieldProps = {
    id: string;
    value: string;
    onChange: (value: string) => void;
    detailsOptIn: boolean;
    onDetailsOptInChange: (value: boolean) => void;
    notes: string;
    onNotesChange: (value: string) => void;
    referenceImages: RequestReferenceImage[];
    /** A React setter, not an array callback. Uploads finish out of order, so the
     *  hook writes with `prev => …`; taking an array here would let two concurrent
     *  uploads overwrite each other with stale snapshots. */
    onReferenceImagesChange: Dispatch<SetStateAction<RequestReferenceImage[]>>;
    /** Scopes the S3 key to this submission. `persistAttachments` refuses a key
     *  that is not under the submission's own `pending/<draftId>/` prefix. */
    draftId: string;
};

export function ContentsField({
    id,
    value,
    onChange,
    detailsOptIn,
    onDetailsOptInChange,
    notes,
    onNotesChange,
    referenceImages,
    onReferenceImagesChange,
    draftId,
}: ContentsFieldProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [rejected, setRejected] = useState<string[]>([]);
    const upload = useAttachmentUpload(draftId, onReferenceImagesChange);
    const room = MAX_REF_IMAGES - referenceImages.length;

    function onPickFiles(event: React.ChangeEvent<HTMLInputElement>) {
        const picked = Array.from(event.target.files ?? []);
        event.target.value = '';
        if (!picked.length || room <= 0) return;

        // Filtered before anything is shown. The signed S3 policy enforces type
        // and size anyway, but a rejection there arrives as an opaque 403 after
        // the bytes have gone up — telling the buyer here is both faster and the
        // only place we can say WHICH file and why.
        const reasons: string[] = [];
        const accepted = picked.slice(0, room).filter((file) => {
            const reason = fileRejectionReason(file);
            if (reason) reasons.push(reason);
            return !reason;
        });
        setRejected(reasons);
        if (accepted.length) void upload(accepted);
    }

    function removeImage(imageId: string) {
        const doomed = referenceImages.find((image) => image.id === imageId);
        if (doomed?.url.startsWith('blob:')) {
            URL.revokeObjectURL(doomed.url);
        }
        // The S3 object is deliberately NOT deleted. It sits under `pending/`,
        // which the bucket's lifecycle rule expires after 30 days, and it is only
        // ever promoted to `rfq/` if its key reaches submit — which it now cannot.
        // Deleting from the browser would need a second write permit, and minting
        // one to delete is a larger hole than letting the sweep handle it.
        onReferenceImagesChange((prev) =>
            prev.filter((image) => image.id !== imageId),
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <Label
                htmlFor={id}
                className="flex flex-col items-start gap-1 font-semibold text-brand-blue"
            >
                <span className="text-base">
                    {REQUEST_COPY.contentsLabel}
                    <span className="text-destructive" aria-hidden>
                        {' '}
                        *
                    </span>
                </span>
                <span className="text-sm font-normal leading-snug text-muted-foreground">
                    {REQUEST_COPY.contentsHelp}
                </span>
            </Label>
            <Input
                id={id}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={REQUEST_COPY.contentsPlaceholder}
                aria-required="true"
                className="h-11 rounded-sm bg-background shadow-none"
            />

            <Tabs
                value={detailsOptIn ? 'yes' : 'no'}
                onValueChange={(next) =>
                    onDetailsOptInChange((next as DetailsOptInTab) === 'yes')
                }
                className="gap-0"
            >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <p className="text-sm font-medium leading-snug text-foreground">
                        {REQUEST_COPY.additionalNotesOrImages}
                    </p>
                    <TabsList
                        className="w-fit shrink-0 bg-input"
                        aria-label={REQUEST_COPY.additionalNotesOrImages}
                    >
                        <TabsTrigger value="no">{REQUEST_COPY.no}</TabsTrigger>
                        <TabsTrigger value="yes">{REQUEST_COPY.yes}</TabsTrigger>
                    </TabsList>
                </div>
                <TabsContent value="yes" className="mt-4 flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <Label
                            htmlFor={`${id}-notes`}
                            className="text-xs font-medium"
                        >
                            {REQUEST_COPY.additionalNotesLabel}
                        </Label>
                        <textarea
                            id={`${id}-notes`}
                            rows={6}
                            className={TEXTAREA_CLASS}
                            placeholder={REQUEST_COPY.additionalNotesPlaceholder}
                            value={notes}
                            onChange={(event) => onNotesChange(event.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <Label className="text-xs font-medium">
                            {REQUEST_COPY.addImagesLabel}
                            <span className="ml-1 font-normal text-muted-foreground">
                                {REQUEST_COPY.optional}
                            </span>
                        </Label>
                        <div className="flex flex-wrap items-center gap-2">
                            {referenceImages.map((image) => (
                                <div
                                    key={image.id}
                                    className="relative size-11 overflow-hidden rounded-md border border-border bg-muted"
                                >
                                    {/* Local object URL — the preview only. What
                                        the backend receives is `image.key`. */}
                                    <img
                                        src={image.url}
                                        alt=""
                                        className={`size-full object-cover ${
                                            image.status === 'uploaded'
                                                ? ''
                                                : 'opacity-40'
                                        }`}
                                    />
                                    {image.status === 'uploading' ? (
                                        <span
                                            className="absolute inset-0 grid place-items-center text-[10px] font-medium text-foreground"
                                            role="status"
                                        >
                                            {REQUEST_COPY.imageUploading}
                                        </span>
                                    ) : null}
                                    {image.status === 'error' ? (
                                        <span className="absolute inset-0 grid place-items-center bg-destructive/10 text-[10px] font-medium text-destructive">
                                            {REQUEST_COPY.imageFailed}
                                        </span>
                                    ) : null}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-xs"
                                        aria-label={`Remove ${image.name}`}
                                        className="absolute top-0 right-0 size-5 rounded-none bg-background/80"
                                        onClick={() => removeImage(image.id)}
                                    >
                                        <X className="size-3" />
                                    </Button>
                                </div>
                            ))}
                            {room > 0 ? (
                                <>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,image/png,image/jpeg,image/webp,image/gif,application/pdf"
                                        multiple
                                        className="sr-only"
                                        onChange={onPickFiles}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon-sm"
                                        aria-label={REQUEST_COPY.addImagesLabel}
                                        className="size-11"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <ImagePlus className="size-4" />
                                    </Button>
                                </>
                            ) : null}
                        </div>
                        {rejected.length ? (
                            <ul className="mt-1 flex flex-col gap-0.5">
                                {rejected.map((reason) => (
                                    <li
                                        key={reason}
                                        className="text-xs text-destructive"
                                    >
                                        {reason}
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
