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
 * scrim. Props-only (ADR-013). The expertise stage page renders Studio
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
                <div className="relative isolate overflow-hidden rounded-lg bg-foreground text-background lg:aspect-[16/9]">
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
                                className="absolute inset-0 -z-10 bg-gradient-to-r from-foreground/80 via-foreground/50 to-transparent"
                            />
                        </>
                    ) : null}
                    <div className="flex h-full max-w-xl flex-col justify-center gap-6 p-8 sm:p-12 lg:p-16">
                        <h2 className="text-3xl font-semibold leading-tight">
                            {heading}
                        </h2>
                        {body ? (
                            <p className="text-base leading-7 text-background/80">
                                {body}
                            </p>
                        ) : null}
                        {cta ? (
                            <div>
                                <Button asChild size="lg" variant="secondary">
                                    <Link href={cta.href}>{cta.label}</Link>
                                </Button>
                            </div>
                        ) : null}
                    </div>
                </div>
            </PageDielineSection>
        </section>
    );
}
