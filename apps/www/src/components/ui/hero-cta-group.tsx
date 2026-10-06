import Link from 'next/link';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';

import type {HeroCta} from '@/lib/sections/map-hero';

export type HeroTone = 'default' | 'inverse';

type HeroCtaGroupProps = {
    primary?: HeroCta;
    secondary?: HeroCta;
    /** `inverse` = light text on a photo / dark band (full-bleed hero). */
    tone?: HeroTone;
    className?: string;
};

/**
 * Hero button pair with an optional one-line note under each (PROD-2666).
 * Props-only. Stock `Button` sizes/variants; inverse mirrors the GeneralCta
 * inverse treatment rather than inventing new chrome.
 */
export function HeroCtaGroup({
    primary,
    secondary,
    tone = 'default',
    className,
}: HeroCtaGroupProps) {
    if (!primary && !secondary) return null;
    return (
        <div
            className={cn(
                'flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start',
                className,
            )}
        >
            {primary ? (
                <HeroCtaItem cta={primary} emphasis="primary" tone={tone} />
            ) : null}
            {secondary ? (
                <HeroCtaItem cta={secondary} emphasis="secondary" tone={tone} />
            ) : null}
        </div>
    );
}

function HeroCtaItem({
    cta,
    emphasis,
    tone,
}: {
    cta: HeroCta;
    emphasis: 'primary' | 'secondary';
    tone: HeroTone;
}) {
    const inverse = tone === 'inverse';
    const primary = emphasis === 'primary';
    return (
        <div className="flex flex-col gap-2">
            <Button
                asChild
                size="xl"
                variant={primary ? 'default' : 'outline'}
                className={cn(
                    'cursor-pointer',
                    inverse &&
                        primary &&
                        'border-transparent bg-background text-foreground hover:bg-background/90',
                    inverse &&
                        !primary &&
                        'border-background/40 bg-transparent text-background shadow-none hover:bg-background/10 hover:text-background',
                )}
            >
                <Link href={cta.href}>{cta.label}</Link>
            </Button>
            {cta.note ? (
                <p
                    className={cn(
                        'text-sm',
                        inverse ? 'text-background/75' : 'text-muted-foreground',
                    )}
                >
                    {cta.note}
                </p>
            ) : null}
        </div>
    );
}
