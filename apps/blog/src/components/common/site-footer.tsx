import Link from 'next/link';
import {MessageSquareText} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {FooterWordmark} from '@/components/common/footer-wordmark';
import {PageDielineSection} from '@/components/common/page-dieline-section';
import {categoryHref} from '@/lib/blog-post-url';
import {getWwwUrl} from '@/lib/site';

const WWW = getWwwUrl();

const BLOG_CATEGORIES = [
    {slug: 'packaging-news', label: 'Packaging News'},
    {slug: 'trends', label: 'Trends'},
    {slug: 'business-strategy', label: 'Business Strategy'},
    {slug: 'sustainability', label: 'Sustainability'},
    {slug: 'design-inspiration', label: 'Design Inspiration'},
] as const;

type FooterLink = {label: string; href: string; external?: boolean};

type FooterSection = {
    title: string;
    links: FooterLink[];
};

const FOOTER_COLUMNS: FooterSection[][] = [
    [
        {
            title: 'Browse the Blog',
            links: BLOG_CATEGORIES.map(({slug, label}) => ({
                label,
                href: categoryHref(slug),
            })),
        },
        {
            title: 'Explore PakFactory',
            links: [
                {label: 'About', href: `${WWW}/about`, external: true},
                {
                    label: 'Case Studies',
                    href: `${WWW}/case-studies`,
                    external: true,
                },
                {label: 'Resources', href: `${WWW}/resources`, external: true},
                {label: 'Get a Quote', href: `${WWW}/contact`, external: true},
                {label: 'Contribute to the Blog', href: '/contribute'},
            ],
        },
    ],
    [
        {
            title: 'Capabilities',
            links: [
                {
                    label: 'Rigid Boxes',
                    href: `${WWW}/capabilities`,
                    external: true,
                },
                {
                    label: 'Folding Cartons',
                    href: `${WWW}/capabilities`,
                    external: true,
                },
                {
                    label: 'Custom Pouches',
                    href: `${WWW}/capabilities`,
                    external: true,
                },
                {
                    label: 'Labels & Stickers',
                    href: `${WWW}/capabilities`,
                    external: true,
                },
                {
                    label: 'View All',
                    href: `${WWW}/capabilities`,
                    external: true,
                },
            ],
        },
    ],
    [
        {
            title: 'Our Services',
            links: [
                {
                    label: 'Packaging Strategy',
                    href: `${WWW}/solutions`,
                    external: true,
                },
                {
                    label: 'Packaging Design',
                    href: `${WWW}/solutions`,
                    external: true,
                },
                {
                    label: 'Prototyping',
                    href: `${WWW}/solutions`,
                    external: true,
                },
                {
                    label: 'Managed Manufacturing',
                    href: `${WWW}/solutions`,
                    external: true,
                },
                {label: 'Logistics', href: `${WWW}/solutions`, external: true},
                {
                    label: 'Packaging Fulfillment',
                    href: `${WWW}/solutions`,
                    external: true,
                },
                {label: 'View All', href: `${WWW}/solutions`, external: true},
            ],
        },
    ],
];

function FooterLinkItem({link}: {link: FooterLink}) {
    const className =
        'block text-base font-normal leading-6 text-muted-foreground transition-colors hover:text-foreground';

    if (link.external) {
        return (
            <a href={link.href} className={className}>
                {link.label}
            </a>
        );
    }

    return (
        <Link href={link.href} className={className}>
            {link.label}
        </Link>
    );
}

function FooterSectionBlock({section}: {section: FooterSection}) {
    return (
        <div className="flex min-w-[200px] flex-1 flex-col gap-3">
            <p className="pb-2 text-lg font-medium leading-7 text-foreground">
                {section.title}
            </p>
            <ul className="flex flex-col gap-3">
                {section.links.map((link) => (
                    <li key={`${section.title}-${link.label}`}>
                        <FooterLinkItem link={link} />
                    </li>
                ))}
            </ul>
        </div>
    );
}

export function SiteFooter() {
    const talkHref = `${WWW}/contact`;

    return (
        <footer className="bg-background">
            <PageDielineSection innerClassName="px-0">
                {/* Giant wordmark */}
                <FooterWordmark />

                {/* Collaboration CTA */}
                <div className="border-t border-dashed border-border px-8 py-10 text-center">
                    <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
                        Let&apos;s collaborate
                        <br />
                        and craft your vision
                    </h2>
                    <Button
                        className="mt-6 h-10 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                        asChild
                    >
                        <a href={talkHref}>
                            Let&apos;s talk
                            <span className="ml-2 inline-flex size-5 items-center justify-center rounded-full bg-background text-primary">
                                <MessageSquareText
                                    className="size-3"
                                    strokeWidth={2}
                                />
                            </span>
                        </a>
                    </Button>
                </div>

                {/* Link columns */}
                <div className="grid grid-cols-1 gap-0 border-t border-dashed border-border md:grid-cols-3">
                    {FOOTER_COLUMNS.map((column, colIdx) => (
                        <div
                            key={colIdx}
                            className="flex flex-col gap-16 border-dashed border-border px-8 py-16 md:border-r md:last:border-r-0"
                        >
                            {column.map((section) => (
                                <FooterSectionBlock
                                    key={section.title}
                                    section={section}
                                />
                            ))}
                        </div>
                    ))}
                </div>

                {/* Bottom bar */}
                <div className="border-t border-dashed border-foreground/10">
                    <div className="flex flex-wrap items-center justify-between gap-y-3 px-8 py-8">
                        <p className="min-w-[200px] flex-1 text-base font-medium text-foreground">
                            © 2026 PakFactory
                        </p>
                        <div className="flex items-center gap-11 text-foreground">
                            <a
                                href="https://www.facebook.com/pakfactory"
                                aria-label="Facebook"
                                className="text-foreground hover:opacity-80"
                            >
                                <svg
                                    className="size-5"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.75"
                                    aria-hidden
                                >
                                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                                </svg>
                            </a>
                            <a
                                href="https://www.instagram.com/pakfactory"
                                aria-label="Instagram"
                                className="text-foreground hover:opacity-80"
                            >
                                <svg
                                    className="size-5"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.75"
                                    aria-hidden
                                >
                                    <rect
                                        x="2"
                                        y="2"
                                        width="20"
                                        height="20"
                                        rx="5"
                                        ry="5"
                                    />
                                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                                    <line
                                        x1="17.5"
                                        y1="6.5"
                                        x2="17.51"
                                        y2="6.5"
                                    />
                                </svg>
                            </a>
                            <a
                                href="https://x.com/pakfactory"
                                aria-label="X"
                                className="text-foreground hover:opacity-80"
                            >
                                <span className="sr-only">X</span>
                                <svg
                                    className="size-5"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    aria-hidden
                                >
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                            </a>
                            <a
                                href="https://www.linkedin.com/company/pakfactory"
                                aria-label="LinkedIn"
                                className="text-foreground hover:opacity-80"
                            >
                                <svg
                                    className="size-5"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.75"
                                    aria-hidden
                                >
                                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                                    <rect x="2" y="9" width="4" height="12" />
                                    <circle cx="4" cy="4" r="2" />
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>
            </PageDielineSection>
        </footer>
    );
}
