'use client';

import {useState} from 'react';
import {FileText, Plus, X} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@pakfactory/ui/components/dialog';
import {Label} from '@pakfactory/ui/components/label';
import {Textarea} from '@pakfactory/ui/components/textarea';
import {cn} from '@pakfactory/ui/lib/utils';
import {FilesDropzone} from '@/components/request/files-dropzone';
import {REQUEST_COPY} from '@/lib/copy/request';
import type {RequestFlow} from '@/lib/intake/routes';
import type {RequestReferenceImage} from '@/lib/request/request.storage';

const ACCEPT = '.png,.jpg,.jpeg,.webp,.gif,.pdf,image/png,image/jpeg,image/webp,image/gif,application/pdf';

type BriefOrFilesProps = {
    notes: string;
    onNotes: (notes: string) => void;
    images: RequestReferenceImage[];
    rejected: string[];
    onPick: (files: File[]) => void;
    /** Remove a file from the draft list (RFQ v2 columns list cards). */
    onRemove?: (id: string) => void;
    /** Picks the example text and the "Good to include" hint (v2). */
    flow?: RequestFlow;
    /**
     * RFQ v2: description and Add files on one row (description wider left, files right).
     * Hides "Have a brief? Upload it" — the tile is the upload. Default stacked Describe-first.
     */
    columns?: boolean;
};

/**
 * Project details on the step intakes: a description or uploaded files, either is enough.
 * Internally the text is the lead's Project Brief and the uploads are its Brief files.
 * Describe first (owner Nov 2): the description leads, with an example and a static
 *   "Good to include" hint fitted to the request type; "Have a doc or PDF? Upload it" opens an
 *   upload dialog; files show as a row with a muted "Add a brief, dieline or photo" tile;
 *   files can also be dropped onto the text box.
 */
export function BriefOrFiles(props: BriefOrFilesProps) {
    return <DescribeFirst {...props} />;
}

function DescribeFirst({notes, onNotes, images, rejected, onPick, onRemove, flow = 'general', columns = false}: BriefOrFilesProps) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dragging, setDragging] = useState(false);
    const copy = REQUEST_COPY.intakeDescribeByFlow[flow];
    const fileInput = (
        <input
            type="file"
            multiple
            accept={ACCEPT}
            className="sr-only"
            onChange={(e) => {
                const picked = Array.from(e.target.files ?? []);
                e.target.value = '';
                if (picked.length) onPick(picked);
            }}
        />
    );
    // RFQ v2 columns: one dashed panel — list cards inside when files exist; empty = Add files.
    const files = columns ? (
        <div
            className={cn(
                'flex h-full min-h-48 flex-col gap-3 rounded-md border border-dashed border-border bg-background p-3 lg:col-span-1 has-[:focus-within]:border-foreground',
                dragging && 'border-foreground bg-muted/40',
            )}
            onDragOver={(e) => {
                if (!e.dataTransfer.types.includes('Files')) return;
                e.preventDefault();
                setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
                const dropped = Array.from(e.dataTransfer.files ?? []);
                setDragging(false);
                if (!dropped.length) return;
                e.preventDefault();
                onPick(dropped);
            }}
        >
            {images.length > 0 ? (
                <ul className="flex flex-col gap-2">
                    {images.map((image) => (
                        <li key={image.id}>
                            <FileListCard image={image} onRemove={onRemove} />
                        </li>
                    ))}
                </ul>
            ) : null}
            <label
                className={cn(
                    'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-sm text-center text-xs leading-tight text-muted-foreground hover:text-foreground focus-within:outline-none',
                    images.length ? 'min-h-10 flex-row gap-2 py-2' : 'flex-1 min-h-28',
                )}
            >
                <Plus className="size-4 shrink-0" aria-hidden />
                {images.length ? (
                    <span className="font-medium text-foreground">{REQUEST_COPY.intakeAddMoreFiles}</span>
                ) : (
                    <>
                        <span className="font-medium text-foreground">{REQUEST_COPY.intakeAddFileTile}</span>
                        <span className="text-[11px]">{REQUEST_COPY.intakeAddFileHint}</span>
                    </>
                )}
                {fileInput}
            </label>
        </div>
    ) : (
        <div className="flex flex-wrap items-center gap-2">
            {images.map((image) => (
                <FileThumb key={image.id} image={image} />
            ))}
            <label
                className={cn(
                    'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-muted px-3 text-center text-xs leading-tight text-muted-foreground hover:text-foreground focus-within:ring-2 focus-within:ring-ring',
                    images.length ? 'size-24' : 'h-28 w-44',
                )}
            >
                <Plus className="size-4" aria-hidden />
                {images.length ? (
                    REQUEST_COPY.intakeAddMoreFiles
                ) : (
                    <>
                        <span className="font-medium text-foreground">{REQUEST_COPY.intakeAddFileTile}</span>
                        <span className="text-[11px]">{REQUEST_COPY.intakeAddFileHint}</span>
                    </>
                )}
                {fileInput}
            </label>
        </div>
    );
    const describe = (
        <div className={cn('flex flex-col gap-2', columns && 'h-full lg:col-span-2')}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <Label htmlFor="intake-brief" className="text-base font-medium">
                    {'label' in copy ? copy.label : REQUEST_COPY.intakeDescribeLabel}
                </Label>
                {/* columns (RFQ v2): the Add files tile is the upload — no duplicate link. */}
                {columns ? null : (
                    <button
                        type="button"
                        onClick={() => setDialogOpen(true)}
                        className="text-sm font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground"
                    >
                        {REQUEST_COPY.intakeUploadDocLink}
                    </button>
                )}
            </div>
            <Textarea
                id="intake-brief"
                className={cn(
                    'rounded-sm bg-background text-sm',
                    // RFQ v2 columns: taller field, stretches with the files panel.
                    columns ? 'min-h-48 flex-1' : 'min-h-36',
                    dragging && 'border-foreground bg-muted/40',
                )}
                placeholder={copy.placeholder}
                value={notes}
                onChange={(e) => onNotes(e.target.value)}
                // Files dropped on the box are added like any upload.
                onDragOver={(e) => {
                    if (!e.dataTransfer.types.includes('Files')) return;
                    e.preventDefault();
                    setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                    const dropped = Array.from(e.dataTransfer.files ?? []);
                    setDragging(false);
                    if (!dropped.length) return;
                    e.preventDefault();
                    onPick(dropped);
                }}
            />
        </div>
    );
    return (
        <div className="flex flex-col gap-4">
            <div className={cn(columns ? 'grid grid-cols-1 items-stretch gap-8 lg:grid-cols-3' : 'flex flex-col gap-4')}>
                {/* Columns: description wider (2 cols) on the left, files (1 col) on the right. */}
                {describe}
                {files}
            </div>
            {rejected.length > 0 ? (
                <ul className="flex flex-col gap-0.5">
                    {rejected.map((reason) => (
                        <li key={reason} className="text-xs text-destructive">
                            {reason}
                        </li>
                    ))}
                </ul>
            ) : null}
            {columns ? null : (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{REQUEST_COPY.intakeUploadDialogTitle}</DialogTitle>
                            <DialogDescription>{REQUEST_COPY.intakeUploadDialogHelp}</DialogDescription>
                        </DialogHeader>
                        <FilesDropzone
                            linkLabel={REQUEST_COPY.intakeUploadDialogLabel}
                            dropTitle={REQUEST_COPY.filesExpressDropTitle}
                            onPick={(picked) => {
                                onPick(picked);
                                setDialogOpen(false);
                            }}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

function FileThumb({image}: {image: RequestReferenceImage}) {
    const isPdf = /\.pdf$/i.test(image.name);
    return (
        <div
            className={cn(
                'relative flex size-24 flex-col justify-end overflow-hidden rounded-md border bg-background p-1.5 text-[11px] text-muted-foreground',
                image.status === 'error' ? 'border-destructive' : 'border-border',
            )}
            title={image.name}
        >
            {!isPdf && image.url ? (
                // Local blob preview only (never sent).
                <img src={image.url} alt="" className="absolute inset-0 size-full object-cover opacity-90" />
            ) : (
                <FileText className="absolute left-1.5 top-1.5 size-4 text-foreground" aria-hidden />
            )}
            <span className="relative truncate rounded-sm bg-background/90 px-1">
                {image.status === 'uploading' ? REQUEST_COPY.intakeFileUploading : image.status === 'error' ? REQUEST_COPY.intakeFileFailed : image.name}
            </span>
        </div>
    );
}

/** RFQ v2 columns: one file as a horizontal list card inside the dashed panel. */
function FileListCard({image, onRemove}: {image: RequestReferenceImage; onRemove?: (id: string) => void}) {
    const isPdf = /\.pdf$/i.test(image.name);
    const status =
        image.status === 'uploading'
            ? REQUEST_COPY.intakeFileUploading
            : image.status === 'error'
              ? REQUEST_COPY.intakeFileFailed
              : null;
    return (
        <div
            className={cn(
                'flex items-center gap-3 rounded-md border bg-background p-2 text-sm',
                image.status === 'error' ? 'border-destructive' : 'border-border',
            )}
            title={image.name}
        >
            <span
                className={cn(
                    'relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-muted',
                    image.status === 'error' && 'bg-destructive/10',
                )}
            >
                {!isPdf && image.url ? (
                    // Local blob preview only (never sent).
                    <img src={image.url} alt="" className="size-full object-cover" />
                ) : (
                    <FileText className="size-4 text-foreground" aria-hidden />
                )}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate font-medium text-foreground">{image.name}</span>
                {status ? (
                    <span className={cn('text-xs', image.status === 'error' ? 'text-destructive' : 'text-muted-foreground')}>
                        {status}
                    </span>
                ) : null}
            </span>
            {onRemove ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    aria-label={`Remove ${image.name}`}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onRemove(image.id);
                    }}
                >
                    <X className="size-4" aria-hidden />
                </Button>
            ) : null}
        </div>
    );
}
