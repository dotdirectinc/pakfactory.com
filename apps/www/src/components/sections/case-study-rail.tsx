import Image from 'next/image';
import Link from 'next/link';
import {Button} from '@pakfactory/ui/components/button';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import type {CaseStudiesRowContent} from '@/components/sections/case-studies-row';
import {SectionHeading} from '@/components/ui/section-heading';
import {SnapRail} from '@/components/ui/snap-rail';

type CaseStudyRailProps = {
    content: CaseStudiesRowContent;
    id?: string;
    className?: string;
};

/**
 * Case studies as a proof rail — full-bleed 4:3 image cards on a snap rail, the
 * whole card the link, image easing to 103% on hover (POC `ProofSection` +
 * `CaseStudyCarousel`). Muted band; the "see all" link is an outline pill beside
 * the heading. Props-only — renders Studio `caseStudiesRow` on expertise pages.
 */
export function CaseStudyRail({
    content,
    id = 'case-studies',
    className,
}: CaseStudyRailProps) {
    const {eyebrow, headline, description, cta, cards, align, borderTop, borderBottom} =
        content;
    if (cards.length === 0) return null;
    const headingId = `${id}-heading`;

    return (
        <section
            id={id}
            aria-labelledby={headingId}
            className={cn('scroll-mt-32', className)}
        >
            <PageDielineSection
                as="div"
                band="muted"
                borderTop={borderTop}
                borderBottom={borderBottom}
                paddingBlock="lg"
            >
                <div className="flex flex-col gap-12">
                    <SectionHeading
                        eyebrow={eyebrow}
                        title={<span id={headingId}>{headline}</span>}
                        description={description}
                        descriptionClassName="text-base leading-7"
                        align={align}
                        showCta={false}
                        actions={
                            cta ? (
                                <Button asChild variant="outline" className="rounded-full">
                                    <Link href={cta.href}>{cta.label}</Link>
                                </Button>
                            ) : undefined
                        }
                    />
                    <SnapRail label="Case studies">
                        {cards.map((card) => (
                            <li
                                key={card.id}
                                className="w-[82vw] max-w-150 shrink-0 snap-start"
                            >
                                <Link
                                    href={card.href}
                                    className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-xl bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                                >
                                    {card.image?.src ? (
                                        <Image
                                            src={card.image.src}
                                            alt=""
                                            fill
                                            className="object-cover transition-transform duration-500 ease-out group-hover:scale-103 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                                            sizes="(max-width: 768px) 82vw, 600px"
                                        />
                                    ) : null}
                                    {/* Scrim: contrast comes from the overlay, not the photo. */}
                                    <span
                                        aria-hidden
                                        className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/25 via-45% to-foreground/10"
                                    />
                                    <span className="relative flex flex-col gap-2 p-6 pt-12">
                                        {card.brand ? (
                                            <span className="text-xs font-semibold uppercase tracking-widest text-background/85">
                                                {card.brand}
                                            </span>
                                        ) : null}
                                        <span className="text-lg font-medium leading-snug text-background sm:text-xl">
                                            {card.title}
                                        </span>
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </SnapRail>
                </div>
            </PageDielineSection>
        </section>
    );
}
