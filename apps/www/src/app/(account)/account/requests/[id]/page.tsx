import {notFound} from 'next/navigation';
import {AccountRequestDetailView} from '@/components/account/account-request-detail-view';
import {getBuyerRequest} from '@/lib/account/buyer-requests';
import {getProduct} from '@/lib/catalog/catalog';

export const metadata = {
    title: 'Request',
    robots: {index: false, follow: false},
};

export const dynamic = 'force-dynamic';

type AccountRequestDetailPageProps = {
    params: Promise<{id: string}>;
};

export default async function AccountRequestDetailPage({
    params,
}: AccountRequestDetailPageProps) {
    const {id} = await params;
    const request = await getBuyerRequest(id);

    // Not found and not-yours are the same answer on purpose: distinguishing them
    // would confirm that another buyer's request exists.
    if (!request) notFound();

    const uniqueSlugs = [
        ...new Set(
            request.lines
                .map((line) => line.productSlug.trim())
                .filter(Boolean),
        ),
    ];

    const thumbsBySlug: Record<string, string> = {};
    await Promise.all(
        uniqueSlugs.map(async (slug) => {
            try {
                const product = await getProduct(slug);
                const src = product?.media?.[0]?.src?.trim();
                if (src) thumbsBySlug[slug] = src;
            } catch {
                // Catalog miss / network — card shows placeholder.
            }
        }),
    );

    return (
        <AccountRequestDetailView
            request={request}
            thumbsBySlug={thumbsBySlug}
        />
    );
}
