import type {ReactNode} from 'react';
import {cn} from '@pakfactory/ui/lib/utils';

type MediaCardFrameProps = {
    media: ReactNode;
    bookmark?: ReactNode;
    meta: ReactNode;
    className?: string;
};

export function MediaCardFrame({
    media,
    bookmark,
    meta,
    className,
}: MediaCardFrameProps) {
    return (
        <div className={cn('group flex flex-col gap-0', className)}>
            <div className="relative aspect-square rounded-2xl bg-muted">
                <div className="absolute inset-0 overflow-hidden rounded-2xl">
                    <div
                        className={cn(
                            'absolute inset-0 origin-center transition-transform duration-300 ease-out',
                            'group-hover:scale-[1.03]',
                            'motion-reduce:transition-none motion-reduce:group-hover:scale-100',
                        )}
                    >
                        {media}
                    </div>
                </div>
                {bookmark ? (
                    <div className="absolute right-3 top-3 z-10">{bookmark}</div>
                ) : null}
            </div>
            <div className="relative z-10 mt-4">{meta}</div>
        </div>
    );
}
