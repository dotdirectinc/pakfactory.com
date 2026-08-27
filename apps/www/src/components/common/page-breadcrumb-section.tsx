import {
    Breadcrumb,
    type Crumb,
} from '@pakfactory/components/layout/breadcrumb';
import {
    PageDielineFullBleedSection,
    pageDielineOuterClass,
} from '@pakfactory/ui/components/page-dieline-section';

type PageBreadcrumbSectionProps = {
    items: Crumb[];
    className?: string;
};

export function PageBreadcrumbSection({
    items,
    className,
}: PageBreadcrumbSectionProps) {
    if (!items.length) return null;

    return (
        <div className={pageDielineOuterClass(className)}>
            <PageDielineFullBleedSection
                sectionClassName="border-b border-dashed border-border bg-background"
                innerClassName="py-5"
            >
                <Breadcrumb items={items} />
            </PageDielineFullBleedSection>
        </div>
    );
}
