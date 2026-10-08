import { redirect } from "next/navigation";

/** Retired tree (2026-10-08): solutions are a Catalog table now. Old links land there. */
export default function SpecSolutionsPage() {
  redirect("/spec/catalog?group=solutions&level=solution");
}
