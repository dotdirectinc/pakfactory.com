import Link from 'next/link';

import {Button} from '@pakfactory/ui/components/button';
import {
    PageDielineSection,
    type PageDielinePaddingBlock,
} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {
    sectionThemeShell,
    type SectionTheme,
} from '@/lib/ui/section-theme';

/**
 * Former footer collaborate band as a page section. Studio CTAs → General
 * controls theme (colors only), align, paddingBlock, dieline borders, and
 * Button link. Theme does not change type scale or button size.
 */
export function GeneralCta({
    heading,
    body,
    ctaLabel,
    href,
    theme = 'muted',
    align = 'center',
    paddingBlock = 'md',
    borderTop = true,
    borderBottom = true,
    className,
    id,
}: {
    heading: string;
    body?: string;
    ctaLabel: string;
    href: string;
    theme?: SectionTheme;
    align?: 'left' | 'center';
    paddingBlock?: PageDielinePaddingBlock;
    borderTop?: boolean;
    borderBottom?: boolean;
    className?: string;
    id?: string;
}) {
    const shell = sectionThemeShell(theme);
    const inverse = theme === 'inverse';

    // Preserve a line break after "craft" when using the site default copy.
    const headingNode =
        heading === "Let's collaborate and craft your vision" ? (
            <>
                Let&apos;s collaborate and craft <br /> your vision
            </>
        ) : (
            heading
        );

    return (
        <section
            id={id}
            data-section-theme={shell['data-section-theme']}
            className={cn('scroll-mt-20', shell.bandClass, className)}
        >
            <PageDielineSection
                borderTop={borderTop}
                borderBottom={borderBottom}
                paddingBlock={paddingBlock}
            >
                <div
                    className={cn(
                        'flex flex-col gap-6',
                        align === 'center'
                            ? 'mx-auto items-center text-center'
                            : 'items-start text-left',
                    )}
                >
                    <h2
                        className={cn(
                            'text-3xl font-semibold leading-tight tracking-tight sm:text-4xl',
                            inverse ? 'text-background' : 'text-foreground',
                        )}
                    >
                        {headingNode}
                    </h2>
                    {body ? (
                        <p
                            className={cn(
                                'text-base leading-relaxed',
                                inverse
                                    ? 'text-background/75'
                                    : 'text-muted-foreground',
                            )}
                        >
                            {body}
                        </p>
                    ) : null}
                    <Button
                        asChild
                        variant={inverse ? 'outline' : undefined}
                        className={
                            inverse
                                ? 'h-10 border-transparent bg-background px-4 text-sm font-medium text-foreground hover:bg-background/90'
                                : 'h-10 bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90'
                        }
                    >
                        <Link href={href}>{ctaLabel}</Link>
                    </Button>
                </div>
            </PageDielineSection>
        </section>
    );
}
