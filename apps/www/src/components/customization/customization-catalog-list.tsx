import {
    CustomizationCard,
    type CustomizationCardData,
} from '@/components/customization/customization-card';

type CustomizationCatalogListProps = {
    items: CustomizationCardData[];
    emptyMessage?: string;
};

export function CustomizationCatalogList({
    items,
    emptyMessage = 'No customizations match these filters. Reset or broaden search.',
}: CustomizationCatalogListProps) {
    if (items.length === 0) {
        return (
            <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
                <div key={item._id} className="min-h-0 h-full">
                    <CustomizationCard item={item} />
                </div>
            ))}
        </div>
    );
}
