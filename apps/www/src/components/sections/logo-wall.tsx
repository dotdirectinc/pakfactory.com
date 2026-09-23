import Link from 'next/link';
import {ChevronRight} from 'lucide-react';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';

import {
    LogoMarquee,
    type LogoMarqueeItem,
} from '@/components/ui/logo-marquee';
import {Icon} from '@/components/ui/icon';
import type {SolutionLogosContent} from '@/lib/solutions/types';

export type LogoWallContent = SolutionLogosContent;

type LogoWallProps = {
    content: LogoWallContent;
    /** DOM id for the sr-only heading when present. */
    headingId?: string;
};

function toLogoMarqueeItems(content: LogoWallContent): LogoMarqueeItem[] {
    return content.items.map((item) => ({
        id: item.id,
        name: item.name,
        imageSrc: item.imageSrc,
        href: item.href,
        linkLabel: item.linkLabel,
        width: item.width,
        height: item.height,
    }));
}

/**
 * Logo wall band — PageDielineSection + inline label + LogoMarquee (ADR-020 / WP2a).
 * Props-only; fixture + CMS paths share this component.
 */
export function LogoWall({
    content,
    headingId = 'logo-wall-heading',
}: LogoWallProps) {
    const items = toLogoMarqueeItems(content);
    if (items.length === 0) return null;

    const {
        borderTop = false,
        borderBottom = true,
        paddingBlock = 'sm',
        cta,
        subhead,
    } = content;

    const showLabel = Boolean(subhead?.trim() || cta?.label?.trim());

    return (
        <PageDielineSection
            as="section"
            aria-labelledby={content.heading ? headingId : undefined}
            className="bg-background"
            borderTop={borderTop}
            borderBottom={borderBottom}
            paddingBlock={paddingBlock}
        >
            {content.heading ? (
                <h2 id={headingId} className="sr-only">
                    {content.heading}
                </h2>
            ) : null}
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-10">
                {showLabel ? (
                    <div className="flex shrink-0 flex-col gap-2 md:max-w-[280px] lg:max-w-[320px]">
                        {subhead?.trim() ? (
                            <p className="text-sm leading-snug text-muted-foreground">
                                {subhead.trim()}
                            </p>
                        ) : null}
                        {cta?.label?.trim() && cta.href ? (
                            <Link
                                href={cta.href}
                                className="group inline-flex shrink-0 items-center gap-2 text-sm font-medium text-foreground"
                            >
                                <span className="underline-offset-4 group-hover:underline">
                                    {cta.label.trim()}
                                </span>
                                <Icon
                                    icon={ChevronRight}
                                    size="sm"
                                    className="transition-transform duration-300 ease-out group-hover:translate-x-0.5"
                                />
                            </Link>
                        ) : null}
                    </div>
                ) : null}
                <div className="min-w-0 flex-1">
                    <LogoMarquee items={items} />
                </div>
            </div>
        </PageDielineSection>
    );
}
