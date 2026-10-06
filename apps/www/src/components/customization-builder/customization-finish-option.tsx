'use client';

import {useEffect} from 'react';
import {OptionDetail} from '@/components/customization-builder/option-detail';
import {AdditionalNoteField} from '@/components/customization-builder/ui/additional-note-field';
import {OptionDetailHeader} from '@/components/customization-builder/ui/option-detail-header';
import {CUSTOMIZATION_BUILDER_COPY} from '@/components/customization-builder/copy';
import {
    PROPERTY_CONSULTATION_ID,
    type PropertySelectionMap,
} from '@/components/customization/option-property-controllers';
import {TypePropertyController} from '@/components/customization/type-property-controller';
import type {
    BuilderOption,
    PropertySelectionSummaryItem,
} from '@/lib/customization-builder';
import type {
    PropertyControllerValue,
    UiDescriptor,
} from '@pakfactory/ui/components/customization/types';

/** Reserved propertySelections key for reverse `achieves` technique pick. */
export const ACHIEVED_BY_PROPERTY_KEY = 'achievedBy';

type SelectionDetailProps = {
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

function techniqueLearnMoreHref(item: NonNullable<BuilderOption['achievedBy']>[number]): string | undefined {
    if (!item.hasPage || !item.slug || !item.categorySlug) return undefined;
    return `/customizations/${item.categorySlug}/${item.slug}`;
}

function buildsAchievesUi(
    option: BuilderOption,
    selectedId: string,
): UiDescriptor {
    const techniques = (option.achievedBy ?? []).map((item) => {
        const learnMoreHref = techniqueLearnMoreHref(item);
        return {
            id: item.id,
            title: item.title,
            ...(item.description ? {description: item.description} : {}),
            ...(item.imageUrl ? {imageUrl: item.imageUrl} : {}),
            ...(learnMoreHref ? {learnMoreHref} : {}),
        };
    });

    return {
        kind: 'achieves',
        techniques,
        consultationId: PROPERTY_CONSULTATION_ID,
        consultationLabel: CUSTOMIZATION_BUILDER_COPY.skipNotSure,
        learnMoreLabel: CUSTOMIZATION_BUILDER_COPY.achievedByLearnMore,
        value: selectedId,
    };
}

function summariesForAchievedBy(
    option: BuilderOption,
    selectedId: string,
): PropertySelectionSummaryItem[] {
    if (selectedId === PROPERTY_CONSULTATION_ID) {
        return [
            {
                kind: 'chip',
                label: CUSTOMIZATION_BUILDER_COPY.skipNotSure,
                omitFromSummary: true,
            },
        ];
    }
    const technique = option.achievedBy?.find((item) => item.id === selectedId);
    if (!technique) return [];
    return [
        {
            kind: 'chip',
            label: technique.title,
            omitFromSummary: false,
            ...(technique.imageUrl ? {imageUrl: technique.imageUrl} : {}),
        },
    ];
}

function AchievedByDetail({
    option,
    entryNote,
    onEntryNoteChange,
    propertySelections,
    onPropertySelectionsChange,
}: {
    option: BuilderOption;
    entryNote: string;
    onEntryNoteChange: (note: string) => void;
    propertySelections?: PropertySelectionMap;
    onPropertySelectionsChange?: (
        selections: PropertySelectionMap,
        summaries: PropertySelectionSummaryItem[],
    ) => void;
}) {
    const selection = propertySelections ?? {};
    const selectedId =
        selection[ACHIEVED_BY_PROPERTY_KEY]?.[0] ?? PROPERTY_CONSULTATION_ID;

    const selectedTitle =
        selectedId === PROPERTY_CONSULTATION_ID
            ? CUSTOMIZATION_BUILDER_COPY.skipNotSure
            : (option.achievedBy?.find((item) => item.id === selectedId)
                  ?.title ?? CUSTOMIZATION_BUILDER_COPY.skipNotSure);

    useEffect(() => {
        if (!onPropertySelectionsChange) return;
        if (selection[ACHIEVED_BY_PROPERTY_KEY]?.length) return;
        const next: PropertySelectionMap = {
            ...selection,
            [ACHIEVED_BY_PROPERTY_KEY]: [PROPERTY_CONSULTATION_ID],
        };
        onPropertySelectionsChange(
            next,
            summariesForAchievedBy(option, PROPERTY_CONSULTATION_ID),
        );
        // Seed once when opening an option with empty achievedBy selection.
        // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
    }, [option.id]);

    const emit = (nextId: string) => {
        const next: PropertySelectionMap = {
            ...selection,
            [ACHIEVED_BY_PROPERTY_KEY]: [nextId],
        };
        onPropertySelectionsChange?.(
            next,
            summariesForAchievedBy(option, nextId),
        );
    };

    const handleChange = (next: PropertyControllerValue) => {
        if (next.kind !== 'achieves') return;
        emit(next.value);
    };

    return (
        <div
            className="animate-in fade-in fill-mode-both duration-[var(--motion-fast)] motion-reduce:animate-none"
        >
            <div
                className="flex flex-col"
                aria-label={CUSTOMIZATION_BUILDER_COPY.detailLabel}
            >
                <OptionDetailHeader
                    title={option.title}
                    description={option.description}
                    shortDescription={option.shortDescription}
                    imageUrl={option.imageUrl}
                />

                <div className="mt-8 flex flex-col gap-2">
                    <p className="text-sm text-muted-foreground">
                        {CUSTOMIZATION_BUILDER_COPY.achievedByHelper}
                    </p>
                    <TypePropertyController
                        label={CUSTOMIZATION_BUILDER_COPY.achievedBySelected}
                        titleValue={selectedTitle}
                        ui={buildsAchievesUi(option, selectedId)}
                        controlId={`achieves-${option.id}`}
                        variant="ghost"
                        value={{kind: 'achieves', value: selectedId}}
                        onChange={handleChange}
                    />
                </div>

                <div className="mt-5 border-t border-border pt-4">
                    <AdditionalNoteField
                        id={`entry-note-${option.id}`}
                        value={entryNote}
                        onChange={onEntryNoteChange}
                        categoryLabel={option.title}
                    />
                </div>
            </div>
        </div>
    );
}

/**
 * Finishing-category detail (PROD-2453 slice + PROD-2629).
 * When reverse `achieves` is present, drives technique choice via the
 * shared `achieves` PropertyController kind — no Soft Touch listbox.
 */
export function CustomizationFinishOption(props: SelectionDetailProps) {
    const hasAchievedBy =
        Boolean(props.option?.achievedBy?.length) &&
        !props.consultationSelected;

    if (hasAchievedBy && props.option) {
        return (
            <AchievedByDetail
                option={props.option}
                entryNote={props.entryNote}
                onEntryNoteChange={props.onEntryNoteChange}
                propertySelections={props.propertySelections}
                onPropertySelectionsChange={props.onPropertySelectionsChange}
            />
        );
    }

    return <OptionDetail {...props} />;
}
