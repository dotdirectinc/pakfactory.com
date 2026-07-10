import Link from 'next/link';
import Image from 'next/image';
import {Button} from '@pakfactory/ui/components/button';
// import {FooterWordmark} from '@/components/layout/footer-wordmark';
import {PageDielineSection} from '@/components/layout/page-dieline-section';
import {
    SocialPlatformIcon,
    socialPlatformAriaLabel,
} from '@/components/modules/social-platform-icon';
import {
    getFallbackFooterBuilder,
    getFallbackFooterColumns,
    type BlogAiEngine,
    type BlogAiLink,
    type BlogFooterColumns,
    type BlogFooterCtaAlign,
    type BlogFooterCtaBlock,
    type BlogFooterLink,
    type BlogFooterSection,
    type BlogSocialLink,
} from '@/lib/blog-footer-nav';
import {
    FOOTER_CTA_DIELINE_BORDER_DEFAULTS,
    resolveDielineBorders,
} from '@/lib/dieline-borders';
import {externalLinkAttributes, EXTERNAL_LINK_REL} from '@/lib/external-link';

const AI_ICON_SRC: Record<BlogAiEngine, string> = {
    chatgpt: '/logos/ai/openai.svg',
    gemini: '/logos/ai/gemini.svg',
    perplexity: '/logos/ai/perplexity.svg',
    claude: '/logos/ai/claude.svg',
    grok: '/logos/ai/grok.svg',
};

const AI_LABELS: Record<BlogAiEngine, string> = {
    chatgpt: 'ChatGPT',
    gemini: 'Gemini',
    perplexity: 'Perplexity',
    claude: 'Claude',
    grok: 'Grok',
};

const ALIGN_TEXT_CLASS: Record<BlogFooterCtaAlign, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
};

const ALIGN_JUSTIFY_CLASS: Record<BlogFooterCtaAlign, string> = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
};

function FooterLinkItem({link}: {link: BlogFooterLink}) {
    const className =
        'block text-base font-normal leading-6 text-muted-foreground transition-colors hover:text-foreground';

    if (link.external) {
        return (
            <a
                href={link.href}
                className={className}
                {...externalLinkAttributes(link.href)}
            >
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

function FooterSectionBlock({section}: {section: BlogFooterSection}) {
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

function FooterCtaBlock({block}: {block: BlogFooterCtaBlock}) {
    const {borderTop, borderBottom} = resolveDielineBorders(
        block.showTopBorder,
        block.showBottomBorder,
        FOOTER_CTA_DIELINE_BORDER_DEFAULTS,
    );
    const borderClasses = [
        borderTop ? 'border-t border-dashed border-foreground/10' : '',
        borderBottom ? 'border-b border-dashed border-foreground/10' : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div
            className={`${borderClasses} px-8 py-16 ${ALIGN_TEXT_CLASS[block.align]}`}
        >
            <h2 className="whitespace-pre-line text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
                {block.message}
            </h2>
            <div
                className={`mt-6 flex ${ALIGN_JUSTIFY_CLASS[block.align]}`}
            >
                <Button
                    className="h-10 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    asChild
                >
                    {block.external ? (
                        <a
                            href={block.href}
                            {...externalLinkAttributes(block.href)}
                        >
                            {block.buttonLabel}
                        </a>
                    ) : (
                        <Link href={block.href}>{block.buttonLabel}</Link>
                    )}
                </Button>
            </div>
        </div>
    );
}

type SiteFooterProps = {
    columns?: BlogFooterColumns;
    social?: BlogSocialLink[];
    aiLinks?: BlogAiLink[];
    builder?: BlogFooterCtaBlock[];
};

function FooterSocialIcon({link}: {link: BlogSocialLink}) {
    return (
        <a
            href={link.url}
            aria-label={socialPlatformAriaLabel(link.platform)}
            target="_blank"
            rel={EXTERNAL_LINK_REL}
            className="text-foreground hover:opacity-80"
        >
            <SocialPlatformIcon platform={link.platform} size={20} />
        </a>
    );
}

function FooterAiIcon({link}: {link: BlogAiLink}) {
    const src = AI_ICON_SRC[link.engine];
    if (!src) return null;

    return (
        <a
            href={link.url}
            aria-label={`Ask ${AI_LABELS[link.engine]} about PakFactory`}
            target="_blank"
            rel={EXTERNAL_LINK_REL}
            className="hover:opacity-80"
        >
            <Image
                src={src}
                alt=""
                width={16}
                height={16}
                className="size-4"
                aria-hidden
            />
        </a>
    );
}

export function SiteFooter({
    columns,
    social = [],
    aiLinks = [],
    builder,
}: SiteFooterProps) {
    const footerColumns =
        columns && columns.length > 0 ? columns : getFallbackFooterColumns();
    const footerBuilder =
        builder && builder.length > 0 ? builder : getFallbackFooterBuilder();

    return (
        <footer className="bg-background">
            <PageDielineSection innerClassName="px-0">
                {/* Giant wordmark */}
                {/* <FooterWordmark /> */}

                {/* Footer blocks (above navigation) */}
                {footerBuilder.map((block) => (
                    <FooterCtaBlock key={block.key} block={block} />
                ))}

                {/* Link columns */}
                <div className="grid grid-cols-1 gap-0 border-t border-dashed border-border md:grid-cols-3">
                    {footerColumns.map((column, colIdx) => (
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

                {/* Bottom bar — copyright + social */}
                <div className="border-t border-dashed border-foreground/10">
                    <div className="flex flex-wrap items-center justify-between gap-y-3 px-8 py-8">
                        <p className="min-w-[200px] flex-1 text-base font-medium text-foreground">
                            © 2026 PakFactory
                        </p>
                        <div className="flex items-center gap-11 text-foreground">
                            {social.map((link) => (
                                <FooterSocialIcon
                                    key={link.platform}
                                    link={link}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom bar — AI answer links */}
                <div className="border-t border-dashed border-foreground/10">
                    <div className="flex flex-wrap items-center justify-between gap-y-3 px-8 py-8">
                        <div className="flex flex-wrap items-center gap-6">
                            <p className="text-sm text-muted-foreground">
                                See what AI says about PakFactory
                            </p>
                            <div className="flex h-4 items-center gap-3">
                                {aiLinks.map((link) => (
                                    <FooterAiIcon
                                        key={link.engine}
                                        link={link}
                                    />
                                ))}
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            © 2026 PakFactory. All Rights Reserved
                        </p>
                    </div>
                </div>
            </PageDielineSection>
        </footer>
    );
}
