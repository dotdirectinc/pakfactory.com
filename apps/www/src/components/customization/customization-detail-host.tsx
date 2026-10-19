'use client';

import {createContext, useContext, type ReactNode} from 'react';
import type {
    WorksWithOptionRef,
    WorksWithProductCard,
} from '@/lib/catalog/build-works-with-products';
import type {CustomizationDetail, ProductLineRef} from '@/lib/catalog/types';

export type CustomizationDetailHostValue = {
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

const CustomizationDetailHostContext =
    createContext<CustomizationDetailHostValue | null>(null);

export function CustomizationDetailHostProvider({
    value,
    children,
}: {
    value: CustomizationDetailHostValue;
    children: ReactNode;
}) {
    return (
        <CustomizationDetailHostContext.Provider value={value}>
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
