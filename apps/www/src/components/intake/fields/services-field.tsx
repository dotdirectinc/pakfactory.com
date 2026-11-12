'use client';

import {Info} from 'lucide-react';
import {Checkbox} from '@pakfactory/ui/components/checkbox';
import {Tooltip, TooltipContent, TooltipTrigger} from '@pakfactory/ui/components/tooltip';
import {cn} from '@pakfactory/ui/lib/utils';
import {ServiceOtherField} from '@/components/intake/fields/service-other-field';
import {REQUEST_COPY} from '@/lib/copy/request';
import type {RequestDraft} from '@/lib/request/request.storage';
import {OTHER_SERVICE_ID} from '@/lib/request/service-label';
import type {RequestServiceOption} from '@/lib/request/service-option';

/** Services to quote (step intake, Nov 2): the Expertise list, one or more, plus Something else in the buyer's words. */
export function ServicesField({
    draft,
    onPatch,
    serviceOptions,
    /** Hide when the screen heading already says "Pick one or more" (product/service Services step). */
    hideHelp = false,
    /** `list` (owner Nov 3, product request): one row per service with its short description, checkbox on the right. */
    variant = 'grid',
}: {
    draft: RequestDraft;
    onPatch: (patch: Partial<RequestDraft>) => void;
    serviceOptions: RequestServiceOption[];
    hideHelp?: boolean;
    variant?: 'grid' | 'list';
}) {
    const otherOn = draft.services.includes(OTHER_SERVICE_ID);
    const rows: RequestServiceOption[] = [...serviceOptions, {id: OTHER_SERVICE_ID, label: REQUEST_COPY.serviceOtherLabel}];

    function toggle(id: string) {
        const on = draft.services.includes(id);
        onPatch({
            services: on ? draft.services.filter((s) => s !== id) : [...draft.services, id],
            servicesEnabled: true,
            ...(id === OTHER_SERVICE_ID && on ? {serviceOther: ''} : {}),
        });
    }

    const otherInput = otherOn ? (
        <ServiceOtherField
            value={draft.serviceOther ?? ''}
            onChange={(serviceOther) => onPatch({serviceOther})}
        />
    ) : null;

    if (variant === 'list') {
        const listRows: (RequestServiceOption & {description?: string})[] = [
            ...serviceOptions,
            {id: OTHER_SERVICE_ID, label: REQUEST_COPY.serviceOtherLabel, description: REQUEST_COPY.serviceOtherPlaceholder},
        ];
        return (
            <div className="flex flex-col">
                {/* The hint sits right above the first row (owner Nov 3). */}
                {hideHelp ? null : <p className="pb-1 text-xs text-muted-foreground">{REQUEST_COPY.intakeServicesHelp}</p>}
                <ul className="divide-y divide-border [&>li:first-child>label]:pt-2">
                    {listRows.map((svc) => {
                        const on = draft.services.includes(svc.id);
                        return (
                            <li key={svc.id}>
                                <label htmlFor={`svc-${svc.id}`} className="flex cursor-pointer items-start justify-between gap-4 py-3">
                                    <span className="flex min-w-0 flex-col gap-0.5">
                                        <span className="text-sm font-medium text-foreground">{svc.label}</span>
                                        {svc.description ? (
                                            // Owner Nov 3: shown in full, full width, at body size (text-sm).
                                            <span className="text-sm text-muted-foreground">{svc.description}</span>
                                        ) : null}
                                    </span>
                                    {/* Same design-system checkbox as the card's "Add packaging services" (owner Nov 3). */}
                                    <Checkbox id={`svc-${svc.id}`} className="mt-0.5 size-5" checked={on} onCheckedChange={() => toggle(svc.id)} />
                                </label>
                            </li>
                        );
                    })}
                </ul>
                {otherInput}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            {hideHelp ? null : <p className="text-sm text-muted-foreground">{REQUEST_COPY.intakeServicesHelp}</p>}
            <div className={cn('grid gap-2 sm:grid-cols-2', hideHelp ? undefined : 'mt-2')}>
                {rows.map((svc) => {
                    const on = draft.services.includes(svc.id);
                    return (
                        <div
                            key={svc.id}
                            className={cn(
                                'flex min-h-11 items-start gap-2 rounded-md border p-4 text-sm font-medium',
                                on ? 'border-foreground bg-muted/40' : 'border-border bg-background hover:bg-muted/30',
                            )}
                        >
                            <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
                                <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-foreground" checked={on} onChange={() => toggle(svc.id)} />
                                <span>{svc.label}</span>
                            </label>
                            {svc.description ? (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button type="button" aria-label={`About ${svc.label}`} className="shrink-0 text-muted-foreground hover:text-foreground">
                                            <Info className="size-4" aria-hidden />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" sideOffset={6} className="max-w-xs">
                                        {svc.description}
                                    </TooltipContent>
                                </Tooltip>
                            ) : null}
                        </div>
                    );
                })}
            </div>
            {otherInput}
        </div>
    );
}
