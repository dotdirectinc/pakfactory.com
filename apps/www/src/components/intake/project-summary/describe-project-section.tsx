'use client';

import {useEffect, useRef, useState} from 'react';
import {BriefOrFiles} from '@/components/intake/fields/brief-or-files';
import type {RequestFlow} from '@/lib/intake/routes';
import {
    fileRejectionReason,
    useAttachmentUpload,
} from '@/lib/rfq/use-attachment-upload';
import type {RequestDraft, RequestReferenceImage} from '@/lib/request/request.storage';

/**
 * Project summary — Describe your project (brief or files).
 * Owns upload local state the same way StepRequirements did for part="brief".
 */
export function DescribeProjectSection({
    draft,
    onPatch,
    flow,
    columns = false,
}: {
    draft: RequestDraft;
    onPatch: (patch: Partial<RequestDraft>) => void;
    flow: RequestFlow;
    columns?: boolean;
}) {
    const [images, setImages] = useState<RequestReferenceImage[]>(draft.referenceImages ?? []);
    const [rejected, setRejected] = useState<string[]>([]);
    const upload = useAttachmentUpload(draft.id, setImages);

    const onPatchRef = useRef(onPatch);
    onPatchRef.current = onPatch;

    useEffect(() => {
        onPatchRef.current({referenceImages: images});
    }, [images]);

    function onPickFiles(files: File[]) {
        const reasons: string[] = [];
        const accepted = files.filter((file) => {
            const reason = fileRejectionReason(file);
            if (reason) reasons.push(reason);
            return !reason;
        });
        setRejected(reasons);
        if (accepted.length) void upload(accepted);
    }

    function onRemoveFile(imageId: string) {
        setImages((prev) => {
            const doomed = prev.find((image) => image.id === imageId);
            if (doomed?.url?.startsWith('blob:')) URL.revokeObjectURL(doomed.url);
            return prev.filter((image) => image.id !== imageId);
        });
    }

    return (
        <BriefOrFiles
            notes={draft.notes}
            onNotes={(notes) => onPatch({notes})}
            images={images}
            rejected={rejected}
            onPick={onPickFiles}
            onRemove={onRemoveFile}
            flow={flow}
            {...(columns ? {columns: true} : {})}
        />
    );
}
