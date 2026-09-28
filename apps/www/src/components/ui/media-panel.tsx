import Image from 'next/image';
import Link from 'next/link';
import {Button} from '@pakfactory/ui/components/button';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

type MediaPanelProps = {
    heading: string;
    body?: string;
    cta?: {label: string; href: string};
    /** Background image. Absent → a solid foreground panel (same layout). */
    image?: {src: string; alt: string};
    id?: string;
    borderTop?: boolean;
    borderBottom?: boolean;
    className?: string;
};

/**
 * Media panel — one rounded full-width panel, copy set over the image on a
 * scrim; pulls back from full-bleed as it scrolls in (POC engagement banner). Props-only (ADR-013). The expertise stage page renders Studio
 * `mediaFeature` with it ("It starts with a conversation…"); elsewhere
 * `mediaFeature` stays `TextWithImage`.
 */
export function MediaPanel({
    heading,
    body,
    cta,
    image,
    id,
    borderTop = false,
    borderBottom = false,
    className,
}: MediaPanelProps) {
    return (
        <section id={id} className={cn('scroll-mt-32', className)}>
            <PageDielineSection
                as="div"
                borderTop={borderTop}
                borderBottom={borderBottom}
                paddingBlock="md"
            >
                {/* Pullback (POC parity): the panel enters full-bleed across the
                    dieline column and pulls back to the gutter while its corners
                    round in — scroll-driven CSS (`motion-pullback` / `motion-unround`
                    in globals.css); no support or reduced motion = settled. */}
                <div className="motion-pullback -mx-layout-gutter-inner px-layout-gutter-inner">
                    <div className="motion-unround relative isolate flex overflow-hidden rounded-2xl bg-foreground text-background sm:min-h-200 sm:items-center">
                        {image ? (
                            <>
                                <Image
                                    src={image.src}
                                    alt={image.alt}
                                    fill
                                    className="-z-10 object-cover"
                                    sizes="(max-width: 1280px) 100vw, 1280px"
                                />
                                <span
                                    aria-hidden
                                    className="absolute inset-0 -z-10 bg-gradient-to-r from-foreground/80 via-foreground/50 to-foreground/10"
                                />
                            </>
                        ) : null}
                        <div className="flex max-w-xl flex-col gap-6 p-8 sm:p-12 lg:p-16">
                            <h2 className="text-2xl font-medium leading-tight tracking-[-0.01em] sm:text-3xl">
                                {heading}
                            </h2>
                            {body ? (
                                <p className="text-lg leading-8 text-background/85">
                                    {body}
                                </p>
                            ) : null}
                            {cta ? (
                                <div>
                                    {/* `outline`: the default variant's colours are pinned by a
                                        global [data-variant=default] rule. */}
                                    <Button
                                        asChild
                                        size="xl"
                                        variant="outline"
                                        className="mt-2 border-transparent bg-background text-foreground hover:bg-background/90"
                                    >
                                        <Link href={cta.href}>{cta.label}</Link>
                                    </Button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </PageDielineSection>
        </section>
    );
}
