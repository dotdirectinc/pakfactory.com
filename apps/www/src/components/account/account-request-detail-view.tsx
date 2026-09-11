'use client';

import type {ReactNode} from 'react';
import {useMemo, useRef, useState} from 'react';
import Link from 'next/link';
import {Badge} from '@pakfactory/ui/components/badge';
import {AccountRequestProductCard} from '@/components/account/account-request-product-card';
import {RequestWizardChrome} from '@/components/request/request-wizard-chrome';
import {
    scrollToRequestWizardSection,
    useRequestWizardScrollSpy,
} from '@/components/request/request-wizard-scroll';
import type {WizardRailRowData} from '@/components/request/wizard-rail-row';
import {ACCOUNT_COPY} from '@/lib/copy/account';
import {REQUEST_COPY, SERVICE_OPTIONS} from '@/lib/copy/request';
import type {
    BuyerRequestDetail,
    BuyerRequestShipTo,
} from '@/lib/account/buyer-requests';
import {WWW_ROUTES} from '@/lib/www-routes';

export type AccountRequestDetailViewProps = {
    request: BuyerRequestDetail;
    /** productSlug → first catalog media URL */
    thumbsBySlug: Record<string, string>;
};

function shipToHasAny(address: BuyerRequestShipTo): boolean {
    return Object.values(address).some(Boolean);
}

/** Title inside the card — matches admin DetailSection pattern. */
function DetailCard({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-3 rounded-xl border border-border px-4 py-4">
            <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
            {children}
        </div>
    );
}

function ShipToField({
    label,
    value,
    className,
}: {
    label: string;
    value: string;
    className?: string;
}) {
    if (!value.trim()) return null;
    return (
        <div className={className}>
            <p className="mb-1 text-xs font-semibold text-foreground">{label}</p>
            <p className="text-sm font-normal text-foreground">{value}</p>
        </div>
    );
}

function serviceLabel(id: string): string {
    return SERVICE_OPTIONS.find((option) => option.id === id)?.label ?? id;
}

/**
 * Account review shell: shared request chrome + read-only Products / Requirements.
 */
export function AccountRequestDetailView({
    request,
    thumbsBySlug,
}: AccountRequestDetailViewProps) {
    const submittedLabel = ACCOUNT_COPY.submittedOn(
        new Date(request.submittedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }),
    );

    const showProducts = request.lines.length > 0;
    const showServices = request.services.length > 0;
    const showShipTo = shipToHasAny(request.shipTo);
    const showExpressContents = Boolean(request.packagingContents.trim());
    const showExpressQty = request.quantities.length > 0 && !showProducts;
    const showTimeline = Boolean(request.timeline.trim());
    const showFiles = request.fileNames.length > 0;
    const briefText = request.notes.trim() || ACCOUNT_COPY.briefNotSet;

    const expressQtyLabel = request.quantities
        .map((q) => q.toLocaleString('en-US'))
        .join(', ');

    const productsRef = useRef<HTMLElement>(null);
    const requirementsRef = useRef<HTMLElement>(null);

    const railRows: WizardRailRowData[] = useMemo(() => {
        const rows: WizardRailRowData[] = [];
        if (showProducts || showServices) {
            rows.push({
                key: 'products',
                title: REQUEST_COPY.productsTitle,
                subtitle: REQUEST_COPY.productsRailSubtitle,
                complete: true,
            });
        }
        rows.push({
            key: 'requirements',
            title: REQUEST_COPY.requirementsTitle,
            subtitle: REQUEST_COPY.requirementsRailSubtitle,
            complete: true,
        });
        return rows;
    }, [showProducts, showServices]);

    const [activeKey, setActiveKey] = useState(
        railRows[0]?.key ?? 'requirements',
    );

    const sectionRefs: Record<string, React.RefObject<HTMLElement | null>> = {
        products: productsRef,
        requirements: requirementsRef,
    };

    function scrollToSection(key: string) {
        scrollToRequestWizardSection(sectionRefs, key, setActiveKey);
    }

    useRequestWizardScrollSpy(railRows, sectionRefs, setActiveKey);

    const mailtoHref = `mailto:${ACCOUNT_COPY.quotesEmail}?subject=${encodeURIComponent(
        `Re: ${request.reference}`,
    )}`;

    const backLink = (
        <Link
            href={WWW_ROUTES.accountRequests}
            className="text-[15px] font-medium leading-snug tracking-tight text-foreground underline-offset-4 hover:underline"
        >
            {ACCOUNT_COPY.backToRequests}
        </Link>
    );

    const helpBlock = (
        <p className="text-[13px] text-muted-foreground">
            {ACCOUNT_COPY.questionsAboutRequest}{' '}
            <a
                href={mailtoHref}
                className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
            >
                {ACCOUNT_COPY.emailYourTeam}
            </a>
        </p>
    );

    return (
        <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-background -mt-10 -mb-10 sm:-mt-12 sm:-mb-12">
            <RequestWizardChrome
                rows={railRows}
                activeKey={activeKey}
                onSelect={scrollToSection}
                refNumber={request.reference}
                heading={backLink}
                help={helpBlock}
            >
                <div className="mx-auto w-full max-w-[760px] px-6 pb-10 pt-6 sm:px-10 sm:pb-12">
                    <div className="mb-10 lg:hidden">{backLink}</div>

                    <div className="mb-10 flex items-start justify-between gap-4">
                        <div className="flex min-w-0 flex-col gap-2">
                            <h1 className="text-3xl font-bold tracking-tight">
                                {request.reference}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {submittedLabel}
                            </p>
                        </div>
                        {/* Display-only until real RFQ statuses ship; DB is still only `submitted`. */}
                        <Badge
                            variant="secondary"
                            className="mt-1 shrink-0 px-3 py-1 text-xs font-semibold"
                        >
                            {ACCOUNT_COPY.statusPending}
                        </Badge>
                    </div>

                    {showProducts || showServices ? (
                        <section
                            id="section-products"
                            ref={productsRef}
                            className="mb-16 flex scroll-mt-[108px] flex-col"
                        >
                            <div className="mb-7">
                                <h2 className="text-2xl font-semibold tracking-tight">
                                    {REQUEST_COPY.productsTitle}
                                </h2>
                            </div>

                            {showProducts ? (
                                <ul className="flex flex-col gap-3">
                                    {request.lines.map((line) => (
                                        <li key={line.id}>
                                            <AccountRequestProductCard
                                                line={line}
                                                thumbSrc={
                                                    thumbsBySlug[
                                                        line.productSlug
                                                    ] ?? null
                                                }
                                            />
                                        </li>
                                    ))}
                                </ul>
                            ) : null}

                            {showServices ? (
                                <div
                                    className={
                                        showProducts
                                            ? 'mt-4 rounded-xl border border-border px-4 py-4'
                                            : 'rounded-xl border border-border px-4 py-4'
                                    }
                                >
                                    <p className="text-sm font-semibold tracking-tight">
                                        {REQUEST_COPY.servicesUpsellTitle}
                                    </p>
                                    <p className="mt-1 text-[12.5px] text-muted-foreground">
                                        {REQUEST_COPY.servicesUpsellSupporting}
                                    </p>
                                    <ul className="mt-3 flex flex-col gap-1 text-sm text-foreground">
                                        {request.services.map((id) => (
                                            <li key={id}>{serviceLabel(id)}</li>
                                        ))}
                                    </ul>
                                </div>
                            ) : null}
                        </section>
                    ) : null}

                    <section
                        id="section-requirements"
                        ref={requirementsRef}
                        className="flex scroll-mt-[108px] flex-col"
                    >
                        <div className="mb-7">
                            <h2 className="text-[26px] font-semibold tracking-tight">
                                {REQUEST_COPY.requirementsTitle}
                            </h2>
                        </div>

                        <div className="flex flex-col gap-4">
                            <DetailCard title={ACCOUNT_COPY.briefHeading}>
                                <p className="min-h-28 whitespace-pre-wrap break-words text-sm text-foreground">
                                    {briefText}
                                </p>
                            </DetailCard>

                            {showExpressContents ? (
                                <DetailCard title={ACCOUNT_COPY.fieldContents}>
                                    <p className="text-sm font-semibold text-foreground">
                                        {request.packagingContents}
                                    </p>
                                </DetailCard>
                            ) : null}

                            {showExpressQty ? (
                                <DetailCard title={ACCOUNT_COPY.fieldQuantity}>
                                    <p className="text-sm font-semibold text-foreground">
                                        {expressQtyLabel}{' '}
                                        {REQUEST_COPY.unitsSuffix}
                                    </p>
                                </DetailCard>
                            ) : null}

                            {showTimeline ? (
                                <DetailCard title={REQUEST_COPY.timelineLabel}>
                                    <p className="text-sm font-semibold text-foreground">
                                        {request.timeline}
                                    </p>
                                </DetailCard>
                            ) : null}

                            {showShipTo ? (
                                <DetailCard title={ACCOUNT_COPY.shipToHeading}>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <ShipToField
                                            label={ACCOUNT_COPY.fieldCountry}
                                            value={request.shipTo.country}
                                        />
                                        <ShipToField
                                            label={ACCOUNT_COPY.fieldRegion}
                                            value={request.shipTo.region}
                                        />
                                        <ShipToField
                                            label={ACCOUNT_COPY.fieldAddress}
                                            value={request.shipTo.line1}
                                            className="sm:col-span-2"
                                        />
                                        <ShipToField
                                            label={ACCOUNT_COPY.fieldApartment}
                                            value={request.shipTo.line2}
                                            className="sm:col-span-2"
                                        />
                                        <ShipToField
                                            label={ACCOUNT_COPY.fieldCity}
                                            value={request.shipTo.city}
                                        />
                                        <ShipToField
                                            label={ACCOUNT_COPY.fieldPostal}
                                            value={request.shipTo.postalCode}
                                        />
                                    </div>
                                </DetailCard>
                            ) : null}

                            {showFiles ? (
                                <DetailCard title={ACCOUNT_COPY.filesHeading}>
                                    {/* Names only — ADR-0013 D3; no buyer download route. */}
                                    <ul className="flex flex-col gap-1">
                                        {request.fileNames.map((name) => (
                                            <li
                                                key={name}
                                                className="text-sm text-muted-foreground"
                                            >
                                                {name}
                                            </li>
                                        ))}
                                    </ul>
                                </DetailCard>
                            ) : null}
                        </div>
                    </section>
                </div>
            </RequestWizardChrome>
        </div>
    );
}
