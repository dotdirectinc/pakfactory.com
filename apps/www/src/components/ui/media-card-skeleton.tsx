import {Skeleton} from '@pakfactory/ui/components/skeleton';
import {cn} from '@pakfactory/ui/lib/utils';

type MediaCardSkeletonProps = {
    className?: string;
};

/**
 * Loading placeholder matching {@link MediaCardFrame} rhythm
 * (mobile row + desktop square media + eyebrow/title meta).
 */
export function MediaCardSkeleton({className}: MediaCardSkeletonProps) {
    return (
        <div
            aria-hidden
            className={cn(
                'flex flex-row items-start gap-4 sm:flex-col sm:items-stretch sm:gap-0',
                className,
            )}
        >
            <div className="relative size-24 shrink-0 sm:aspect-square sm:size-auto sm:w-full">
                <Skeleton className="absolute inset-0 rounded-2xl" />
            </div>
            <div className="min-w-0 flex-1 space-y-2 sm:mt-4 sm:w-full sm:px-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-3/4 max-w-56" />
                <Skeleton className="h-4 w-1/2 max-w-40" />
            </div>
        </div>
    );
}
