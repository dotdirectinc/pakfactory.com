'use client';

import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';

const QUANTITY_LADDER = [500, 1000, 2500, 5000, 10000];

function formatVolume(n: number): string {
    return n.toLocaleString('en-US');
}

type QuantityPickerProps = {
    volumes: number[];
    onToggle: (volume: number) => void;
    className?: string;
};

export function QuantityPicker({volumes, onToggle, className}: QuantityPickerProps) {
    return (
        <div className={cn('space-y-3', className)}>
            <div className="flex flex-wrap gap-2">
                {QUANTITY_LADDER.map((volume) => {
                    const selected = volumes.includes(volume);
                    return (
                        <Button
                            key={volume}
                            type="button"
                            variant={selected ? 'default' : 'outline'}
                            size="sm"
                            aria-pressed={selected}
                            onClick={() => onToggle(volume)}
                        >
                            {formatVolume(volume)}
                        </Button>
                    );
                })}
            </div>
            {volumes.length > 0 ? (
                <ul className="space-y-1 text-sm text-muted-foreground">
                    {volumes.map((volume) => (
                        <li key={volume}>{formatVolume(volume)} units</li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-muted-foreground">Select a quantity.</p>
            )}
        </div>
    );
}
