import { AdminPageHeader } from "@/components/layout/admin-page-header";
import { ControlGallery } from "@/components/customization-library/control-gallery";

export const metadata = { title: "Control gallery" };

/**
 * Customization Library → Control gallery (PROD-2614). Formerly Property Controls: its rule
 * sandbox moved to Spec System → Products, backed by Sanity and the shared rules package.
 */
export default function PropertyControlsPage() {
  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader eyebrow="Customization Library" title="Control gallery" />
      <ControlGallery />
    </div>
  );
}
