import {notFound} from 'next/navigation';

/**
 * Customization categories are filters on `/customizations`, not pages
 * (PROD-2848). The `{category}` segment exists so option URLs
 * `/customizations/{category}/{option}` keep working.
 */
export default async function CustomizationCategoryPage() {
    notFound();
}
