'use client';

import {UploadCloud} from 'lucide-react';

type FilesDropzoneProps = {
    linkLabel: string;
    dropTitle: string;
    files?: string[];
    onPick: (names: string[]) => void;
};

/** Label + always-visible dashed dropzone (POC CollapsibleFilesDropzone). */
export function FilesDropzone({
    linkLabel,
    dropTitle,
    files = [],
    onPick,
}: FilesDropzoneProps) {
    const hasFiles = files.length > 0;

    return (
        <div>
            <p className="text-xs font-medium text-foreground">{linkLabel}</p>
            <label className="mt-2 flex cursor-pointer flex-col items-center gap-1 rounded-md border border-dashed border-border px-4 py-6 text-center text-muted-foreground hover:bg-muted/30">
                <UploadCloud className="size-5" aria-hidden />
                <span className="text-sm font-medium text-foreground">
                    {dropTitle}
                </span>
                <span className="text-[11px]">
                    PNG · JPG · PDF · AI — up to 25MB each
                </span>
                <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                        const names = Array.from(e.target.files ?? []).map(
                            (f) => f.name,
                        );
                        e.target.value = '';
                        if (names.length) onPick(names);
                    }}
                />
            </label>
            {hasFiles ? (
                <p className="mt-2 text-xs text-muted-foreground">
                    Attached: {files.join(', ')}
                </p>
            ) : null}
        </div>
    );
}
