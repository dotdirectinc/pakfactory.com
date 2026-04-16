import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import Link from 'next/link';
import {getPublishedSanityClient, getSanityClient} from '@/sanity/client';
import {isSanityConfigured} from '@/sanity/env';
import {
    CAPABILITY_BY_CATEGORY_AND_SLUG_QUERY,
    CAPABILITY_PATHS_QUERY,
} from '@pakfactory/sanity/queries';

export const revalidate = 60;

type LandingPageRef = {_id: string; title: string; slug: string};

type CollectionRef = {
    _id: string;
    title: string;
    slug: string;
    thumbUrl: string | null;
    thumbAlt: string | null;
    landingPageSlug: string | null;
};

type Capability = {
    _id: string;
    title: string;
    slug: string;
    category: 'material' | 'finish';
    description?: string | null;
    gallery?: {url: string | null; alt?: string | null}[] | null;
    landingPages?: LandingPageRef[];
    collections?: CollectionRef[];
};

type UseCase = {
    key: string;
    title: string;
    href: string;
    thumbUrl: string | null;
    thumbAlt: string | null;
};

async function fetchCapability(
    category: string,
    slug: string,
): Promise<Capability | null> {
    if (!isSanityConfigured()) return null;
    const client = await getSanityClient();
    return client
        .fetch<Capability | null>(CAPABILITY_BY_CATEGORY_AND_SLUG_QUERY, {
            category,
            slug,
        })
        .catch(() => null);
}

export async function generateStaticParams(): Promise<
    {category: string; handle: string}[]
> {
    if (!isSanityConfigured()) return [];
    const client = getPublishedSanityClient();
    const rows = await client
        .fetch<
            {category: string; handle: string}[] | null
        >(CAPABILITY_PATHS_QUERY)
        .catch(() => null);
    return rows ?? [];
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{category: string; handle: string}>;
}): Promise<Metadata> {
    const {category, handle} = await params;
    const capability = await fetchCapability(category, handle);
    if (!capability) return {title: 'Capability'};
    return {title: capability.title};
}

export default async function CapabilityDetailPage({
    params,
}: {
    params: Promise<{category: string; handle: string}>;
}) {
    const {category, handle} = await params;
    const capability = await fetchCapability(category, handle);

    if (!capability) notFound();

    const useCases: UseCase[] = [
        ...(capability.landingPages ?? []).map((p) => ({
            key: `page-${p._id}`,
            title: p.title,
            href: `/products/${p.slug}`,
            thumbUrl: null,
            thumbAlt: null,
        })),
        ...(capability.collections ?? [])
            .filter((c) => c.landingPageSlug)
            .map((c) => ({
                key: `collection-${c._id}`,
                title: c.title,
                href: `/products/${c.landingPageSlug}/${c.slug}`,
                thumbUrl: c.thumbUrl,
                thumbAlt: c.thumbAlt,
            })),
    ];

    return (
        <div className="mx-auto max-w-7xl px-4 pt-8 pb-16 sm:px-6 lg:px-8">
            <nav className="mb-6 text-sm text-muted-foreground">
                <Link href="/capabilities" className="hover:underline">
                    Capabilities
                </Link>
                <span className="mx-2">/</span>
                <Link
                    href={`/capabilities/${capability.category}`}
                    className="hover:underline capitalize"
                >
                    {capability.category}
                </Link>
                <span className="mx-2">/</span>
                <span>{capability.title}</span>
            </nav>

            {(() => {
                const g = capability.gallery ?? [];
                const slot = (i: number) =>
                    g[i]?.url
                        ? {
                              url: g[i].url as string,
                              alt: g[i].alt ?? capability.title,
                          }
                        : null;
                const Slot = ({
                    i,
                    className,
                }: {
                    i: number;
                    className: string;
                }) => {
                    const img = slot(i);
                    return (
                        <div
                            className={`overflow-hidden rounded-xl bg-neutral-300 dark:bg-neutral-700 ${className}`}
                        >
                            {img ? (
                                <img
                                    src={img.url}
                                    alt={img.alt}
                                    className="block h-full w-full object-cover"
                                />
                            ) : null}
                        </div>
                    );
                };
                return (
                    <div className="mb-8 grid grid-cols-1 gap-4 sm:aspect-2/1 sm:grid-cols-3">
                        <Slot
                            i={0}
                            className="aspect-4/3 sm:col-span-2 sm:aspect-auto sm:h-full"
                        />
                        <div className="flex flex-col gap-4 sm:h-full">
                            <Slot
                                i={1}
                                className="aspect-4/3 sm:aspect-auto sm:min-h-0 sm:flex-1"
                            />
                            <Slot
                                i={2}
                                className="aspect-4/3 sm:aspect-auto sm:min-h-0 sm:flex-1"
                            />
                        </div>
                    </div>
                );
            })()}

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                    <p className="text-sm uppercase tracking-wide text-muted-foreground">
                        {capability.category}
                    </p>
                    <h1 className="text-3xl font-semibold sm:text-4xl">
                        {capability.title}
                    </h1>
                    {capability.description ? (
                        <p className="text-muted-foreground max-w-3xl whitespace-pre-line">
                            {capability.description}
                        </p>
                    ) : null}
                </div>

                {useCases.length > 0 ? (
                    <aside className="rounded-xl border p-6">
                        <h2 className="text-lg font-semibold">
                            {capability.title} Can Be Used For:
                        </h2>
                        <div className="mt-4 flex flex-wrap gap-3">
                            {useCases.map((uc) => (
                                <Link
                                    key={uc.key}
                                    href={uc.href}
                                    className="group flex w-[104px] flex-col gap-2"
                                >
                                    <div className="aspect-square overflow-hidden rounded-lg bg-neutral-300 dark:bg-neutral-700">
                                        {uc.thumbUrl ? (
                                            <img
                                                src={uc.thumbUrl}
                                                alt={uc.thumbAlt ?? uc.title}
                                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center text-[10px] text-neutral-600 dark:text-neutral-300">
                                                No image
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-center text-xs font-medium group-hover:underline">
                                        {uc.title}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </aside>
                ) : null}
            </div>
        </div>
    );
}
