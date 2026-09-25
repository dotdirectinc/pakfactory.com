import type {ReactNode} from 'react';

/**
 * Page-enter when settled content mounts after a `loading.tsx` shell.
 * Same motion as {@link SoftPageTransition} (`animate-page-enter` /
 * `--motion-slow`). Use only on views behind a loading boundary — other
 * routes rely on the site template remount alone (DESIGN.md § Motion).
 */
export function PageEnter({children}: {children: ReactNode}) {
    return (
        <div className="animate-page-enter motion-reduce:animate-none">
            {children}
        </div>
    );
}
