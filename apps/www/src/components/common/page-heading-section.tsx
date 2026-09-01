import type {ReactNode} from 'react';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

type PageHeadingSectionProps = {
    title: ReactNode;
    description?: ReactNode;
    eyebrow?: ReactNode;
    variant?: 'default' | 'compact';
    className?: string;
    innerClassName?: string;
    titleClassName?: string;
    descriptionClassName?: string;
    children?: ReactNode;
};

export function PageHeadingSection({
    title,
    description,
    eyebrow,
    variant = 'default',
    className,
    innerClassName,
    titleClassName,
    descriptionClassName,
    children,
}: PageHeadingSectionProps) {
    const isCompact = variant === 'compact';

    return (
        <PageDielineSection
            className={className}
            innerClassName={cn(
                'border-border pb-12 pt-24',
                isCompact && 'pb-8',
                innerClassName,
            )}
        >
            <div
                className={cn(
                    'flex max-w-full flex-col',
                    isCompact ? 'gap-3' : 'gap-4',
                )}
            >
                {eyebrow ? (
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {eyebrow}
                    </p>
                ) : null}
                <h1
                    className={cn(
                        'font-medium leading-none tracking-tight text-foreground',
                        isCompact
                            ? 'text-[clamp(2rem,5vw,3rem)]'
                            : 'text-[clamp(2.5rem,6vw,4.5rem)]',
                        titleClassName,
                    )}
                >
                    {title}
                </h1>
                {description ? (
                    <div
                        className={cn(
                            'text-muted-foreground',
                            isCompact
                                ? 'max-w-2xl text-lg leading-7'
                                : 'max-w-3xl text-xl leading-7',
                            descriptionClassName,
                        )}
                    >
                        {description}
                    </div>
                ) : null}
                {children}
            </div>
        </PageDielineSection>
    );
}
