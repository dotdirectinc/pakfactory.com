import {
    Breadcrumb,
    type Crumb,
} from '@pakfactory/ui/components/breadcrumb-trail';
import {
    PageDielineSection,
    type PageDielineBand,
} from '@pakfactory/ui/components/page-dieline-section';
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
