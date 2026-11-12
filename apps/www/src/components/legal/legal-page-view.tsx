import {
    PortableText,
    type PortableTextComponents,
} from '@portabletext/react';
import type {PortableTextBlock} from '@portabletext/types';
import type {LegalPageDoc} from '@pakfactory/sanity/queries';
import {formatDateTime} from '@pakfactory/utilities/date-time';
import {externalLinkAttributes} from '@pakfactory/utilities/external-link';
import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {StaticPageBody} from '@/components/common/static-page-body';
import {WWW_ROUTES} from '@/lib/www-routes';

const LEGAL_BODY_COMPONENTS: PortableTextComponents = {
    block: {
        h2: ({children}) => (
            <h2 className="mt-10 text-2xl font-semibold tracking-tight text-foreground">
                {children}
            </h2>
        ),
        h3: ({children}) => (
            <h3 className="mt-8 text-xl font-semibold tracking-tight text-foreground">
                {children}
            </h3>
        ),
        h4: ({children}) => (
            <h4 className="mt-6 text-lg font-semibold text-foreground">
                {children}
            </h4>
        ),
        normal: ({children}) => (
            <p className="mt-4 text-base leading-7 text-foreground">{children}</p>
        ),
        blockquote: ({children}) => (
            <blockquote className="mt-4 border-l-2 border-border pl-4 text-muted-foreground">
                {children}
            </blockquote>
        ),
    },
    list: {
        bullet: ({children}) => (
            <ul className="mt-4 list-disc space-y-2 pl-6 text-base leading-7">
                {children}
            </ul>
        ),
        number: ({children}) => (
            <ol className="mt-4 list-decimal space-y-2 pl-6 text-base leading-7">
                {children}
            </ol>
        ),
    },
    marks: {
        strong: ({children}) => (
            <strong className="font-semibold">{children}</strong>
        ),
        em: ({children}) => <em>{children}</em>,
        link: ({value, children}) => {
            const href: string = value?.href ?? '';
            if (!href) return <>{children}</>;
            return (
                <a
                    href={href}
                    className="font-medium underline underline-offset-4 hover:no-underline"
                    {...externalLinkAttributes(href)}
                >
                    {children}
                </a>
            );
        },
    },
};

type LegalPageViewProps = {
    page: LegalPageDoc;
};

export function LegalPageView({page}: LegalPageViewProps) {
    const title = page.title?.trim() || 'Policy';
    const lastUpdated = page.lastUpdated?.trim();
    const body = (page.body ?? []) as PortableTextBlock[];

    return (
        <main className="min-h-screen bg-background">
            <PageBreadcrumbSection
                items={[
                    {label: 'Home', href: WWW_ROUTES.home},
                    {label: 'Policies', href: WWW_ROUTES.policies},
                    {label: title},
                ]}
            />
            <PageHeadingSection
                title={title}
                description={
                    lastUpdated
                        ? `Last updated ${formatDateTime(lastUpdated, 'longDate')}`
                        : undefined
                }
            />
            {body.length > 0 ? (
                <StaticPageBody as="section">
                    <article>
                        <PortableText
                            value={body}
                            components={LEGAL_BODY_COMPONENTS}
                        />
                    </article>
                </StaticPageBody>
            ) : null}
        </main>
    );
}
