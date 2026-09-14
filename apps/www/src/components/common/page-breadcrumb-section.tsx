import {
    Breadcrumb,
    type Crumb,
} from '@pakfactory/components/layout/breadcrumb';
import {
    PageDielineFullBleedSection,
    pageDielineOuterClass,
} from '@pakfactory/ui/components/page-dieline-section';
import {WWW_ROUTES} from '@/lib/www-routes';

type PageBreadcrumbSectionProps = {
    items: Crumb[];
    className?: string;
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
}: PageBreadcrumbSectionProps) {
    const visible = visibleBreadcrumbItems(items);
    if (visible.length < 2) return null;

    return (
        <div className={pageDielineOuterClass(className)}>
            <PageDielineFullBleedSection
                sectionClassName="bg-background"
                innerClassName="border-b border-dashed border-border py-5"
            >
                <Breadcrumb items={visible} />
            </PageDielineFullBleedSection>
        </div>
    );
}
