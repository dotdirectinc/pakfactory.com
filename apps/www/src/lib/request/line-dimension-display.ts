import {resolveProductDims} from '@pakfactory/sanity/resolve-product-dims';
import {
    DIMENSIONS_STEP_KEY,
    formatDimensionsSummary,
    getAnswer,
} from '@/lib/customization-builder';
import type {RequestLine} from '@/lib/request/request.storage';

/**
 * Readable size for review paper Customization / product card.
 * Returns undefined when unset / not-sure / empty so callers can collapse to a
 * single specialist line when nothing else is set.
 */
export function lineDimensionDisplay(
    line: RequestLine,
): string | undefined {
    const answer = line.customizationBuilder
        ? getAnswer(line.customizationBuilder, DIMENSIONS_STEP_KEY)
        : undefined;

    if (!answer || answer.status === 'unset') return undefined;
    if (answer.status === 'not-sure') return undefined;
    if (!('dimensions' in answer)) return undefined;

    const axisIds = line.dimensionInput?.trim()
        ? resolveProductDims(line.dimensionInput).axes
        : undefined;
    const summary = formatDimensionsSummary(
        answer.dimensions,
        axisIds,
    ).trim();
    return summary || undefined;
}
