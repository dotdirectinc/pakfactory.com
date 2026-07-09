import Link from 'next/link';
import {Button} from '@pakfactory/ui/components/button';
import {
    Card,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@pakfactory/ui/components/card';
import {cn} from '@pakfactory/ui/lib/utils';
import type {CtaRfqBlock, BlockProps} from '@/components/blocks/registry';
import {
    CTA_RFQ_DIELINE_BORDER_DEFAULTS,
    resolveDielineBorders,
} from '@/lib/dieline-borders';
import { externalLinkAttributes } from '@/lib/external-link';

const DEFAULT_HEADING = 'Need custom packaging?';
const DEFAULT_BODY =
    'Talk to PakFactory packaging experts for quotes, specs, and production guidance.';

function defaultQuoteHref(): string {
    const www = process.env.NEXT_PUBLIC_WWW_URL?.replace(/\/$/, '');
    return www ? `${www}/contact` : 'https://www.pakfactory.com/contact';
}

/**
 * `ctaRfq` page-builder section — quote / RFQ consultative CTA. Heading, body, and
 * button URL are optional and fall back to PakFactory defaults.
 */
export function CtaRfq({
    heading,
    body,
    ctaHref,
    showTopBorder,
    showBottomBorder,
}: BlockProps<CtaRfqBlock>) {
    const {borderTop, borderBottom} = resolveDielineBorders(
        showTopBorder,
        showBottomBorder,
        CTA_RFQ_DIELINE_BORDER_DEFAULTS,
    );
    const hasBorder = borderTop || borderBottom;

    return (
        <section
            aria-labelledby="cta-rfq-heading"
            className={cn(
                hasBorder && '-mx-8 px-8',
                borderTop && 'border-t border-dashed border-border',
                borderBottom && 'border-b border-dashed border-border',
            )}
        >
            <Card className="bg-muted/30 text-center">
                <CardHeader className="items-center text-center">
                    <CardTitle id="cta-rfq-heading" className="text-xl">
                        {heading ?? DEFAULT_HEADING}
                    </CardTitle>
                    <CardDescription className="mx-auto max-w-md">
                        {body ?? DEFAULT_BODY}
                    </CardDescription>
                </CardHeader>
                <CardFooter className="justify-center pt-0">
                    <Button asChild>
                        <Link
                            href={ctaHref ?? defaultQuoteHref()}
                            {...externalLinkAttributes(ctaHref ?? defaultQuoteHref())}
                        >
                            Get a quote
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </section>
    );
}
