'use client';

import {useEffect, useState, type ReactNode} from 'react';
import {
    initialConsultationPropertySelection,
    summariesForPropertySelection,
    OptionPropertyControllers,
    type PropertySelectionMap,
} from '@/components/customization/option-property-controllers';
import {TypePropertyController} from '@/components/customization/type-property-controller';
import {AdditionalNoteField} from '@/components/customization-builder/ui/additional-note-field';
import {CUSTOMIZATION_BUILDER_COPY} from '@/components/customization-builder/copy';
import type {PropertyFieldDescriptor} from '@/lib/catalog/map-detail-to-property-fields';
import {loadOptionPropertyFields} from '@/lib/catalog/load-option-property-fields';
import type {
    BuilderOption,
    PropertySelectionSummaryItem,
} from '@/lib/customization-builder';
import type {UiDescriptor} from '@pakfactory/ui/components/customization/types';

function typePanelListbox(option: BuilderOption): UiDescriptor {
    return {
        kind: 'listbox',
        choices: [option.title],
        value: option.title,
    };
}

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
                    <h3 className="text-base font-semibold tracking-tight">
                        {CUSTOMIZATION_BUILDER_COPY.skipNotSure}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {CUSTOMIZATION_BUILDER_COPY.notSureHelper}
                    </p>
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

                {loadingFields ? (
                    <p className="mt-5 text-sm text-muted-foreground">
                        Loading…
                    </p>
                ) : fields.length > 0 ? (
                    <div className="mt-5">
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
                ) : (
                    <div className="mt-5">
                        <TypePropertyController
                            label={option.title}
                            ui={typePanelListbox(option)}
                            controlId={`type-${option.id}`}
                            variant="ghost"
                        />
                    </div>
                )}

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
