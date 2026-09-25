'use client';

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type KeyboardEvent,
} from 'react';
import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {Icon} from '@/components/ui/icon';
import {SectionHeading} from '@/components/ui/section-heading';
import type {StepsContent} from '@/lib/sections/map-steps';

type StepsProps = {
    content: StepsContent;
    /** Section landmark id. */
    id?: string;
    className?: string;
};

/** Dwell per step — long enough to read the longest blurb (POC). */
const CYCLE_MS = 6000;

const numeral = (index: number) => String(index + 1).padStart(2, '0');

const reducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Steps — "how it works" as an auto-advancing step bar (Studio `steps`,
 * PROD-2578; POC `ProcessFlow` parity). Props-only.
 *
 * Plays itself, which WCAG 2.2.2 allows only if the reader can stop it:
 * pointer or focus anywhere in the module pauses it; choosing a step (click or
 * keys) stops it for good; `prefers-reduced-motion` never starts it. The active
 * tab fills over one cycle. Panels share one grid cell and cross-fade, so the
 * module never reflows. Arrow keys / Home / End move between steps.
 */
export function Steps({content, id = 'steps', className}: StepsProps) {
    const {eyebrow, heading, intro, items, align, borderTop, borderBottom, cta} =
        content;
    const [active, setActive] = useState(0);
    const [paused, setPaused] = useState(false);
    const [stopped, setStopped] = useState(false);
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const railRef = useRef<HTMLDivElement>(null);

    const running = !paused && !stopped;
    const tabId = (index: number) => `${id}-tab-${items[index]?.id}`;
    const panelId = (index: number) => `${id}-panel-${items[index]?.id}`;

    useEffect(() => {
        if (!running || items.length < 2 || reducedMotion()) return undefined;
        const timer = window.setTimeout(
            () => setActive((index) => (index + 1) % items.length),
            CYCLE_MS,
        );
        return () => window.clearTimeout(timer);
    }, [running, active, items.length]);

    // Keep the active tab centred in its rail — scroll the rail itself, never
    // `scrollIntoView` (that would scroll the page too).
    useEffect(() => {
        const rail = railRef.current;
        const tab = tabRefs.current[active];
        if (!rail || !tab) return;
        const railBox = rail.getBoundingClientRect();
        const tabBox = tab.getBoundingClientRect();
        const delta = tabBox.left + tabBox.width / 2 - (railBox.left + railBox.width / 2);
        rail.scrollTo({
            left: Math.max(0, rail.scrollLeft + delta),
            behavior: reducedMotion() ? 'auto' : 'smooth',
        });
    }, [active]);

    const select = useCallback((index: number) => {
        setActive(index);
        setStopped(true);
    }, []);

    const onTabKeyDown = (event: KeyboardEvent) => {
        const last = items.length - 1;
        const next = (
            {
                ArrowRight: active === last ? 0 : active + 1,
                ArrowLeft: active === 0 ? last : active - 1,
                Home: 0,
                End: last,
            } as Record<string, number>
        )[event.key];
        if (next === undefined) return;
        event.preventDefault();
        select(next);
        tabRefs.current[next]?.focus();
    };

    if (items.length === 0) return null;
    const headingId = `${id}-heading`;

    return (
        <section
            id={id}
            aria-labelledby={heading ? headingId : undefined}
            className={cn('scroll-mt-32', className)}
        >
            <PageDielineSection
                as="div"
                band="muted"
                borderTop={borderTop}
                borderBottom={borderBottom}
                paddingBlock="lg"
            >
                <div className="flex flex-col gap-12">
                    {heading ? (
                        <SectionHeading
                            eyebrow={eyebrow}
                            title={<span id={headingId}>{heading}</span>}
                            description={intro}
                            descriptionClassName="text-base leading-7"
                            align={align}
                            cta={cta}
                        />
                    ) : null}
                    <div
                        className="flex flex-col gap-12"
                        onPointerEnter={() => setPaused(true)}
                        onPointerLeave={() => setPaused(false)}
                        onFocus={() => setPaused(true)}
                        onBlur={() => setPaused(false)}
                    >
                        {/* The bar scrolls rather than wraps — six real titles do
                            not fit one line, and a two-row bar stops reading as
                            one control. */}
                        <div
                            ref={railRef}
                            className="-mx-layout-gutter-inner overflow-x-auto px-layout-gutter-inner [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
                        >
                            <div
                                role="tablist"
                                aria-label={heading ?? 'Steps'}
                                onKeyDown={onTabKeyDown}
                                className="mx-auto flex w-max gap-1 rounded-full border border-border bg-background p-1"
                            >
                                {items.map((item, index) => {
                                    const current = index === active;
                                    return (
                                        <button
                                            key={item.id}
                                            ref={(node) => {
                                                tabRefs.current[index] = node;
                                            }}
                                            id={tabId(index)}
                                            type="button"
                                            role="tab"
                                            aria-selected={current}
                                            aria-controls={panelId(index)}
                                            tabIndex={current ? 0 : -1}
                                            onClick={() => select(index)}
                                            className={cn(
                                                'relative overflow-hidden whitespace-nowrap rounded-full px-4 py-2 text-sm transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground motion-reduce:transition-none',
                                                current
                                                    ? 'bg-muted font-medium text-foreground'
                                                    : 'text-muted-foreground hover:text-foreground',
                                            )}
                                        >
                                            {/* Restarts with each step; gone once the
                                                reader has taken over. */}
                                            {current && !stopped ? (
                                                <span
                                                    key={item.id}
                                                    aria-hidden
                                                    style={
                                                        {
                                                            '--motion-cycle': `${CYCLE_MS}ms`,
                                                            animationPlayState: paused
                                                                ? 'paused'
                                                                : 'running',
                                                        } as CSSProperties
                                                    }
                                                    className="motion-tab-progress absolute inset-0 bg-foreground/10"
                                                />
                                            ) : null}
                                            <span className="relative">{item.title}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="grid">
                            {items.map((item, index) => {
                                const current = index === active;
                                return (
                                    <div
                                        key={item.id}
                                        id={panelId(index)}
                                        role="tabpanel"
                                        aria-labelledby={tabId(index)}
                                        aria-hidden={!current}
                                        style={{gridArea: '1 / 1'}}
                                        className={cn(
                                            'grid grid-cols-1 items-center gap-8 transition-opacity duration-500 ease-out motion-reduce:transition-none lg:grid-cols-12 lg:gap-12',
                                            current ? 'opacity-100' : 'pointer-events-none opacity-0',
                                        )}
                                    >
                                        <div className="flex flex-col items-start gap-4 lg:col-span-6">
                                            <span className="font-mono text-xs text-muted-foreground">
                                                {numeral(index)}
                                            </span>
                                            <h3 className="text-2xl font-medium leading-tight tracking-tight text-foreground sm:text-3xl lg:text-4xl">
                                                {item.title}
                                            </h3>
                                            {item.body ? (
                                                <p className="max-w-xl text-lg leading-8 text-muted-foreground">
                                                    {item.body}
                                                </p>
                                            ) : null}
                                            {item.link ? (
                                                <Link
                                                    href={item.link.href}
                                                    tabIndex={current ? undefined : -1}
                                                    className="group inline-flex w-fit items-center gap-2 text-sm font-medium text-foreground underline-offset-4 hover:underline"
                                                >
                                                    {item.link.label}
                                                    <Icon
                                                        icon={ArrowUpRight}
                                                        className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
                                                    />
                                                </Link>
                                            ) : null}
                                        </div>
                                        {/* The step's own mark, held large — plain on
                                            purpose until a step has art. */}
                                        <div
                                            aria-hidden
                                            className="flex aspect-[4/3] w-full items-center justify-center rounded-xl border border-border bg-background lg:col-span-6"
                                        >
                                            <span className="font-mono text-6xl text-muted-foreground">
                                                {numeral(index)}
                                                <span className="text-foreground/20">
                                                    /{numeral(items.length - 1)}
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </PageDielineSection>
        </section>
    );
}
