'use client';

import {createContext, useContext, useState, type PointerEvent, type ReactNode} from 'react';
import {ImageIcon} from 'lucide-react';
import {cn} from '@pakfactory/ui/lib/utils';

/**
 * R42 (owner Nov 3): customization picks show a small image; on hover (mouse only) a larger
 * preview follows the cursor. Never on touch, never blocks clicks.
 */
type Preview = {src: string; label: string; x: number; y: number};
const PreviewCtx = createContext<((p: Preview | null) => void) | null>(null);

export function PickImagePreviewProvider({children}: {children: ReactNode}) {
    const [preview, setPreview] = useState<Preview | null>(null);
    return (
        <PreviewCtx.Provider value={setPreview}>
            {children}
            {preview ? (
                <div
                    aria-hidden
                    className="pointer-events-none fixed z-50 w-44 overflow-hidden rounded-lg border border-border bg-background shadow-lg"
                    style={{
                        // Keep it on screen: flip left/up near the right/bottom edges.
                        left: preview.x + 192 > window.innerWidth ? preview.x - 192 : preview.x + 16,
                        top: preview.y + 220 > window.innerHeight ? preview.y - 220 : preview.y + 16,
                    }}
                >
                    <img src={preview.src} alt="" className="aspect-square w-full bg-muted object-cover" />
                    <p className="px-2.5 py-2 text-xs font-medium text-foreground">{preview.label}</p>
                </div>
            ) : null}
        </PreviewCtx.Provider>
    );
}

/** Owner Nov 3: stand-in for a pick with no catalog image (e.g. "Outside only"), so the column stays even. */
export function PickThumbPlaceholder() {
    return (
        <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-[4px] border border-border bg-muted text-muted-foreground">
            <ImageIcon className="size-3.5" />
        </span>
    );
}

/** A small thumbnail (or colour dot) that previews larger on mouse hover. */
export function PickThumb({src, color, label, size = 'md'}: {src?: string; color?: string; label: string; size?: 'sm' | 'md'}) {
    const setPreview = useContext(PreviewCtx);
    const box = size === 'sm' ? 'size-4 rounded-[3px]' : 'size-7 rounded-[4px]';
    if (!src) {
        return color ? <span aria-hidden className={cn('shrink-0 rounded-full border border-border', size === 'sm' ? 'size-3.5' : 'size-5')} style={{background: color}} /> : null;
    }
    const move = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse' || !setPreview) return;
        setPreview({src, label, x: e.clientX, y: e.clientY});
    };
    return (
        <span
            className={cn('shrink-0 overflow-hidden border border-border bg-muted', box)}
            onPointerEnter={move}
            onPointerMove={move}
            onPointerLeave={() => setPreview?.(null)}
        >
            <img src={src} alt="" className="size-full object-cover" loading="lazy" />
        </span>
    );
}
