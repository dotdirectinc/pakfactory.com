import type {ReactNode} from 'react';

import {SoftPageTransition} from '@/components/layout/soft-page-transition';

/**
 * Remounts on soft navigations within (site) so page content can CSS-enter
 * and scroll resets to top. Nav/footer stay in layout.tsx and do not animate.
 * Transition logic lives in {@link SoftPageTransition} (DESIGN.md § Motion).
 */
export default function SiteTemplate({children}: {children: ReactNode}) {
    return <SoftPageTransition>{children}</SoftPageTransition>;
}
