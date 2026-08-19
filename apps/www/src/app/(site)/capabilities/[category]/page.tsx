import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Capability category',
};

export default async function CapabilityCategoryPage({
    params,
}: {
    params: Promise<{ category: string }>;
}) {
    const { category } = await params;
    return (
        <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-semibold">Category: {category}</h1>
            <p className="mt-2 text-muted-foreground">Landing page placeholder.</p>
        </div>
    );
}
