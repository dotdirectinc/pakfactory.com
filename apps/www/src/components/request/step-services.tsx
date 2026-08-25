'use client';

import {cn} from '@pakfactory/ui/lib/utils';
import {REQUEST_COPY, SERVICE_OPTIONS} from '@/lib/copy/request';

type StepServicesProps = {
    services: string[];
    servicesEnabled: boolean;
    onToggleEnabled: (enabled: boolean) => void;
    onToggleService: (id: string) => void;
    sectionRef?: React.Ref<HTMLElement>;
};

export function StepServices({
    services,
    servicesEnabled,
    onToggleEnabled,
    onToggleService,
    sectionRef,
}: StepServicesProps) {
    return (
        <section
            id="section-services"
            data-section="services"
            ref={sectionRef}
            className="border-t border-border/60 py-16"
        >
            <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight">
                        {REQUEST_COPY.servicesHeading}
                    </h2>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                        {REQUEST_COPY.servicesDesc}
                    </p>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={servicesEnabled}
                    onClick={() => onToggleEnabled(!servicesEnabled)}
                    className={cn(
                        'rounded-full px-4 py-2 text-xs font-medium',
                        servicesEnabled
                            ? 'bg-foreground text-background'
                            : 'border border-border bg-background text-foreground',
                    )}
                >
                    {servicesEnabled ? 'On' : 'Off'}
                </button>
            </div>

            {servicesEnabled ? (
                <div className="grid gap-2 sm:grid-cols-2">
                    {SERVICE_OPTIONS.map((svc) => {
                        const on = services.includes(svc.id);
                        return (
                            <label
                                key={svc.id}
                                className={cn(
                                    'flex min-h-11 cursor-pointer items-center gap-2 rounded-md border p-3.5 text-sm font-medium',
                                    on
                                        ? 'border-foreground bg-muted/40'
                                        : 'border-border bg-background hover:bg-muted/30',
                                )}
                            >
                                <input
                                    type="checkbox"
                                    className="size-5 accent-foreground"
                                    checked={on}
                                    onChange={() => onToggleService(svc.id)}
                                />
                                {svc.label}
                            </label>
                        );
                    })}
                </div>
            ) : null}
        </section>
    );
}
