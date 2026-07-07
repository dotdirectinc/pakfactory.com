import Link from 'next/link';
import {Button} from '@pakfactory/ui/components/button';
import {
    Card,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@pakfactory/ui/components/card';
import type {CtaRfqBlock, BlockProps} from '@/components/blocks/registry';

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
export function CtaRfq({heading, body, ctaHref}: BlockProps<CtaRfqBlock>) {
    return (
        <section aria-labelledby="cta-rfq-heading">
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
                        <Link href={ctaHref ?? defaultQuoteHref()}>
                            Get a quote
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </section>
    );
}
