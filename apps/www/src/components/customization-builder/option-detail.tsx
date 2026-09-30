'use client';

import {useEffect, useState, type ReactNode} from 'react';
import {
    initialConsultationPropertySelection,
    summariesForPropertySelection,
    OptionPropertyControllers,
    type PropertySelectionMap,
} from '@/components/customization/option-property-controllers';
import {AdditionalNoteField} from '@/components/customization-builder/ui/additional-note-field';
import {OptionDetailHeader} from '@/components/customization-builder/ui/option-detail-header';
import {CUSTOMIZATION_BUILDER_COPY} from '@/components/customization-builder/copy';
import type {PropertyFieldDescriptor} from '@/lib/catalog/map-detail-to-property-fields';
import {loadOptionPropertyFields} from '@/lib/catalog/load-option-property-fields';
import type {
    BuilderOption,
    PropertySelectionSummaryItem,
} from '@/lib/customization-builder';

type OptionDetailProps = {
    option: BuilderOption | undefined;
    consultationSelected?: boolean;
    entryNote: string;
    onEntryNoteChange: (note: string) => void;
    propertySelections?: PropertySelectionMap;
    onPropertySelectionsChange?: (
        selections: PropertySelectionMap,
        summaries: PropertySelectionSummaryItem[],
    ) => void;
    /** Optional slot under title/description (e.g. Finishing “Achieved by”). */
    afterDescription?: ReactNode;
};

function DetailFade({children}: {children: ReactNode}) {
    return (
        <div className="animate-in fade-in fill-mode-both duration-[var(--motion-fast)] motion-reduce:animate-none">
            {children}
        </div>
    );
}

function emitSelections(
    fields: PropertyFieldDescriptor[],
    selections: PropertySelectionMap,
    onPropertySelectionsChange?: (
        selections: PropertySelectionMap,
        summaries: PropertySelectionSummaryItem[],
    ) => void,
) {
    onPropertySelectionsChange?.(
        selections,
        summariesForPropertySelection(
            fields,
            selections,
            CUSTOMIZATION_BUILDER_COPY.skipNotSure,
        ),
    );
}

export function OptionDetail({
    option,
    consultationSelected = false,
    entryNote,
    onEntryNoteChange,
    propertySelections,
    onPropertySelectionsChange,
    afterDescription,
}: OptionDetailProps) {
    const [fields, setFields] = useState<PropertyFieldDescriptor[]>([]);
    const [loadingFields, setLoadingFields] = useState(false);

    useEffect(() => {
        if (!option?.id) {
            setFields([]);
            return;
        }
        let cancelled = false;
        setLoadingFields(true);
        void loadOptionPropertyFields(option.id).then((next) => {
            if (cancelled) return;
            setFields(next);
            setLoadingFields(false);
            if (
                next.length > 0 &&
                onPropertySelectionsChange &&
                (!propertySelections ||
                    Object.keys(propertySelections).length === 0)
            ) {
                emitSelections(
                    next,
                    initialConsultationPropertySelection(next),
                    onPropertySelectionsChange,
                );
            }
        });
        return () => {
            cancelled = true;
        };
        // Only refetch when the Option changes — not when selections update.
        // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
    }, [option?.id]);

    const contentKey = consultationSelected
        ? 'consultation'
        : (option?.id ?? 'empty');

    if (consultationSelected) {
        return (
            <DetailFade key={contentKey}>
                <div
                    className="flex flex-col gap-2"
                    aria-label={CUSTOMIZATION_BUILDER_COPY.detailLabel}
                >
                    <OptionDetailHeader
                        title={CUSTOMIZATION_BUILDER_COPY.skipNotSure}
                        description={CUSTOMIZATION_BUILDER_COPY.notSureHelper}
                    />
                </div>
            </DetailFade>
        );
    }

    if (!option) {
        return (
            <DetailFade key={contentKey}>
                <div
                    className="flex flex-col gap-2"
                    aria-label={CUSTOMIZATION_BUILDER_COPY.detailLabel}
                >
                    <p className="text-sm text-muted-foreground">
                        {CUSTOMIZATION_BUILDER_COPY.pickAnOption}
                    </p>
                </div>
            </DetailFade>
        );
    }

    const selection = propertySelections ?? {};

    return (
        <DetailFade key={contentKey}>
            <div
                className="flex flex-col"
                aria-label={CUSTOMIZATION_BUILDER_COPY.detailLabel}
            >
                <OptionDetailHeader
                    title={option.title}
                    description={option.description}
                    shortDescription={option.shortDescription}
                    imageUrl={option.imageUrl}
                >
                    {afterDescription}
                </OptionDetailHeader>

                {loadingFields ? (
                    <p className="mt-8 text-sm text-muted-foreground">
                        Loading…
                    </p>
                ) : fields.length > 0 ? (
                    <div className="mt-8">
                        <OptionPropertyControllers
                            fields={fields}
                            value={selection}
                            variant="ghost"
                            consultationDefault
                            consultationLabel={
                                CUSTOMIZATION_BUILDER_COPY.skipNotSure
                            }
                            onChange={(propertyKey, ids) => {
                                emitSelections(
                                    fields,
                                    {
                                        ...selection,
                                        [propertyKey]: ids,
                                    },
                                    onPropertySelectionsChange,
                                );
                            }}
                        />
                    </div>
                ) : null}

                <div className="mt-5 border-t border-border pt-4">
                    <AdditionalNoteField
                        id={`entry-note-${option.id}`}
                        value={entryNote}
                        onChange={onEntryNoteChange}
                        categoryLabel={option.title}
                    />
                </div>
            </div>
        </DetailFade>
    );
}
