import {Fragment} from 'react';
import {Slash} from 'lucide-react';
import {
    Breadcrumb as UIBreadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbSeparator,
} from '@pakfactory/ui/components/breadcrumb';
import {
    Breadcrumb,
    type Crumb,
} from '@pakfactory/ui/components/breadcrumb-trail';
import {
    PageDielineSection,
    type PageDielineBand,
} from '@pakfactory/ui/components/page-dieline-section';
import {Skeleton} from '@pakfactory/ui/components/skeleton';
import {WWW_ROUTES} from '@/lib/www-routes';

type PageBreadcrumbSectionProps = {
    items: Crumb[];
    className?: string;
    /** Section band background; defaults to page background. */
    band?: PageDielineBand;
};

function isHomeCrumb(item: Crumb): boolean {
    if (item.label.trim().toLowerCase() === 'home') return true;
    const href = item.href?.trim();
    return href === '/' || href === WWW_ROUTES.home;
}

/** Drop leading Home; section roots (one crumb left) hide the bar. */
function visibleBreadcrumbItems(items: Crumb[]): Crumb[] {
    if (items.length === 0) return [];
    const [first, ...rest] = items;
    const withoutHome = first && isHomeCrumb(first) ? rest : items;
    return withoutHome;
}

export function PageBreadcrumbSection({
    items,
    className,
    band = 'default',
}: PageBreadcrumbSectionProps) {
    const visible = visibleBreadcrumbItems(items);
    if (visible.length < 2) return null;

    // Inner-column border stays inside the dieline (not outer viewport bleed).
    return (
        <PageDielineSection
            band={band}
            paddingBlock="none"
            className={className}
            innerClassName="border-b border-dashed border-border py-4"
        >
            <Breadcrumb items={visible} />
        </PageDielineSection>
    );
}

const SKELETON_CRUMB_WIDTHS = ['w-16', 'w-20', 'w-24', 'w-28'] as const;

type PageBreadcrumbSectionSkeletonProps = {
    className?: string;
    band?: PageDielineBand;
    /** Number of crumb placeholders (PDP trail after Home drop is typically 4). */
    crumbCount?: number;
};

/**
 * Loading chrome for {@link PageBreadcrumbSection} — same dieline band and
 * slash-separated trail rhythm as the live breadcrumb (not loose skeleton pills).
 */
export function PageBreadcrumbSectionSkeleton({
    className,
    band = 'default',
    crumbCount = 4,
}: PageBreadcrumbSectionSkeletonProps) {
    const widths = SKELETON_CRUMB_WIDTHS.slice(
        0,
        Math.max(2, Math.min(crumbCount, SKELETON_CRUMB_WIDTHS.length)),
    );

    return (
        <PageDielineSection
            band={band}
            paddingBlock="none"
            className={className}
            innerClassName="border-b border-dashed border-border py-4"
        >
            <UIBreadcrumb aria-busy="true" aria-live="polite">
                <span className="sr-only">Loading breadcrumb</span>
                <BreadcrumbList aria-hidden>
                    {widths.map((widthClass, index) => {
                        const isLast = index === widths.length - 1;
                        return (
                            <Fragment key={widthClass}>
                                <BreadcrumbItem>
                                    <Skeleton
                                        className={`h-3 ${widthClass}`}
                                    />
                                </BreadcrumbItem>
                                {!isLast ? (
                                    <BreadcrumbSeparator>
                                        <Slash
                                            className="text-muted-foreground/50"
                                            strokeWidth={1.75}
                                            aria-hidden
                                        />
                                    </BreadcrumbSeparator>
                                ) : null}
                            </Fragment>
                        );
                    })}
                </BreadcrumbList>
            </UIBreadcrumb>
        </PageDielineSection>
    );
}
