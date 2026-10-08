import { redirect } from "next/navigation";

/** Retired list (2026-10-08): standard and inspiration products are Catalog tables now. Old links land there. */
export default async function SpecProductsPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const inspiration = (await searchParams).kind === "inspiration";
  redirect(inspiration ? "/spec/catalog?group=solutions&level=inspiration" : "/spec/catalog?group=products&level=product");
}
