'use client';

import {useRef, useState} from 'react';
import {Check, Loader2, Sparkles, UploadCloud} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';
import {REQUEST_COPY} from '@/lib/copy/request';

export type AssistFill = {
    packagingContents: string;
    region: string;
    notes: string;
};

const SAMPLE_FILL: AssistFill = {
    packagingContents:
        'Six 500ml cold-pressed juice bottles (glass) + a folded recipe card insert',
    region: 'Canada & United States',
    notes: 'Launching a spring cold-pressed juice line for retail and DTC. Priority is a premium unboxing, food-safe and recyclable materials, and consistent brand color across every piece. Targeting a March launch.',
};

type BriefAssistUploadProps = {
    onFill: (fields: AssistFill) => void;
    className?: string;
};

export function BriefAssistUpload({onFill, className}: BriefAssistUploadProps) {
    const [status, setStatus] = useState<'idle' | 'reading' | 'done'>('idle');
    const [fileName, setFileName] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    function run(name: string) {
        setFileName(name);
        setStatus('reading');
        window.setTimeout(() => {
            onFill({...SAMPLE_FILL});
            setStatus('done');
        }, 1500);
    }

    function onPick(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0];
        if (f) run(f.name);
        e.target.value = '';
    }

    return (
        <div className={cn('rounded-2xl bg-muted p-4', className)}>
            <input
                ref={inputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,image/*"
                className="hidden"
                onChange={onPick}
            />

            {status === 'done' ? (
                <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Check className="size-3.5 text-primary" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">
                            {REQUEST_COPY.assistDonePrefix}{' '}
                            <span className="font-semibold">
                                {fileName || 'your document'}
                            </span>{' '}
                            {REQUEST_COPY.assistDoneSuffix}
                        </p>
                        <button
                            type="button"
                            onClick={() => setStatus('idle')}
                            className="mt-0.5 text-xs font-medium text-primary hover:underline"
                        >
                            {REQUEST_COPY.useDifferentDocument}
                        </button>
                    </div>
                </div>
            ) : status === 'reading' ? (
                <div className="flex items-center gap-2">
                    <Loader2
                        className="size-4 shrink-0 animate-spin text-primary"
                        aria-hidden
                    />
                    <p className="text-sm text-muted-foreground">
                        Reading{' '}
                        <span className="font-medium text-foreground">
                            {fileName || 'your document'}
                        </span>{' '}
                        {REQUEST_COPY.assistReading}
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div className="flex items-start gap-2">
                        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-background/80">
                            <Sparkles
                                className="size-3.5 text-foreground"
                                aria-hidden
                            />
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">
                                {REQUEST_COPY.assistTitle}
                            </p>
                            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                                {REQUEST_COPY.assistBody}
                            </p>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 pl-9 sm:pl-0">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-9 gap-1.5 rounded-full px-4 text-xs shadow-none"
                            onClick={() => inputRef.current?.click()}
                        >
                            <UploadCloud className="size-3.5" aria-hidden />
                            {REQUEST_COPY.uploadDocument}
                        </Button>
                        <button
                            type="button"
                            onClick={() => run('sample-brief.pdf')}
                            className="text-xs font-medium text-foreground hover:underline"
                        >
                            {REQUEST_COPY.tryASample}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
