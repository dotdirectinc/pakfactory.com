import type {ReactNode} from 'react';
import {cn} from '@pakfactory/ui/lib/utils';

import {PageHeadingContent} from '@/components/common/page-heading-section';
import {HeroCtaGroup, type HeroTone} from '@/components/ui/hero-cta-group';
import type {HeroCta} from '@/lib/sections/map-hero';

type HeroCopyProps = {
    eyebrow?: string;
    /** H1 content — plain text, or the Finder's sentence with pickers. */
    title: ReactNode;
    titleId: string;
    intro?: string;
    primaryCta?: HeroCta;
    secondaryCta?: HeroCta;
    /** Review proof under the buttons (streamed separately). */
    rating?: ReactNode;
    tone?: HeroTone;
    className?: string;
};

/**
 * Fixed hero copy — eyebrow · H1 · intro · CTA pair · rating (PROD-2666).
 * Composes `PageHeadingContent` so the heading-settle build-in and type scale
 * match every other www hero; only the inverse colours are added here.
 */
export function HeroCopy({
    eyebrow,
    title,
    titleId,
    intro,
    primaryCta,
    secondaryCta,
    rating,
    tone = 'default',
    className,
}: HeroCopyProps) {
    const inverse = tone === 'inverse';
    const hasActions = Boolean(primaryCta || secondaryCta || rating);
    return (
        <div className={className}>
            <PageHeadingContent
                eyebrow={
                    eyebrow
                        ? inverse
                            ? {
                                  type: 'text',
                                  content: (
                                      <span className="text-background/75">
                                          {eyebrow}
                                      </span>
                                  ),
                              }
                            : eyebrow
                        : undefined
                }
                title={title}
                titleId={titleId}
                description={intro}
                settle
                titleClassName={cn(
                    'max-w-3xl text-balance',
                    inverse && 'text-background',
                )}
                descriptionClassName={cn(
                    'max-w-xl',
                    inverse && 'text-background/80',
                )}
            >
                {hasActions ? (
                    <div className="flex flex-col gap-6 pt-4">
                        <HeroCtaGroup
                            primary={primaryCta}
                            secondary={secondaryCta}
                            tone={tone}
                        />
                        {rating}
                    </div>
                ) : null}
            </PageHeadingContent>
        </div>
    );
}
