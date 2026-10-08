import {cn} from '@pakfactory/ui/lib/utils';
import {
    COMPARE_EMPTY_CELL,
    COMPARE_EMPTY_CELL_LABEL,
    compareCellDisplay,
    type CompareMatrixRow,
} from '@/lib/catalog/compare-matrix';

export type CompareSpecMatrixColumn = {
    id: string;
    title: string;
} | null;

type CompareSpecMatrixProps = {
    /** Fixed column count (empty slots render as em dash). */
    columns: CompareSpecMatrixColumn[];
    rows: CompareMatrixRow[];
    className?: string;
};

/**
 * Props-only compare matrix: full-width row label, then one cell per column.
 * Reusable on the detail band and the future `/compare` page (PROD-1534).
 */
export function CompareSpecMatrix({
    columns,
    rows,
    className,
}: CompareSpecMatrixProps) {
    const columnCount = Math.max(columns.length, 1);

    return (
        <div className={cn('flex flex-col', className)} role="table">
            {rows.map((row) => (
                <div
                    key={row.key}
                    id={`compare-row-${row.key}`}
                    className="scroll-mt-32"
                    role="row"
                >
                    <div
                        className="border-b border-border px-4 pb-4 pt-8"
                        role="rowheader"
                    >
                        <p className="text-xl font-semibold leading-7 text-foreground">
                            {row.label}
                        </p>
                    </div>

                    <div
                        className={cn(
                            'grid gap-0',
                            columnCount === 1 && 'grid-cols-1',
                            columnCount === 2 && 'grid-cols-2',
                            columnCount >= 3 && 'grid-cols-2 md:grid-cols-3',
                        )}
                    >
                        {columns.map((col, i) => {
                            const text = compareCellDisplay(
                                row.valuesById,
                                col?.id ?? null,
                            );
                            const isEmpty = text === COMPARE_EMPTY_CELL;
                            return (
                                <div
                                    key={
                                        col
                                            ? `${row.key}-${col.id}`
                                            : `${row.key}-empty-${i}`
                                    }
                                    role="cell"
                                    className={cn(
                                        'min-w-0 px-4 pb-8 pt-4 text-base font-medium leading-6 text-muted-foreground',
                                        columnCount >= 3 &&
                                            i === 2 &&
                                            'hidden md:block',
                                    )}
                                    {...(isEmpty
                                        ? {
                                              'aria-label':
                                                  COMPARE_EMPTY_CELL_LABEL,
                                          }
                                        : {})}
                                >
                                    {text}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
