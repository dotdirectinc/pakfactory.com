import type {ReactNode} from 'react';

/**
 * Remounts on soft navigations within (site) so page content can CSS-enter.
 * Nav/footer stay in layout.tsx and do not animate.
 */
export default function SiteTemplate({children}: {children: ReactNode}) {
    return (
        <div className="animate-page-enter motion-reduce:animate-none">
            {children}
        </div>
    );
}
