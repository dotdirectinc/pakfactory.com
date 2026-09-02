'use client';

import {useRef} from 'react';
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
    onReferenceImagesChange: (images: RequestReferenceImage[]) => void;
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
}: ContentsFieldProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const room = MAX_REF_IMAGES - referenceImages.length;

    function onPickFiles(event: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(event.target.files ?? []);
        event.target.value = '';
        if (!files.length || room <= 0) return;
        const next = files.slice(0, room).map((file) => ({
            id:
                typeof crypto !== 'undefined' && 'randomUUID' in crypto
                    ? crypto.randomUUID()
                    : `ref-${Date.now()}-${file.name}`,
            name: file.name,
            url: URL.createObjectURL(file),
        }));
        onReferenceImagesChange([...referenceImages, ...next]);
    }

    function removeImage(imageId: string) {
        const doomed = referenceImages.find((image) => image.id === imageId);
        if (doomed?.url.startsWith('blob:')) {
            URL.revokeObjectURL(doomed.url);
        }
        onReferenceImagesChange(
            referenceImages.filter((image) => image.id !== imageId),
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
                                    {/* Preview URLs are local object URLs from the file picker. */}
                                    <img
                                        src={image.url}
                                        alt=""
                                        className="size-full object-cover"
                                    />
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
                                        accept="image/*"
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
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
