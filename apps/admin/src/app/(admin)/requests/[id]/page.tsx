import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RequestDetailView } from "@/components/requests/request-detail-view";
import { getRequestReadAdapter } from "@/lib/adapters";
import { requireInternalUser } from "@/lib/auth/require-internal-user";

type AdminRequestDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: AdminRequestDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const { account } = await requireInternalUser(`/requests/${id}`);
  const request = await getRequestReadAdapter().getById(id, account.zohoUserId);

  if (!request) {
    return { title: "Request not found" };
  }

  return {
    title: request.draft.ref ?? id,
  };
}

export default async function AdminRequestDetailPage({
  params,
}: AdminRequestDetailPageProps) {
  const { id } = await params;
  const { account } = await requireInternalUser(`/requests/${id}`);
  const request = await getRequestReadAdapter().getById(id, account.zohoUserId);

  if (!request) {
    notFound();
  }

  return <RequestDetailView request={request} />;
}
