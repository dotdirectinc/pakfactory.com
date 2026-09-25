import Image from 'next/image';
import Link from 'next/link';
import {ArrowRight} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';

import {Icon} from '@/components/ui/icon';

export type ExpertiseHeroProps = {
    eyebrow?: string;
    title: string;
    subhead?: string;
    primaryCta: {label: string; href: string};
    /** In-page link beside the button — `href` is a `#fragment`. */
    secondaryCta?: {label: string; href: string};
    /** Full-width 21:9 picture under the copy. Omit when the body opens on its own imagery. */
    image?: {src: string; alt: string};
};

/**
 * Expertise stage hero (POC `ExpertiseHero`): small-caps eyebrow, display H1,
 * subhead, quote button + in-page text link, then an optional full-bleed
 * picture band. Props-only; the stage page owns the copy and the anchor.
 *
 * Sizes are the POC's rendered pixels (it runs an 18px root; www runs 16px).
 */
export function ExpertiseHero({
    eyebrow,
    title,
    subhead,
    primaryCta,
    secondaryCta,
    image,
}: ExpertiseHeroProps) {
    return (
        <header>
            <PageDielineSection paddingBlock="none" innerClassName="pb-16 pt-22">
                <div className="flex max-w-252 flex-col gap-6">
                    {eyebrow ? (
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            {eyebrow}
                        </p>
                    ) : null}
                    <h1 className="text-[clamp(2.5rem,5.5vw,4.5rem)] font-medium leading-[1.05] tracking-[-0.03em] text-foreground">
                        {title}
                    </h1>
                    {subhead ? (
                        <p className="max-w-190 text-xl leading-9 text-muted-foreground">
                            {subhead}
                        </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-x-8 gap-y-4">
                        <Button asChild size="xl">
                            <Link href={primaryCta.href}>{primaryCta.label}</Link>
                        </Button>
                        {secondaryCta ? (
                            <a
                                href={secondaryCta.href}
                                className="group inline-flex items-center gap-2 text-base font-medium text-foreground underline-offset-4 hover:underline"
                            >
                                {secondaryCta.label}
                                <Icon
                                    icon={ArrowRight}
                                    className="size-4 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none"
                                />
                            </a>
                        ) : null}
                    </div>
                </div>
            </PageDielineSection>
            {image ? (
                <PageDielineSection borderTop paddingBlock="none" flush>
                    <div className="relative aspect-[21/9] w-full overflow-hidden bg-muted">
                        <Image
                            src={image.src}
                            alt={image.alt}
                            fill
                            priority
                            className="object-cover"
                            sizes="(max-width: 1280px) 100vw, 1280px"
                        />
                    </div>
                </PageDielineSection>
            ) : null}
        </header>
    );
}
