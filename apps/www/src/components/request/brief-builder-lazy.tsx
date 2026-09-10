'use client';

import dynamic from 'next/dynamic';

const BriefBuilder = dynamic(
    () =>
        import('@/components/request/brief-builder').then(
            (mod) => mod.BriefBuilder,
        ),
    {ssr: false},
);

type BriefBuilderLazyProps = {
    mode?: 'builder' | 'express' | 'products' | 'services';
    deferStart?: boolean;
};

/** Code-split BriefBuilder for /request/* routes (PROD-2456). */
export function BriefBuilderLazy(props: BriefBuilderLazyProps) {
    return <BriefBuilder {...props} />;
}
