'use client';

import type {ReactNode} from 'react';
import {ServicesField} from '@/components/intake/fields/services-field';
import {REQUEST_COPY} from '@/lib/copy/request';
import type {RequestDraft} from '@/lib/request/request.storage';
import type {RequestServiceOption} from '@/lib/request/service-option';

/** Project summary — Which services do you need? */
export function WhichServicesSection({
    draft,
    onPatch,
    serviceOptions,
}: {
    draft: RequestDraft;
    onPatch: (patch: Partial<RequestDraft>) => void;
    serviceOptions: RequestServiceOption[];
}) {
    return (
        <Field label={REQUEST_COPY.intakeServicesLabel} description={REQUEST_COPY.intakeServicesHelp}>
            <ServicesField hideHelp draft={draft} onPatch={onPatch} serviceOptions={serviceOptions} />
        </Field>
    );
}

function Field({
    label,
    description,
    children,
}: {
    label: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
                <p className="text-base font-medium text-foreground">{label}</p>
                {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
            </div>
            {children}
        </div>
    );
}
