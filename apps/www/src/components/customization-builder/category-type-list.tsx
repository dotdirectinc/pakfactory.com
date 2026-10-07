'use client';

import {useState} from 'react';
import {Check, Search} from 'lucide-react';
import {HighlightItem} from '@pakfactory/ui/components/highlight-item';
import {Input} from '@pakfactory/ui/components/input';
import {cn} from '@pakfactory/ui/lib/utils';
import {CUSTOMIZATION_BUILDER_COPY} from '@/components/customization-builder/copy';
import type {BuilderOption, BuilderType} from '@/lib/customization-builder';
import {productMediaLayerClass} from '@/lib/ui/product-media-scale';

type CategoryTypeListProps = {
    kind: 'dimensions' | 'selection';
    types: BuilderType[];
    options: BuilderOption[];
    activeTypeId: string | null;
    activeOptionId: string | null;
    /** Every option picked in this step (several Types, each per its `customerSelects`). */
    selectedOptionIds?: ReadonlySet<string>;
    /** Ruled out by the customer's other picks: listed, greyed, not selectable. */
    disabledOptionIds?: ReadonlySet<string>;
    consultationSelected?: boolean;
    onSelectConsultation: () => void;
    onSelectType: (typeId: string) => void;
    onSelectOption: (option: BuilderOption) => void;
    /** Step label for search placeholder (e.g. Materials → "Search materials…"). */
    categoryLabel?: string;
    /** Override nav chrome (e.g. when nested under Printed Side gate). */
    className?: string;
};

function optionMatchesQuery(option: BuilderOption, query: string): boolean {
    if (!query) return true;
    const hay = [option.title, option.shortDescription, option.description]
        .join(' ')
        .toLowerCase();
    return hay.includes(query);
}

export function CategoryTypeList({
    kind,
    types,
    options,
    activeTypeId,
    activeOptionId,
    selectedOptionIds,
    disabledOptionIds,
    consultationSelected = false,
    onSelectConsultation,
    onSelectType,
    onSelectOption,
    categoryLabel,
    className,
}: CategoryTypeListProps) {
    const [search, setSearch] = useState('');
    const query = search.trim().toLowerCase();
    const showSearch = kind === 'selection';

    const filteredOptions =
        !showSearch || !query
            ? options
            : options.filter((option) => optionMatchesQuery(option, query));

    const hasFilteredMatches =
        !showSearch || !query || filteredOptions.length > 0;

    const searchPlaceholder = CUSTOMIZATION_BUILDER_COPY.searchPlaceholder.replace(
        '{category}',
        (categoryLabel ?? 'options').trim().toLowerCase() || 'options',
    );

    return (
        <nav
            className={cn(
                'min-h-0 min-w-0 overflow-y-auto border-b border-border md:border-b-0 md:border-r',
                className,
            )}
            aria-label={CUSTOMIZATION_BUILDER_COPY.typeListLabel}
        >
            <div className="flex flex-col gap-4 px-3 py-3">
                {showSearch ? (
                    <div className="-mx-3 -mt-3 border-b border-border bg-muted/40 px-3 pb-4 pt-3">
                        <div className="relative min-w-0">
                            <Search
                                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                                aria-hidden
                            />
                            <Input
                                type="search"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder={searchPlaceholder}
                                aria-label={
                                    CUSTOMIZATION_BUILDER_COPY.searchLabel
                                }
                                className="h-10 rounded-md bg-background py-2 pl-9"
                            />
                        </div>
                    </div>
                ) : null}

                {kind === 'dimensions'
                    ? types.map((item) => {
                          const active =
                              !consultationSelected && item.id === activeTypeId;
                          return (
                              <HighlightItem
                                  key={item.id}
                                  selected={active}
                                  onClick={() => onSelectType(item.id)}
                              >
                                  <span className="text-sm font-medium">
                                      {item.title}
                                  </span>
                                  {item.description ? (
                                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                          {item.description}
                                      </p>
                                  ) : null}
                              </HighlightItem>
                          );
                      })
                    : hasFilteredMatches
                      ? types.map((type) => {
                            const typeOptions = filteredOptions.filter(
                                (item) => item.typeId === type.id,
                            );
                            if (typeOptions.length === 0) return null;
                            return (
                                <div key={type.id}>
                                    <p className="mb-2 flex items-baseline justify-between gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        <span>{type.title}</span>
                                        <span className="shrink-0 font-normal normal-case tracking-normal">
                                            {type.cardinality === 'many'
                                                ? CUSTOMIZATION_BUILDER_COPY.chooseAny
                                                : CUSTOMIZATION_BUILDER_COPY.chooseOne}
                                        </span>
                                    </p>
                                    <ul className="flex flex-col gap-1">
                                        {typeOptions.map((option) => {
                                            const picked =
                                                !consultationSelected &&
                                                Boolean(
                                                    selectedOptionIds?.has(
                                                        option.id,
                                                    ),
                                                );
                                            const open =
                                                picked &&
                                                option.id === activeOptionId;
                                            // A pick is never disabled: the rules keep what
                                            // stands, and clear what does not.
                                            const disabled =
                                                !picked &&
                                                Boolean(
                                                    disabledOptionIds?.has(
                                                        option.id,
                                                    ),
                                                );
                                            const blurb =
                                                option.shortDescription?.trim() ||
                                                option.description?.trim() ||
                                                '';
                                            return (
                                                <li key={option.id}>
                                                    <HighlightItem
                                                        selected={picked}
                                                        disabled={disabled}
                                                        title={
                                                            disabled
                                                                ? CUSTOMIZATION_BUILDER_COPY.unavailableWithSelections
                                                                : undefined
                                                        }
                                                        aria-pressed={picked}
                                                        aria-current={
                                                            open
                                                                ? 'true'
                                                                : undefined
                                                        }
                                                        onClick={() =>
                                                            onSelectOption(
                                                                option,
                                                            )
                                                        }
                                                        className={cn(
                                                            'flex w-full items-start gap-3',
                                                            disabled &&
                                                                'opacity-50 hover:bg-transparent',
                                                        )}
                                                    >
                                                        <span className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                                                            {option.imageUrl ? (
                                                                <div
                                                                    className={
                                                                        productMediaLayerClass
                                                                    }
                                                                >
                                                                    <img
                                                                        src={
                                                                            option.imageUrl
                                                                        }
                                                                        alt=""
                                                                        className="size-full object-contain"
                                                                    />
                                                                </div>
                                                            ) : null}
                                                        </span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block truncate text-sm font-medium">
                                                                {option.title}
                                                            </span>
                                                            {blurb ? (
                                                                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                                                    {blurb}
                                                                </p>
                                                            ) : null}
                                                            {disabled ? (
                                                                <span className="sr-only">
                                                                    {
                                                                        CUSTOMIZATION_BUILDER_COPY.unavailableWithSelections
                                                                    }
                                                                </span>
                                                            ) : null}
                                                        </span>
                                                        {picked ? (
                                                            <span
                                                                className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-brand-forest text-white"
                                                                aria-hidden
                                                            >
                                                                <Check
                                                                    className="size-2.5"
                                                                    strokeWidth={
                                                                        3
                                                                    }
                                                                />
                                                            </span>
                                                        ) : null}
                                                    </HighlightItem>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            );
                        })
                      : (
                            <p className="px-1 text-sm text-muted-foreground">
                                {CUSTOMIZATION_BUILDER_COPY.searchNoMatches}
                            </p>
                        )}

                <div className="mt-2 border-t border-border pt-4">
                    <HighlightItem
                        selected={consultationSelected}
                        onClick={onSelectConsultation}
                        className="w-full"
                    >
                        <span
                            className={
                                consultationSelected
                                    ? 'text-sm font-medium text-foreground'
                                    : 'text-sm font-medium text-muted-foreground'
                            }
                        >
                            {CUSTOMIZATION_BUILDER_COPY.skipNotSure}
                        </span>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {CUSTOMIZATION_BUILDER_COPY.specialistToAdvise}
                        </p>
                    </HighlightItem>
                </div>
            </div>
        </nav>
    );
}
