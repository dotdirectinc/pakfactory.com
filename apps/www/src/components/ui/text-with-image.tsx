import type {ReactNode} from 'react';
import Image from 'next/image';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {SectionHeading} from '@/components/ui/section-heading';
import {
    sectionThemeShell,
    type SectionTheme,
} from '@/lib/ui/section-theme';

type TextWithImageProps = {
    eyebrow?: string;
    title: ReactNode;
    body?: ReactNode;
    cta?: {label: string; href: string};
    image: {src: string; alt: string};
    theme?: SectionTheme;
    id?: string;
    className?: string;
    align?: 'left' | 'center';
    borderTop?: boolean;
    borderBottom?: boolean;
};

/**
 * Generic marketing band — section heading, optional body + CTA, full-width image.
 * Props-only; orientation variants (image left/right) deferred.
 */
export function TextWithImage({
    eyebrow,
    title,
    body,
    cta,
    image,
    theme = 'default',
    id,
    className,
    align = 'left',
    borderTop = false,
    borderBottom = true,
}: TextWithImageProps) {
    if (!image.src.trim()) return null;

    const headingId = id ? `${id}-heading` : 'text-with-image-heading';
    const shell = sectionThemeShell(theme);

    return (
        <section
            id={id}
            aria-labelledby={headingId}
            data-section-theme={shell['data-section-theme']}
            className={cn('scroll-mt-32', shell.bandClass, className)}
        >
            <PageDielineSection
                as="div"
                borderTop={borderTop}
                borderBottom={borderBottom}
                innerClassName="py-16 sm:py-24"
            >
                <SectionHeading
                    eyebrow={eyebrow}
                    title={<span id={headingId}>{title}</span>}
                    titleClassName="max-w-[745px]"
                    description={body}
                    descriptionClassName="max-w-[726px] text-base leading-6"
                    align={align}
                    cta={cta}
                    ctaPlacement="end"
                />
                <div className="relative mt-20 w-full overflow-hidden rounded-xl">
                    <Image
                        src={image.src}
                        alt={image.alt}
                        width={1204}
                        height={484}
                        className="h-auto w-full"
                        sizes="(max-width: 1280px) 100vw, 1200px"
                    />
                </div>
            </PageDielineSection>
        </section>
    );
}
