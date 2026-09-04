'use client';

import {UploadCloud} from 'lucide-react';
import type {RequestReferenceImage} from '@/lib/request/request.storage';

type FilesDropzoneProps = {
    linkLabel: string;
    dropTitle: string;
    images?: RequestReferenceImage[];
    /** Receives the FILES. See the note below for why that matters. */
    onPick: (files: File[]) => void;
    rejected?: string[];
};

/**
 * Label + always-visible dashed dropzone (POC CollapsibleFilesDropzone).
 *
 * 🔴 This used to do `Array.from(e.target.files).map((f) => f.name)` and keep the
 * NAMES, discarding the File objects. Nothing was ever uploaded: a buyer picked a
 * file on the express lane, saw it listed as "Attached", submitted, and the RFQ
 * carried no attachment — confirmed on RFQ-2026-00018, absent from both
 * `rfq_attachment` and the bucket.
 *
 * It also hid from a `createObjectURL` grep, which is how the express lane was
 * wrongly recorded as having no request-level picker when uploads were wired for
 * the line-level ones.
 */
export function FilesDropzone({
    linkLabel,
    dropTitle,
    images = [],
    onPick,
    rejected = [],
}: FilesDropzoneProps) {
    return (
        <div>
            <p className="text-xs font-medium text-foreground">{linkLabel}</p>
            <label className="mt-2 flex cursor-pointer flex-col items-center gap-1 rounded-md border border-dashed border-border px-4 py-6 text-center text-muted-foreground hover:bg-muted/30">
                <UploadCloud className="size-5" aria-hidden />
                <span className="text-sm font-medium text-foreground">
                    {dropTitle}
                </span>
                <span className="text-[11px]">
                    PNG · JPG · WEBP · GIF · PDF — up to 25MB each
                </span>
                <input
                    type="file"
                    multiple
                    accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,image/png,image/jpeg,image/webp,image/gif,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        e.target.value = '';
                        if (files.length) onPick(files);
                    }}
                />
            </label>
            {images.length > 0 ? (
                <ul className="mt-2 flex flex-col gap-0.5">
                    {images.map((image) => (
                        <li key={image.id} className="text-xs text-muted-foreground">
                            {image.name}
                            {image.status === 'uploading' ? ' — uploading…' : ''}
                            {image.status === 'error' ? (
                                <span className="text-destructive">
                                    {' '}
                                    — upload failed, it will not be attached
                                </span>
                            ) : null}
                        </li>
                    ))}
                </ul>
            ) : null}
            {rejected.length > 0 ? (
                <ul className="mt-1 flex flex-col gap-0.5">
                    {rejected.map((reason) => (
                        <li key={reason} className="text-xs text-destructive">
                            {reason}
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
}
