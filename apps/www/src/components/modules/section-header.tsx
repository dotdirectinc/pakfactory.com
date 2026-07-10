// Source: shadcn-studio (section-header-01)
import {cn} from '@pakfactory/ui/lib/utils';

type SectionHeaderProps = {
    title: string;
    description?: string;
    className?: string;
};

const SectionHeader = ({title, description, className}: SectionHeaderProps) => {
    return (
        <div className={cn('flex flex-col gap-2', className)}>
            <h1 className="text-3xl font-bold tracking-tight md:text-6xl">
                {title}
            </h1>
            {description && (
                <p className="text-muted-foreground text-lg">{description}</p>
            )}
        </div>
    );
};

export default SectionHeader;
