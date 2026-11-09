import type {ReactNode} from 'react';

/**
 * Chrome-less compare shell — no site nav / footer.
 * RequestRoot is on the root layout (Add to Quote, Apply, dock).
 */
export default function CompareLayout({children}: {children: ReactNode}) {
    return children;
}
