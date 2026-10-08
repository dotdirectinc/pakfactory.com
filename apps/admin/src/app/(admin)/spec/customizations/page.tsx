import { redirect } from "next/navigation";

/** Retired tree (2026-10-08): customization options are a Catalog table now. Old links land there. */
export default function SpecCustomizationsPage() {
  redirect("/spec/catalog?group=customizations&level=customizationOption");
}
