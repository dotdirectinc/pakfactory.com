'use client';

import type {ReactNode} from 'react';
import {Checkbox} from '@pakfactory/ui/components/checkbox';
import {cn} from '@pakfactory/ui/lib/utils';
import {QuoteTypeScreen} from '@/components/intake/screens/quote-type-screen';
import {draftNeeds, NEED_PACKAGING, NEED_SERVICE, needsPatch} from '@/lib/intake/needs';
import {ServicesField} from '@/components/intake/fields/services-field';
import {ShippingToAddress} from '@/components/request/shipping-to-address';
import {StepRequirements} from '@/components/request/step-requirements';
import {REQUEST_COPY} from '@/lib/copy/request';
import type {RequestFlow} from '@/lib/intake/routes';
import type {RequestDraft} from '@/lib/request/request.storage';
import type {RequestServiceOption} from '@/lib/request/service-option';
import {needsPackaging, needsService} from '@/lib/request/validation';

type ProjectDetailsScreenProps = {
    flow: RequestFlow;
    draft: RequestDraft;
    onPatch: (patch: Partial<RequestDraft>) => void;
    serviceOptions: RequestServiceOption[];
    /** Ship-to on Project summary. Default on (optional in UI; wire fills N/A when empty). */
    showShipTo?: boolean;
    /** Describe-first brief: description and Add files side by side. Default off (stacked). */
    columns?: boolean;
};

/**
 * Project details (owner Nov 2, option 1): everything about the job, in sections.
 * - General (v4.7): What can we help you with? first (hidden when the door set the need), then
 *   quantities / specifics, Describe your project, Which services; the other need as an add-on card.
 * - Product / service: Describe your project (a description or files, either is enough), then ship-to.
 * Product and service pick services on their own Services step (ServicesScreen).
 */
export function ProjectDetailsScreen({flow, draft, onPatch, serviceOptions, showShipTo = true, columns = false}: ProjectDetailsScreenProps) {
    // Every request type: a description or files, either is enough (POC switch: Project details input).
    const describeBody = <StepRequirements draft={draft} expressCold onPatch={onPatch} part="brief" bare intakeFlow={flow} {...(columns ? {columns: true} : {})} />;
    // General has sections above it, so it keeps its own heading. Product and service open with
    // it: the page heading already says it.
    // v4.7 (owner Nov 6): no section headings on the general request either — fields with labels only.
    const describe = describeBody;
    // Ship-to is for packaging destinations only — not services-only (or the service flow).
    const showPackagingShipTo =
        showShipTo &&
        flow !== 'service' &&
        (flow === 'product' || needsPackaging(draft));
    const shipTo = showPackagingShipTo ? (
        <ShippingToAddress value={draft.shippingAddress} onChange={(shippingAddress) => onPatch({shippingAddress})} />
    ) : null;

    if (flow === 'product' || flow === 'service') {
        if (!shipTo) return describe;
        return (
            <div className="flex flex-col gap-12">
                {/* The project first, then where it ships (ship-to carries its own label). */}
                {describe}
                {shipTo}
            </div>
        );
    }
    // General (Website PRD v4.7, R36, owner Nov 6): the choice leads ("What can we help you with?");
    // only it shows until a box is ticked. Then Describe your project, the services and the packaging
    // specifics. A door that set the need hides the choice and offers the other need as an add-on card
    // (the product request's "Add packaging services" pattern). Next phase (R41): AI prefills specifics.
    const fromDoor = Boolean(draft.needFromDoor);
    const picked = Boolean(draft.needPicked || fromDoor) && draftNeeds(draft).length > 0;
    const choice = fromDoor ? null : (
        <div>
            <QuoteTypeScreen draft={draft} onPatch={onPatch} showLabel />
        </div>
    );
    if (!picked) return <div className="flex flex-col gap-12">{choice}</div>;
    const doorNeed = fromDoor ? draftNeeds(draft)[0] : undefined;
    const toggleNeed = (id: string, on: boolean) => {
        const next = REQUEST_COPY.intakeNeedChoices.map((o) => o.value).filter((v) => (v === id ? on : draftNeeds(draft).includes(v)));
        if (!next.length) return;
        const wantsService = next.includes(NEED_SERVICE);
        // Answers under a removed need are kept (adding it again restores them), except services.
        onPatch({...needsPatch(next), servicesEnabled: wantsService, ...(wantsService ? {} : {services: [], serviceOther: ''})});
    };
    const services = <ServicesField draft={draft} onPatch={onPatch} serviceOptions={serviceOptions} />;
    const specifics = (
        <div className="flex flex-col gap-4">
            <StepRequirements draft={draft} expressCold onPatch={onPatch} part="packaging" bare />
        </div>
    );
    return (
        <div className="flex flex-col gap-12">
            {choice}
            {/* Quantities first, then describe / services. */}
            {needsPackaging(draft) && doorNeed !== NEED_SERVICE ? specifics : null}
            <div className="flex flex-col gap-3">{describe}</div>
            {needsService(draft) && doorNeed !== NEED_PACKAGING ? (
                <Field label={REQUEST_COPY.intakeServicesLabel} description={REQUEST_COPY.intakeServicesHelp}>
                    <ServicesField hideHelp draft={draft} onPatch={onPatch} serviceOptions={serviceOptions} />
                </Field>
            ) : null}
            {doorNeed === NEED_PACKAGING ? (
                <AddNeedCard
                    id="intake-add-service"
                    title={REQUEST_COPY.intakeAddServiceTitle}
                    help={REQUEST_COPY.intakeAddServiceHelp}
                    checked={needsService(draft)}
                    onChange={(on) => toggleNeed(NEED_SERVICE, on)}
                >
                    {services}
                </AddNeedCard>
            ) : null}
            {doorNeed === NEED_SERVICE ? (
                <AddNeedCard
                    id="intake-add-packaging"
                    title={REQUEST_COPY.intakeAddPackagingTitle}
                    help={REQUEST_COPY.intakeAddPackagingHelp}
                    checked={needsPackaging(draft)}
                    onChange={(on) => toggleNeed(NEED_PACKAGING, on)}
                >
                    {specifics}
                </AddNeedCard>
            ) : null}
            {shipTo}
        </div>
    );
}

/** The other need, added under the form (same card as the product request's "Add packaging services"). */
function AddNeedCard({id, title, help, checked, onChange, children}: {id: string; title: string; help: string; checked: boolean; onChange: (on: boolean) => void; children: ReactNode}) {
    return (
        <div className="flex flex-col rounded-xl border border-border p-4">
            <label htmlFor={id} className="flex cursor-pointer items-start justify-between gap-4">
                <span className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-foreground">{title}</span>
                    <span className="text-xs text-muted-foreground">{help}</span>
                </span>
                <Checkbox id={id} checked={checked} onCheckedChange={(next) => onChange(next === true)} className="mt-0.5 size-5" />
            </label>
            <div
                className={cn(
                    'grid transition-[grid-template-rows,opacity] duration-250 ease-out motion-reduce:transition-none',
                    checked ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                )}
                aria-hidden={!checked}
                inert={!checked}
            >
                <div className="relative min-h-0 overflow-hidden">
                    <div className="mt-4 border-t border-border pt-4">{checked ? children : null}</div>
                </div>
            </div>
        </div>
    );
}

/** A plain field label (v4.7: labels, not section headings). Description sits tight under the label. */
function Field({label, description, children}: {label: string; description?: string; children: ReactNode}) {
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
