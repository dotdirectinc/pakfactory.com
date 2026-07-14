import type {ReactNode} from 'react';
import {LISTING_TOP_ID} from '@/components/modules/pagination';
import {AuthorLandingSection} from '@/components/views/author-landing-layout';

type AuthorListingSectionProps = {
    children: ReactNode;
    pagination: ReactNode;
    heading?: string;
};

/** Figma listing band — section heading, post grid, pagination. */
export function AuthorListingSection({
    children,
    pagination,
    heading = 'Posts by this author',
}: AuthorListingSectionProps) {
    return (
        <AuthorLandingSection>
            <section
                aria-labelledby={LISTING_TOP_ID}
                className="flex flex-col gap-8"
            >
                <h2
                    id={LISTING_TOP_ID}
                    className="scroll-mt-24 text-3xl font-semibold tracking-tight text-foreground"
                >
                    {heading}
                </h2>
                <div className="flex flex-col gap-10">{children}</div>
                {pagination && <div className="py-16">{pagination}</div>}
            </section>
        </AuthorLandingSection>
    );
}
