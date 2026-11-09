'use client';

import {Checkbox} from '@pakfactory/ui/components/checkbox';
import {RadioGroup, RadioGroupItem} from '@pakfactory/ui/components/radio-group';
import {cn} from '@pakfactory/ui/lib/utils';

export type ChoiceOption = {value: string; label: string; hint?: string};

type ChoiceCardsProps = {
    id: string;
    label: string;
    /** Hide the label when the screen heading already asks the question. */
    hideLabel?: boolean;
    options: readonly ChoiceOption[];
    value: string;
    onChange: (value: string) => void;
    /** `grid` = two columns from `sm`; `grid3` = three columns from `sm` (short options). */
    layout?: 'list' | 'grid' | 'grid3';
};

/** One choice as cards (intake v3): the whole card selects; selected = dark border + light fill. */
export function ChoiceCards({id, label, hideLabel = false, options, value, onChange, layout = 'list'}: ChoiceCardsProps) {
    return (
        <fieldset className="flex flex-col gap-2">
            <legend className={hideLabel ? 'sr-only' : 'mb-2 text-base font-medium text-foreground'}>{label}</legend>
            <RadioGroup
                value={value}
                onValueChange={onChange}
                className={cn('grid gap-2', layout === 'grid' ? 'grid-cols-1 sm:grid-cols-2' : layout === 'grid3' ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1')}
            >
                {options.map((o) => (
                    <label
                        key={o.value}
                        htmlFor={`${id}-${o.value}`}
                        className={cn(
                            // Same height in every row (min-h), so a short hint doesn't make a smaller card.
                            'flex min-h-24 cursor-pointer items-start gap-4 rounded-xl border bg-background p-4 transition-colors hover:bg-muted/40',
                            value === o.value ? 'border-foreground bg-muted/40' : 'border-border',
                        )}
                    >
                        <RadioGroupItem id={`${id}-${o.value}`} value={o.value} className="mt-1" />
                        <span className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-foreground">{o.label}</span>
                            {o.hint ? <span className="text-xs text-muted-foreground">{o.hint}</span> : null}
                        </span>
                    </label>
                ))}
            </RadioGroup>
        </fieldset>
    );
}

type CheckboxCardsProps = {
    id: string;
    label: string;
    hideLabel?: boolean;
    options: readonly ChoiceOption[];
    values: readonly string[];
    onChange: (values: string[]) => void;
};

/** Several choices as cards (c99): same look as ChoiceCards, a checkbox per card. */
export function CheckboxCards({id, label, hideLabel = false, options, values, onChange}: CheckboxCardsProps) {
    return (
        <fieldset className="flex flex-col gap-2">
            <legend className={hideLabel ? 'sr-only' : 'mb-2 text-base font-medium text-foreground'}>{label}</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {options.map((o) => {
                    const checked = values.includes(o.value);
                    return (
                        <label
                            key={o.value}
                            htmlFor={`${id}-${o.value}`}
                            className={cn(
                                'flex min-h-24 cursor-pointer items-start gap-4 rounded-xl border bg-background p-4 transition-colors hover:bg-muted/40',
                                checked ? 'border-foreground bg-muted/40' : 'border-border',
                            )}
                        >
                            <Checkbox
                                id={`${id}-${o.value}`}
                                checked={checked}
                                onCheckedChange={(next) =>
                                    onChange(next === true ? [...values, o.value] : values.filter((v) => v !== o.value))
                                }
                                className="mt-1"
                            />
                            <span className="flex flex-col gap-1">
                                <span className="text-sm font-medium text-foreground">{o.label}</span>
                                {o.hint ? <span className="text-xs text-muted-foreground">{o.hint}</span> : null}
                            </span>
                        </label>
                    );
                })}
            </div>
        </fieldset>
    );
}
