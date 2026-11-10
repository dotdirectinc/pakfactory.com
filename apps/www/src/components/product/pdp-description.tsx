'use client';

import {useEffect, useRef, useState} from 'react';
import {PRODUCT_DETAIL_COPY} from '@/lib/copy/product-detail';
import {cn} from '@pakfactory/ui/lib/utils';

/**
 * PDP hero description: three-line clamp with Read more / Show less when
 * the text overflows. Expands inline under the same block.
 */
export function PdpDescription({text}: {text: string}) {
    const ref = useRef<HTMLParagraphElement>(null);
    const [expanded, setExpanded] = useState(false);
    const [overflows, setOverflows] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const measure = () => {
            if (expanded) return;
            setOverflows(el.scrollHeight > el.clientHeight + 1);
        };

        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [text, expanded]);

    return (
        <div className="mt-4">
            <p
                ref={ref}
                className={cn(
                    'text-base leading-relaxed text-muted-foreground',
                    !expanded && 'line-clamp-3',
                )}
            >
                {text}
            </p>
            {overflows || expanded ? (
                <button
                    type="button"
                    className="mt-2 text-sm font-medium text-foreground underline underline-offset-4"
                    onClick={() => setExpanded((open) => !open)}
                    aria-expanded={expanded}
                >
                    {expanded
                        ? PRODUCT_DETAIL_COPY.descriptionShowLess
                        : PRODUCT_DETAIL_COPY.descriptionReadMore}
                </button>
            ) : null}
        </div>
    );
}
