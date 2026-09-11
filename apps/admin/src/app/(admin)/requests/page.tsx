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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <h1 className="text-[clamp(2rem,5vw,3rem)] font-medium leading-none tracking-tight text-foreground">
        {ADMIN_REQUESTS_COPY.listTitle}
      </h1>

      <RequestList requests={requests} />
    </div>
  );
}
