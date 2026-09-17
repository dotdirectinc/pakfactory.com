import { AdminPageHeader } from "@/components/layout/admin-page-header";
import { PropertyControlsExplorer } from "@/components/customization-library/property-controls-explorer";

/**
 * Customization Library → Property Controls
 * React port of the draft configurator HTML explorer (catalog + sandbox + rules).
 */
export default function PropertyControlsPage() {
  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        eyebrow="Customization Library"
        title="Property Controls"
      />
      <PropertyControlsExplorer />
    </div>
  );
}
