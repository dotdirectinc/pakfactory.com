import { redirect } from "next/navigation";

/**
 * Retired list (2026-10-08): property values are Catalog tables now, one per stream. The option
 * stream's table carries where each property is declared, which this page used to show.
 */
export default function SpecPropertiesPage() {
  redirect("/spec/catalog?group=customizations&level=optionValue");
}
