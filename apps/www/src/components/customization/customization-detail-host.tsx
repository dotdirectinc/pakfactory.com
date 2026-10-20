'use client';

import {
    createContext,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import type {
    WorksWithOptionRef,
    WorksWithProductCard,
} from '@/lib/catalog/build-works-with-products';
import type {CustomizationDetail, ProductLineRef} from '@/lib/catalog/types';

export type CustomizationDetailHostData = {
    detail: CustomizationDetail;
    peers: CustomizationDetail[];
    worksWith: {
        option: WorksWithOptionRef;
        lines: ProductLineRef[];
        products: WorksWithProductCard[];
    };
    /** True when the template includes the learn-first overview section. */
    isLearnFirstTemplate: boolean;
};

export type CustomizationDetailHostValue = CustomizationDetailHostData & {
    /** Selected product-line slug in the works-with band; null = first line. */
    worksWithLine: string | null;
    setWorksWithLine: (slug: string) => void;
};

const CustomizationDetailHostContext =
    createContext<CustomizationDetailHostValue | null>(null);

export function CustomizationDetailHostProvider({
    value,
    children,
}: {
    value: CustomizationDetailHostData;
    children: ReactNode;
}) {
    const [worksWithLine, setWorksWithLine] = useState<string | null>(null);
    const ctx = useMemo(
        () => ({...value, worksWithLine, setWorksWithLine}),
        [value, worksWithLine],
    );

    return (
        <CustomizationDetailHostContext.Provider value={ctx}>
            {children}
        </CustomizationDetailHostContext.Provider>
    );
}

export function useCustomizationDetailHost(): CustomizationDetailHostValue {
    const ctx = useContext(CustomizationDetailHostContext);
    if (!ctx) {
        throw new Error(
            'useCustomizationDetailHost must be used within CustomizationDetailHostProvider',
        );
    }
    return ctx;
}

export function useCustomizationDetailHostOptional(): CustomizationDetailHostValue | null {
    return useContext(CustomizationDetailHostContext);
}
