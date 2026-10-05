'use client';

import {cn} from '@pakfactory/ui/lib/utils';
import {REQUEST_COPY} from '@/lib/copy/request';
import type {RequestServiceOption} from '@/lib/request/service-option';

type StepServicesProps = {
    services: string[];
    servicesEnabled: boolean;
    onToggleEnabled: (enabled: boolean) => void;
    onToggleService: (id: string) => void;
    /** Sanity expertise stages (slug + title). Empty → no checkboxes. */
    options: RequestServiceOption[];
    sectionRef?: React.Ref<HTMLElement>;
    /**
     * When false, the enable control is owned elsewhere (e.g. ServicesUpsellToggle
     * under Products). Default true for services-entry.
     */
    showEnableToggle?: boolean;
};

export function StepServices({
    services,
    servicesEnabled,
    onToggleEnabled,
    onToggleService,
    options,
    sectionRef,
    showEnableToggle = true,
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
                    {REQUEST_COPY.servicesDesc ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                            {REQUEST_COPY.servicesDesc}
                        </p>
                    ) : null}
                </div>
                {showEnableToggle ? (
                    <button
                        type="button"
                        role="switch"
                        aria-checked={servicesEnabled}
                        onClick={() => onToggleEnabled(!servicesEnabled)}
                        className={cn(
                            'rounded-md px-4 py-2 text-xs font-medium',
                            servicesEnabled
                                ? 'bg-foreground text-background'
                                : 'border border-border bg-background text-foreground',
                        )}
                    >
                        {servicesEnabled ? 'On' : 'Off'}
                    </button>
                ) : null}
            </div>

            {servicesEnabled ? (
                <div className="grid gap-2 sm:grid-cols-2">
                    {options.map((svc) => {
                        const on = services.includes(svc.id);
                        return (
                            <label
                                key={svc.id}
                                className={cn(
                                    'flex min-h-11 cursor-pointer items-start gap-2 rounded-md border p-4 text-sm font-medium',
                                    on
                                        ? 'border-foreground bg-muted/40'
                                        : 'border-border bg-background hover:bg-muted/30',
                                )}
                            >
                                <input
                                    type="checkbox"
                                    className="mt-0.5 size-5 shrink-0 accent-foreground"
                                    checked={on}
                                    onChange={() => onToggleService(svc.id)}
                                />
                                <span className="flex min-w-0 flex-col gap-1">
                                    <span>{svc.label}</span>
                                    {svc.description ? (
                                        <span className="text-xs font-normal text-muted-foreground">
                                            {svc.description}
                                        </span>
                                    ) : null}
                                </span>
                            </label>
                        );
                    })}
                </div>
            ) : null}
        </section>
    );
}
