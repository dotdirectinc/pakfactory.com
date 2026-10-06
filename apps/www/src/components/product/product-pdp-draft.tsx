'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type Dispatch,
    type ReactNode,
    type SetStateAction,
} from 'react';
import {CUSTOMIZATION_BUILDER_COPY} from '@/components/customization-builder/copy';
import {showToastCard} from '@/components/ui/toast-card';
import type {Product} from '@/lib/catalog/types';
import {REQUEST_COPY} from '@/lib/copy/request';
import {
    buildStepsFromCatalog,
    createEmptyBuilderState,
    isBuilderConfigured,
    seedFromCustomizations,
    toRequestCustomizations,
    type CustomizationBuilderState,
} from '@/lib/customization-builder';
import {useRequest} from '@/lib/request/request-provider';
import type {RequestReferenceImage} from '@/lib/request/request.storage';
import {WWW_ROUTES} from '@/lib/www-routes';

export type MissingRequestField = 'quantity' | 'contents';

function formatVolume(n: number): string {
    return n.toLocaleString('en-US');
}

function initialBuilderState(product: Product): CustomizationBuilderState {
    const isInspiration = product.kind === 'inspiration';
    const preselected = product.availableCustomizations.filter(
        (item) => item.preselected === true,
    );
    if (isInspiration && preselected.length) {
        return seedFromCustomizations(preselected);
    }
    return createEmptyBuilderState();
}

/** DIY signal for sticky bar — specialist-empty alone does not count. */
export function hasDiyBuilderSignal(state: CustomizationBuilderState): boolean {
    if (isBuilderConfigured(state)) return true;
    if (
        Object.values(state.entryNotes).some(
            (note) => typeof note === 'string' && note.trim().length > 0,
        )
    ) {
        return true;
    }
    const summaries = state.propertySelectionSummaries;
    if (!summaries) return false;
    return Object.values(summaries).some(
        (items) => Array.isArray(items) && items.length > 0,
    );
}

function countCustomizations(state: CustomizationBuilderState): number {
    let count = 0;
    for (const answer of Object.values(state.answers)) {
        if (!answer || answer.status === 'unset') continue;
        if (answer.status === 'not-sure') {
            count += 1;
            continue;
        }
        if ('selections' in answer) {
            count += answer.selections.length;
            continue;
        }
        if ('dimensions' in answer) {
            count += 1;
        }
    }
    return count;
}

export function buildConfigurationSummaryParts(input: {
    volumes: number[];
    contents: string;
    builderState: CustomizationBuilderState;
}): string[] {
    const parts: string[] = [];
    if (input.volumes.length > 0) {
        parts.push(
            input.volumes
                .map((volume) => `${formatVolume(volume)} ${REQUEST_COPY.unitsSuffix}`)
                .join(', '),
        );
    }
    const customCount = countCustomizations(input.builderState);
    if (customCount === 1) {
        parts.push(REQUEST_COPY.customizationCountOne);
    } else if (customCount > 1) {
        parts.push(
            REQUEST_COPY.customizationCountMany.replace('{n}', String(customCount)),
        );
    }
    const contents = input.contents.trim();
    if (contents) parts.push(contents);
    return parts;
}

type ProductPdpDraftContextValue = {
    product: Product;
    volumes: number[];
    contents: string;
    detailsOptIn: boolean;
    notes: string;
    referenceImages: RequestReferenceImage[];
    builderState: CustomizationBuilderState;
    draftId: string;
    ready: boolean;
    showStickyBar: boolean;
    missingForRequest: MissingRequestField[];
    summaryParts: string[];
    addVolume: (volume: number) => void;
    removeVolume: (volume: number) => void;
    setContents: (value: string) => void;
    setDetailsOptIn: (value: boolean) => void;
    setNotes: (value: string) => void;
    setReferenceImages: Dispatch<SetStateAction<RequestReferenceImage[]>>;
    setBuilderState: Dispatch<SetStateAction<CustomizationBuilderState>>;
    resetDraft: () => void;
    handleAdd: () => void;
};

const ProductPdpDraftContext = createContext<ProductPdpDraftContextValue | null>(
    null,
);

type ProductPdpDraftProviderProps = {
    product: Product;
    children: ReactNode;
};

export function ProductPdpDraftProvider({
    product,
    children,
}: ProductPdpDraftProviderProps) {
    const {addLine, draft} = useRequest();
    const isInspiration = product.kind === 'inspiration';

    const [volumes, setVolumes] = useState<number[]>([]);
    const [contents, setContents] = useState('');
    const [detailsOptIn, setDetailsOptIn] = useState(false);
    const [notes, setNotes] = useState('');
    const [referenceImages, setReferenceImages] = useState<
        RequestReferenceImage[]
    >([]);
    const [builderState, setBuilderState] = useState<CustomizationBuilderState>(
        () => initialBuilderState(product),
    );
    const skipProductResetRef = useRef(true);

    // Soft-nav between PDPs remounts slowly; reset draft when the product changes.
    useEffect(() => {
        if (skipProductResetRef.current) {
            skipProductResetRef.current = false;
            return;
        }
        setVolumes([]);
        setContents('');
        setDetailsOptIn(false);
        setNotes('');
        setReferenceImages((prev) => {
            for (const image of prev) {
                if (image.url.startsWith('blob:')) {
                    URL.revokeObjectURL(image.url);
                }
            }
            return [];
        });
        setBuilderState(initialBuilderState(product));
    }, [product.slug]);

    const contentsReady = Boolean(contents.trim());
    const ready = volumes.length > 0 && contentsReady;
    const hasQuantity = volumes.length > 0;
    const hasContents = contentsReady;
    const showStickyBar =
        hasQuantity || hasContents || hasDiyBuilderSignal(builderState);

    const missingForRequest = useMemo(() => {
        const missing: MissingRequestField[] = [];
        if (!hasQuantity) missing.push('quantity');
        if (!hasContents) missing.push('contents');
        return missing;
    }, [hasQuantity, hasContents]);

    const summaryParts = useMemo(
        () =>
            buildConfigurationSummaryParts({
                volumes,
                contents,
                builderState,
            }),
        [volumes, contents, builderState],
    );

    const addVolume = useCallback((volume: number) => {
        setVolumes((prev) =>
            prev.includes(volume) ? prev : [...prev, volume].sort((a, b) => a - b),
        );
    }, []);

    const removeVolume = useCallback((volume: number) => {
        setVolumes((prev) => prev.filter((item) => item !== volume));
    }, []);

    const resetDraft = useCallback(() => {
        for (const image of referenceImages) {
            if (image.url.startsWith('blob:')) {
                URL.revokeObjectURL(image.url);
            }
        }
        setVolumes([]);
        setContents('');
        setDetailsOptIn(false);
        setNotes('');
        setReferenceImages([]);
        setBuilderState(initialBuilderState(product));
    }, [product, referenceImages]);

    const handleAdd = useCallback(() => {
        if (!ready) return;
        const customizations = toRequestCustomizations(
            builderState,
            CUSTOMIZATION_BUILDER_COPY.specialistToAdvise,
            buildStepsFromCatalog(product.availableCustomizations),
        );
        addLine({
            productSlug: product.slug,
            productTitle: product.title,
            productSku: product.sku,
            productLineTitle: product.productLine.title,
            ...(product.moq ? {productMoq: product.moq} : {}),
            productMedia: product.media,
            availableCustomizations: product.availableCustomizations,
            ...(product.customizationRules
                ? {customizationRules: product.customizationRules}
                : {}),
            ...(product.dimensionInput
                ? {dimensionInput: product.dimensionInput}
                : {}),
            ...(product.dimensionRange
                ? {dimensionRange: product.dimensionRange}
                : {}),
            quantities: volumes,
            contents,
            customizations,
            customizationBuilder: builderState,
            ...(detailsOptIn && notes.trim() ? {notes} : {}),
            ...(detailsOptIn && referenceImages.length
                ? {referenceImages}
                : {}),
        });
        showToastCard({
            title: REQUEST_COPY.addedToYourRequest,
            action: {
                label: REQUEST_COPY.viewYourRequest,
                href: WWW_ROUTES.request,
            },
            dismissLabel: REQUEST_COPY.close,
        });
        if (!detailsOptIn) {
            for (const image of referenceImages) {
                if (image.url.startsWith('blob:')) {
                    URL.revokeObjectURL(image.url);
                }
            }
        }
        setVolumes([]);
        setContents('');
        setDetailsOptIn(false);
        setNotes('');
        setReferenceImages([]);
        const preselected = product.availableCustomizations.filter(
            (item) => item.preselected === true,
        );
        setBuilderState(
            isInspiration && preselected.length
                ? seedFromCustomizations(preselected)
                : createEmptyBuilderState(),
        );
    }, [
        ready,
        builderState,
        product,
        addLine,
        volumes,
        contents,
        detailsOptIn,
        notes,
        referenceImages,
        isInspiration,
    ]);

    const value = useMemo<ProductPdpDraftContextValue>(
        () => ({
            product,
            volumes,
            contents,
            detailsOptIn,
            notes,
            referenceImages,
            builderState,
            draftId: draft.id,
            ready,
            showStickyBar,
            missingForRequest,
            summaryParts,
            addVolume,
            removeVolume,
            setContents,
            setDetailsOptIn,
            setNotes,
            setReferenceImages,
            setBuilderState,
            resetDraft,
            handleAdd,
        }),
        [
            product,
            volumes,
            contents,
            detailsOptIn,
            notes,
            referenceImages,
            builderState,
            draft.id,
            ready,
            showStickyBar,
            missingForRequest,
            summaryParts,
            addVolume,
            removeVolume,
            resetDraft,
            handleAdd,
        ],
    );

    return (
        <ProductPdpDraftContext.Provider value={value}>
            {children}
        </ProductPdpDraftContext.Provider>
    );
}

export function useProductPdpDraft(): ProductPdpDraftContextValue {
    const value = useContext(ProductPdpDraftContext);
    if (!value) {
        throw new Error(
            'useProductPdpDraft must be used within ProductPdpDraftProvider',
        );
    }
    return value;
}
