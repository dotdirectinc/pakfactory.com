import {Check} from 'lucide-react';
import {Badge} from '@pakfactory/ui/components/badge';
import {Button} from '@pakfactory/ui/components/button';
import {REQUEST_COPY} from '@/lib/copy/request';
import type {CustomizationOption} from '@/lib/catalog/types';

type CustomizationEntryProps = {
    applied: CustomizationOption[];
};

export function CustomizationEntry({applied}: CustomizationEntryProps) {
    return (
        <div>
            <h2 className="text-base font-semibold text-brand-blue">
                {REQUEST_COPY.customizationHeading}
            </h2>
            <div className="mt-4 flex flex-col gap-4 rounded-xl bg-background p-4">
                <div className="flex items-start gap-2">
                    <Check className="size-4 shrink-0 text-brand-forest" aria-hidden />
                    <p className="text-sm text-foreground">
                        {REQUEST_COPY.specialistCanPropose}
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
                ) : null}
                <Button type="button" variant="outline" className="w-full" disabled>
                    {REQUEST_COPY.customizeItYourself}
                </Button>
            </div>
        </div>
    );
}
