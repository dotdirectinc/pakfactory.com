import {
    CapabilityCard,
    type CapabilityCardItem,
} from '@/components/capability/capability-card';

type CapabilityCatalogListProps = {
    items: CapabilityCardItem[];
};

export function CapabilityCatalogList({items}: CapabilityCatalogListProps) {
    if (items.length === 0) {
        return (
            <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
                No capabilities in this category yet.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {items.map((item) => (
                <CapabilityCard key={item._id} item={item} />
            ))}
        </div>
    );
}
