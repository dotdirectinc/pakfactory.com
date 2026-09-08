'use client';

import {HighlightItem} from '@pakfactory/ui/components/highlight-item';
import {CUSTOMIZATION_BUILDER_COPY} from '@/components/customization-builder/copy';
import type {BuilderOption, BuilderType} from '@/lib/customization-builder';

type CategoryTypeListProps = {
    kind: 'dimensions' | 'selection';
    types: BuilderType[];
    options: BuilderOption[];
    activeTypeId: string | null;
    activeOptionId: string | null;
    consultationSelected?: boolean;
    onSelectConsultation: () => void;
    onSelectType: (typeId: string) => void;
    onSelectOption: (option: BuilderOption) => void;
};

export function CategoryTypeList({
    kind,
    types,
    options,
    activeTypeId,
    activeOptionId,
    consultationSelected = false,
    onSelectConsultation,
    onSelectType,
    onSelectOption,
}: CategoryTypeListProps) {
    return (
        <nav
            className="min-h-0 min-w-0 overflow-y-auto border-b border-border md:border-b-0 md:border-r"
            aria-label={CUSTOMIZATION_BUILDER_COPY.typeListLabel}
        >
            <div className="flex flex-col gap-4 px-3 py-3">
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
                    : types.map((type) => {
                          const typeOptions = options.filter(
                              (item) => item.typeId === type.id,
                          );
                          if (typeOptions.length === 0) return null;
                          return (
                              <div key={type.id}>
                                  <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                      {type.title}
                                  </p>
                                  <ul className="flex flex-col gap-1">
                                      {typeOptions.map((option) => {
                                          const active =
                                              !consultationSelected &&
                                              option.id === activeOptionId;
                                          return (
                                              <li key={option.id}>
                                                  <HighlightItem
                                                      selected={active}
                                                      onClick={() =>
                                                          onSelectOption(option)
                                                      }
                                                      className="flex w-full items-start gap-3"
                                                  >
                                                      <span className="size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                                                          {option.imageUrl ? (
                                                              <img
                                                                  src={
                                                                      option.imageUrl
                                                                  }
                                                                  alt=""
                                                                  className="size-full object-cover"
                                                              />
                                                          ) : null}
                                                      </span>
                                                      <span className="min-w-0">
                                                          <span className="block text-sm font-medium">
                                                              {option.title}
                                                          </span>
                                                          {option.shortDescription ? (
                                                              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                                                  {
                                                                      option.shortDescription
                                                                  }
                                                              </p>
                                                          ) : null}
                                                      </span>
                                                  </HighlightItem>
                                              </li>
                                          );
                                      })}
                                  </ul>
                              </div>
                          );
                      })}

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
