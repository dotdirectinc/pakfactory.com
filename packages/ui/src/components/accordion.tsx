'use client';

import * as React from 'react';
import {ChevronDown} from 'lucide-react';
import {Accordion as AccordionPrimitive} from 'radix-ui';

import {cn} from '@pakfactory/ui/lib/utils';

function Accordion({
    ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
    return <AccordionPrimitive.Root data-slot="accordion" {...props} />;
}

function AccordionItem({
    className,
    ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
    return (
        <AccordionPrimitive.Item
            data-slot="accordion-item"
            className={cn('border-b last:border-b-0', className)}
            {...props}
        />
    );
}

function AccordionTrigger({
    className,
    children,
    ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
    return (
        <AccordionPrimitive.Header className="flex">
            <AccordionPrimitive.Trigger
                data-slot="accordion-trigger"
                className={cn(
                    'flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none',
                    'hover:underline focus-visible:ring-2 focus-visible:ring-ring',
                    'disabled:pointer-events-none disabled:opacity-50',
                    '[&[data-state=open]_svg]:rotate-180',
                    className,
                )}
                {...props}
            >
                {children}
                <span
                    className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-full',
                        'bg-foreground text-background',
                    )}
                    aria-hidden
                >
                    <ChevronDown
                        className={cn(
                            'size-4 text-background',
                            'transition-transform duration-300 ease-out',
                            'motion-reduce:transition-none',
                        )}
                        strokeWidth={1.75}
                    />
                </span>
            </AccordionPrimitive.Trigger>
        </AccordionPrimitive.Header>
    );
}

function AccordionContent({
    className,
    children,
    ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
    return (
        <AccordionPrimitive.Content
            data-slot="accordion-content"
            className={cn(
                'overflow-hidden text-sm',
                'data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down',
            )}
            {...props}
        >
            <div className={cn('pt-0 pb-4', className)}>{children}</div>
        </AccordionPrimitive.Content>
    );
}

export {Accordion, AccordionItem, AccordionTrigger, AccordionContent};
