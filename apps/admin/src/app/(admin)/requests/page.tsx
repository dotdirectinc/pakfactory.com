import { RequestList } from "@/components/requests/request-list";
import { getRequestReadAdapter } from "@/lib/adapters";
import { requireInternalUser } from "@/lib/auth/require-internal-user";
import { ADMIN_REQUESTS_COPY } from "@/lib/copy/requests";

export const metadata = {
  title: "Requests",
};

export default async function AdminRequestsPage() {
  const { account } = await requireInternalUser("/requests");
  const requests = await getRequestReadAdapter().listForSalesMember(
    account.zohoUserId,
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">
        {ADMIN_REQUESTS_COPY.listTitle}
      </h1>
      <RequestList requests={requests} />
    </div>
  );
}
