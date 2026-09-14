import Link from 'next/link';
import type {BuyerRequestSummary} from '@/lib/account/buyer-requests';
import {Badge} from '@pakfactory/ui/components/badge';
import {ACCOUNT_COPY} from '@/lib/copy/account';
import {accountRequestHref} from '@/lib/www-routes';

function formatSubmittedAt(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return ACCOUNT_COPY.briefNotSet;
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

export function AccountRequestList({
    requests,
}: {
    requests: BuyerRequestSummary[];
}) {
    return (
        <div className="overflow-hidden rounded-lg border border-border bg-background">
            <div className="overflow-x-auto">
                <table className="w-full min-w-160 border-collapse text-sm">
                    <thead>
                        <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                            <th className="px-4 py-2 font-medium">
                                {ACCOUNT_COPY.listColRequest}
                            </th>
                            <th className="px-4 py-2 font-medium">
                                {ACCOUNT_COPY.listColSummary}
                            </th>
                            <th className="px-4 py-2 font-medium">
                                {ACCOUNT_COPY.listColRfq}
                            </th>
                            <th className="px-4 py-2 text-right font-medium tabular-nums">
                                {ACCOUNT_COPY.listColItems}
                            </th>
                            <th className="px-4 py-2 font-medium">
                                {ACCOUNT_COPY.listColStatus}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.map((request) => {
                            const href = accountRequestHref(request.id);
                            return (
                                <tr
                                    key={request.id}
                                    className="border-b border-border last:border-b-0 transition-colors hover:bg-muted/50"
                                >
                                    <td className="px-4 py-2">
                                        <Link href={href} className="block min-w-0">
                                            <span className="block truncate font-medium text-foreground">
                                                {request.title}
                                            </span>
                                            <span className="block text-xs text-muted-foreground tabular-nums">
                                                {formatSubmittedAt(
                                                    request.submittedAt,
                                                )}
                                            </span>
                                        </Link>
                                    </td>
                                    <td className="px-4 py-2 text-muted-foreground">
                                        <Link
                                            href={href}
                                            className="block max-w-sm truncate"
                                        >
                                            {request.summary}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
                                        <Link href={href} className="block">
                                            {request.reference}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                                        <Link href={href} className="block">
                                            {request.itemCount}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-2">
                                        <Link href={href} className="inline-flex">
                                            <Badge
                                                variant="secondary"
                                                className="rounded-md font-normal"
                                            >
                                                {ACCOUNT_COPY.statusPending}
                                            </Badge>
                                        </Link>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
