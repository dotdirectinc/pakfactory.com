import {Badge} from '@pakfactory/ui/components/badge';
import {Button} from '@pakfactory/ui/components/button';
import type {CustomizationOption} from '@/lib/catalog/types';

type CustomizationEntryProps = {
    applied: CustomizationOption[];
};

export function CustomizationEntry({applied}: CustomizationEntryProps) {
    return (
        <div className="space-y-3">
            <div>
                <h2 className="text-base font-semibold text-brand-blue">
                    Customization
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Optional. A specialist can propose options with your request, or you
                    can customize later.
                </p>
            </div>
            {applied.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                    {applied.map((option) => (
                        <li key={option.id}>
                            <Badge variant="secondary">{option.label}</Badge>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-muted-foreground">No customizations applied.</p>
            )}
            <Button type="button" variant="outline" disabled>
                Customize
            </Button>
        </div>
    );
}
