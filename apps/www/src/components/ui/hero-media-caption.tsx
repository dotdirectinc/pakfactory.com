import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';
import {Badge} from '@pakfactory/ui/components/badge';
import {cn} from '@pakfactory/ui/lib/utils';

import {Icon} from '@/components/ui/icon';

export type HeroMediaCaptionProps = {
    /** Optional kind eyebrow (Spotlight). Finder omits this. */
    kindLabel?: string;
    title: string;
    description?: string;
    chips?: string[];
    stat?: {value: string; label?: string};
    link?: {label: string; href: string};
    /** -1 while the owning slide is hidden, so hidden links leave the tab order. */
    tabIndex?: number;
    className?: string;
};

/**
 * White caption card pinned over hero media (PROD-2666) — optional kind
 * eyebrow, title, one line, optional product chips / headline stat, and the
 * slide's own link. Props-only; a content container, so it is a card
 * (DESIGN.md § Cards).
 */
export function HeroMediaCaption({
    kindLabel,
    title,
    description,
    chips,
    stat,
    link,
    tabIndex,
    className,
}: HeroMediaCaptionProps) {
    return (
        <div
            className={cn(
                'flex flex-col gap-4 rounded-xl bg-background p-6 text-foreground shadow-md',
                className,
            )}
        >
            {kindLabel ? (
                <Badge variant="secondary" className="w-fit uppercase tracking-wider">
                    {kindLabel}
                </Badge>
            ) : null}
            <div className="flex flex-col gap-1">
                <p className="text-lg font-medium leading-snug">{title}</p>
                {description ? (
                    <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {description}
                    </p>
                ) : null}
            </div>
            {chips && chips.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {chips.map((chip) => (
                        <Badge key={chip} variant="outline">
                            {chip}
                        </Badge>
                    ))}
                </div>
            ) : null}
            {stat || link ? (
                <div className="flex flex-wrap items-end justify-between gap-4">
                    {stat ? (
                        <div className="flex flex-col gap-1">
                            <p className="text-3xl font-semibold leading-none tracking-tight tabular-nums">
                                {stat.value}
                            </p>
                            {stat.label ? (
                                <p className="line-clamp-2 max-w-56 text-sm text-muted-foreground">
                                    {stat.label}
                                </p>
                            ) : null}
                        </div>
                    ) : null}
                    {link ? (
                        <Link
                            href={link.href}
                            tabIndex={tabIndex}
                            className="group inline-flex w-fit cursor-pointer items-center gap-2 text-sm font-medium text-primary underline underline-offset-4"
                        >
                            {link.label}
                            <Icon
                                icon={ArrowUpRight}
                                className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none"
                            />
                        </Link>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
