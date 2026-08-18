'use client';

import {useEffect, useRef, useState} from 'react';
import {Check, ChevronDown, X} from 'lucide-react';
import {Badge} from '@pakfactory/ui/components/badge';
import {Button} from '@pakfactory/ui/components/button';
import {Input} from '@pakfactory/ui/components/input';
import {cn} from '@pakfactory/ui/lib/utils';

function formatVolume(n: number): string {
    return n.toLocaleString('en-US');
}

function uniqueSorted(values: number[]): number[] {
    return [...new Set(values)].sort((a, b) => a - b);
}

const ROW_GRID =
    'grid grid-cols-[minmax(0,1fr)_auto] items-center justify-stretch gap-2 px-3';

type QuantityPickerProps = {
    volumes: number[];
    onAdd: (volume: number) => void;
    onRemove: (volume: number) => void;
    moq?: number | null;
    unitLabel?: string;
    className?: string;
};

export function QuantityPicker({
    volumes,
    onAdd,
    onRemove,
    moq = null,
    unitLabel = 'units',
    className,
}: QuantityPickerProps) {
    const [open, setOpen] = useState(false);
    const [customVolume, setCustomVolume] = useState('');
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        function onPointerDown(event: PointerEvent) {
            const el = rootRef.current;
            if (!el || el.contains(event.target as Node)) return;
            setOpen(false);
        }
        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [open]);

    const hasMoq = typeof moq === 'number' && moq > 0;
    const firstSelected = volumes[0];
    const base = hasMoq
        ? moq
        : firstSelected != null && firstSelected > 0
          ? firstSelected
          : 500;
    const ladder = uniqueSorted([
        base,
        base * 2,
        base * 5,
        base * 10,
        base * 20,
    ]);
    const options = uniqueSorted([...ladder, ...volumes]);

    const typedValue = Number(String(customVolume).replace(/[^0-9]/g, ''));
    const hasTypedValue =
        customVolume !== '' && Number.isFinite(typedValue) && typedValue > 0;
    const isMultiple = hasTypedValue && typedValue % 100 === 0;
    const meetsMoq = !hasMoq || typedValue >= moq;
    const customValid = hasTypedValue && isMultiple && meetsMoq;
    let customError: string | null = null;
    if (hasTypedValue && !isMultiple) {
        customError = 'Enter a quantity in multiples of 100.';
    } else if (hasTypedValue && !meetsMoq) {
        customError = `Minimum order is ${formatVolume(moq)} ${unitLabel}.`;
    }

    function addCustomVolume() {
        const value = Number(String(customVolume).replace(/[^0-9]/g, ''));
        const isMultipleOf100 = value > 0 && value % 100 === 0;
        const meetsMinimum = !hasMoq || value >= moq;
        if (!(isMultipleOf100 && meetsMinimum)) return;
        onAdd(value);
        setCustomVolume('');
    }

    const description = hasMoq
        ? `Quantities are in multiples of 100.  ·  Minimum order ${formatVolume(moq)} ${unitLabel}.`
        : 'Quantities are in multiples of 100.';

    const selected = uniqueSorted(volumes);

    return (
        <div className={cn('space-y-2', className)}>
            <div ref={rootRef} className="relative">
                <div
                    className={cn(
                        'flex min-h-11 h-auto w-full items-center gap-2 rounded-sm border border-input bg-background px-3 py-1.5',
                        open && 'ring-2 ring-ring ring-offset-1',
                    )}
                    onClick={() => setOpen((isOpen) => !isOpen)}
                >
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                        {selected.length === 0 ? (
                            <span className="text-sm font-medium text-muted-foreground">
                                Select quantities
                            </span>
                        ) : (
                            selected.map((volume) => (
                                <Badge
                                    key={volume}
                                    variant="secondary"
                                    className="gap-0.5 pr-0.5"
                                >
                                    {formatVolume(volume)}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label={`Remove ${formatVolume(volume)}`}
                                        className="size-5 rounded-full"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            onRemove(volume);
                                        }}
                                    >
                                        <X className="size-3" />
                                    </Button>
                                </Badge>
                            ))
                        )}
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-expanded={open}
                        aria-haspopup="listbox"
                        aria-label={open ? 'Close quantities' : 'Open quantities'}
                        className="size-8 shrink-0"
                        onClick={(event) => {
                            event.stopPropagation();
                            setOpen((isOpen) => !isOpen);
                        }}
                    >
                        <ChevronDown
                            className={cn(
                                'size-4 text-muted-foreground transition-transform',
                                open && 'rotate-180',
                            )}
                            aria-hidden
                        />
                    </Button>
                </div>

                {open ? (
                    <div
                        role="listbox"
                        aria-multiselectable="true"
                        className="absolute inset-x-0 z-40 mt-2 overflow-hidden rounded-xl border border-input bg-background shadow-lg"
                    >
                        <div className="border-b border-input py-5 px-4 flex flex-col gap-2">
                            <p className="text-xs leading-snug text-muted-foreground">
                                {description}
                            </p>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    min={1}
                                    placeholder="Type your own quantity"
                                    className="bg-background"
                                    value={customVolume}
                                    onChange={(event) =>
                                        setCustomVolume(
                                            event.target.value.replace(
                                                /[^0-9]/g,
                                                '',
                                            ),
                                        )
                                    }
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            event.preventDefault();
                                            addCustomVolume();
                                        }
                                    }}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs text-muted-foreground"
                                    onClick={addCustomVolume}
                                    disabled={!customValid}
                                >
                                    Add
                                </Button>
                            </div>
                            {customError ? (
                                <p className="mt-2 px-3 text-xs text-destructive">
                                    {customError}
                                </p>
                            ) : null}
                        </div>

                        <div>
                            {options.map((volume, index) => {
                                const isAdded = volumes.includes(volume);
                                return (
                                    <Button
                                        key={volume}
                                        type="button"
                                        variant="ghost"
                                        role="option"
                                        aria-selected={isAdded}
                                        onClick={() =>
                                            isAdded
                                                ? onRemove(volume)
                                                : onAdd(volume)
                                        }
                                        className={cn(
                                            ROW_GRID,
                                            'h-auto w-full rounded-none px-3 py-2 text-sm font-medium hover:bg-muted',
                                            index > 0 && 'border-t border-input',
                                        )}
                                    >
                                        <span className="px-3 text-left">
                                            {formatVolume(volume)} {unitLabel}
                                        </span>
                                        {isAdded ? (
                                            <span className="inline-flex h-8 items-center justify-center px-3">
                                                <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                                    <Check
                                                        className="size-3.5"
                                                        aria-hidden
                                                    />
                                                </span>
                                            </span>
                                        ) : (
                                            <span className="inline-flex h-8 items-center justify-center px-3 text-xs font-medium text-muted-foreground">
                                                Add
                                            </span>
                                        )}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
