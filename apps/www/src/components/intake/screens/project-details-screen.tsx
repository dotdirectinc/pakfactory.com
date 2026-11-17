'use client';

import {Checkbox} from '@pakfactory/ui/components/checkbox';
import {DescribeProjectSection} from '@/components/intake/project-summary/describe-project-section';
import {PackagingSpendSection} from '@/components/intake/project-summary/packaging-spend-section';
import {QuantitySection} from '@/components/intake/project-summary/quantity-section';
import {ShipToSection} from '@/components/intake/project-summary/ship-to-section';
import {WhichServicesSection} from '@/components/intake/project-summary/which-services-section';
import {QuoteTypeScreen} from '@/components/intake/screens/quote-type-screen';
import {ShippingToAddress} from '@/components/request/shipping-to-address';
import {draftNeeds, NEED_PACKAGING, NEED_SERVICE, needsPatch} from '@/lib/intake/needs';
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
 * Project details: everything about the job, composed from section components.
 * - General: What can we help you with? first, then need-gated blocks in a fixed order
 *   (Quantity → country → budget → Which services when applicable → Describe last).
 * - Product: Describe then ship-to; budget follows the Add packaging services card on RequestPage.
 * - Service: Describe then budget (unused sectioned branch).
 */
export function ProjectDetailsScreen({
    flow,
    draft,
    onPatch,
    serviceOptions,
    showShipTo = true,
    columns = false,
}: ProjectDetailsScreenProps) {
    const describe = (
        <DescribeProjectSection draft={draft} onPatch={onPatch} flow={flow} columns={columns} />
    );
    const spend = <PackagingSpendSection draft={draft} onPatch={onPatch} />;

    if (flow === 'product') {
        // Product keeps the full ship-to address; general uses country-only below.
        const productShipTo =
            showShipTo ? (
                <ShippingToAddress
                    value={draft.shippingAddress}
                    onChange={(shippingAddress) => onPatch({shippingAddress})}
                />
            ) : null;
        if (!productShipTo) return describe;
        return (
            <div className="flex flex-col gap-12">
                {describe}
                {productShipTo}
            </div>
        );
    }

    if (flow === 'service') {
        return (
            <div className="flex flex-col gap-12">
                {describe}
                {spend}
            </div>
        );
    }

    // General: choice first; after a need is picked, compose sections in confirmed order.
    const fromDoor = Boolean(draft.needFromDoor);
    const picked = Boolean(draft.needPicked || fromDoor) && draftNeeds(draft).length > 0;
    const choice = fromDoor ? null : (
        <div>
            <QuoteTypeScreen draft={draft} onPatch={onPatch} showLabel />
        </div>
    );
    if (!picked) return <div className="flex flex-col gap-12">{choice}</div>;

    const packaging = needsPackaging(draft);
    const service = needsService(draft);
    const countryShipTo =
        showShipTo && packaging ? <ShipToSection draft={draft} onPatch={onPatch} /> : null;

    const toggleNeed = (id: string, on: boolean) => {
        const next = REQUEST_COPY.intakeNeedChoices
            .map((o) => o.value)
            .filter((v) => (v === id ? on : draftNeeds(draft).includes(v)));
        if (!next.length) return;
        const wantsService = next.includes(NEED_SERVICE);
        onPatch({
            ...needsPatch(next),
            servicesEnabled: wantsService,
            ...(wantsService ? {} : {services: [], serviceOther: ''}),
        });
    };

    // Packaging: Quantity → country → budget → [Which services] → Describe.
    // Services only: budget → Which services → Describe.
    // Describe is always last. Door add-on cards only toggle the other need.
    return (
        <div className="flex flex-col gap-12">
            {choice}
            {packaging ? <QuantitySection draft={draft} onPatch={onPatch} /> : null}
            {countryShipTo}
            {spend}
            {service ? (
                <WhichServicesSection
                    draft={draft}
                    onPatch={onPatch}
                    serviceOptions={serviceOptions}
                />
            ) : null}
            {describe}
            {fromDoor && draftNeeds(draft)[0] === NEED_PACKAGING ? (
                <AddNeedCard
                    id="intake-add-service"
                    title={REQUEST_COPY.intakeAddServiceTitle}
                    help={REQUEST_COPY.intakeAddServiceHelp}
                    checked={service}
                    onChange={(on) => toggleNeed(NEED_SERVICE, on)}
                />
            ) : null}
            {fromDoor && draftNeeds(draft)[0] === NEED_SERVICE ? (
                <AddNeedCard
                    id="intake-add-packaging"
                    title={REQUEST_COPY.intakeAddPackagingTitle}
                    help={REQUEST_COPY.intakeAddPackagingHelp}
                    checked={packaging}
                    onChange={(on) => toggleNeed(NEED_PACKAGING, on)}
                />
            ) : null}
        </div>
    );
}

/** The other need as a toggle only — checked fields render in the shared order above. */
function AddNeedCard({
    id,
    title,
    help,
    checked,
    onChange,
}: {
    id: string;
    title: string;
    help: string;
    checked: boolean;
    onChange: (on: boolean) => void;
}) {
    return (
        <div className="flex flex-col rounded-xl border border-border p-4">
            <label htmlFor={id} className="flex cursor-pointer items-start justify-between gap-4">
                <span className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-foreground">{title}</span>
                    <span className="text-xs text-muted-foreground">{help}</span>
                </span>
                <Checkbox
                    id={id}
                    checked={checked}
                    onCheckedChange={(next) => onChange(next === true)}
                    className="mt-0.5 size-5"
                />
            </label>
        </div>
    );
}
