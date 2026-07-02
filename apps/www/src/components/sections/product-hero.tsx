// Source: shadcn-studio (hero-section-01)
import Link from 'next/link';
import {ArrowRightIcon} from 'lucide-react';

import {Badge} from '@pakfactory/ui/components/badge';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';

export type HeroSectionProps = {
    badgeLabel: string;
    badgeCaption: string;
    headline: string;
    description: string;
    ctaLabel: string;
    ctaHref: string;
    className?: string;
};

const HeroSection = ({
    badgeLabel,
    badgeCaption,
    headline,
    description,
    ctaLabel,
    ctaHref,
    className,
}: HeroSectionProps) => {
    return (
        <section
            className={cn('border-border/60 bg-muted/80 border-b', className)}
        >
            <div className=" mx-auto max-w-7xl flex flex-col gap-8 px-6 py-16 md:py-24">
                <div className="flex flex-col gap-4">
                    <h1 className="text-foreground text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                        {headline}
                    </h1>
                    <p className="text-muted-foreground max-w-2xl text-lg leading-relaxed md:text-xl">
                        {description}
                    </p>
                </div>

                <div>
                    <Button asChild size="lg">
                        <Link href={ctaHref} className="gap-2">
                            {ctaLabel}
                            <ArrowRightIcon className="size-4" />
                        </Link>
                    </Button>
                </div>
            </div>
        </section>
    );
};

export default HeroSection;
