import {comingSoonMetadata} from '@/components/common/coming-soon-page';

export const metadata = comingSoonMetadata('Request');

type AccountRequestDetailPageProps = {
    params: Promise<{id: string}>;
};

export default async function AccountRequestDetailPage({
    params,
}: AccountRequestDetailPageProps) {
    const {id} = await params;

    return (
        <div className="mx-auto max-w-2xl">
            <h1 className="text-3xl font-bold tracking-tight">Request</h1>
            <p className="mt-4 text-muted-foreground">
                Reserved detail page for request{' '}
                <span className="font-medium text-foreground">{id}</span>.
                Content is coming soon.
            </p>
        </div>
    );
}
