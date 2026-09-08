'use client';

import {AdditionalNoteField} from '@/components/customization-builder/ui/additional-note-field';
import {CUSTOMIZATION_BUILDER_COPY} from '@/components/customization-builder/copy';
import type {BuilderOption} from '@/lib/customization-builder';

type OptionDetailProps = {
    option: BuilderOption | undefined;
    consultationSelected?: boolean;
    entryNote: string;
    onEntryNoteChange: (note: string) => void;
};

export function OptionDetail({
    option,
    consultationSelected = false,
    entryNote,
    onEntryNoteChange,
}: OptionDetailProps) {
    if (consultationSelected) {
        return (
            <div
                className="flex flex-col gap-2"
                aria-label={CUSTOMIZATION_BUILDER_COPY.detailLabel}
            >
                <h3 className="text-base font-semibold tracking-tight">
                    {CUSTOMIZATION_BUILDER_COPY.skipNotSure}
                </h3>
                <p className="text-sm text-muted-foreground">
                    {CUSTOMIZATION_BUILDER_COPY.notSureHelper}
                </p>
            </div>
        );
    }

    if (!option) {
        return (
            <div
                className="flex flex-col gap-2"
                aria-label={CUSTOMIZATION_BUILDER_COPY.detailLabel}
            >
                <p className="text-sm text-muted-foreground">
                    {CUSTOMIZATION_BUILDER_COPY.pickAnOption}
                </p>
            </div>
        );
    }

    return (
        <div
            className="flex flex-col"
            aria-label={CUSTOMIZATION_BUILDER_COPY.detailLabel}
        >
            <div>
                <h3 className="text-base font-semibold tracking-tight">
                    {option.title}
                </h3>
                {option.description ? (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {option.description}
                    </p>
                ) : option.shortDescription ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                        {option.shortDescription}
                    </p>
                ) : null}
            </div>

            <div className="mt-5 flex flex-col gap-4 border-t border-border pt-4">
                <AdditionalNoteField
                    id={`entry-note-${option.id}`}
                    value={entryNote}
                    onChange={onEntryNoteChange}
                    categoryLabel={option.title}
                />
            </div>
        </div>
    );
}
