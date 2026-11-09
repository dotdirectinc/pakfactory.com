'use client';

import {Checkbox} from '@pakfactory/ui/components/checkbox';
import {cn} from '@pakfactory/ui/lib/utils';
import {ServicesField} from '@/components/intake/fields/services-field';
import {REQUEST_COPY} from '@/lib/copy/request';
import type {RequestDraft} from '@/lib/request/request.storage';
import type {RequestServiceOption} from '@/lib/request/service-option';

/**
 * RFQ v2 decision 3: services join a product request from Project details, as the same
 * "Add packaging services" card the general request uses. PORTABLE.
 */
export function ServicesAddCard({
    draft,
    onPatch,
    serviceOptions,
}: {
    draft: RequestDraft;
    onPatch: (patch: Partial<RequestDraft>) => void;
    serviceOptions: RequestServiceOption[];
}) {
    const on = Boolean(draft.servicesEnabled);
    return (
        <div className="flex flex-col rounded-xl border border-border bg-muted/40 p-4">
            <label htmlFor="request-add-service" className="flex cursor-pointer items-start justify-between gap-4">
                <span className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-foreground">{REQUEST_COPY.intakeAddServiceTitle}</span>
                    <span className="text-xs text-muted-foreground">{REQUEST_COPY.intakeAddServiceHelp}</span>
                </span>
                <Checkbox
                    id="request-add-service"
                    checked={on}
                    onCheckedChange={(next) => onPatch(next === true ? {servicesEnabled: true} : {servicesEnabled: false, services: [], serviceOther: ''})}
                    className="mt-0.5 size-5"
                />
            </label>
            <div
                className={cn(
                    'grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none',
                    on ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                )}
                aria-hidden={!on}
                inert={!on}
            >
                <div className="relative min-h-0 overflow-hidden">
                    <div className="mt-4 border-t border-border pt-4">
                        {on ? <ServicesField draft={draft} onPatch={onPatch} serviceOptions={serviceOptions} variant="list" /> : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
