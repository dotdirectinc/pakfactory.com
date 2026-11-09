/**
 * "Added to compare" that reads "Remove from compare" on hover or keyboard focus (compare spec
 * CMP-7). The parent button needs the `group/cmp` class.
 */
export function CompareToggleLabel({inCompare}: {inCompare: boolean}) {
    if (!inCompare) return <>Add to compare</>;
    return (
        <>
            <span className="group-hover/cmp:hidden group-focus-visible/cmp:hidden">Added to compare</span>
            <span className="hidden group-hover/cmp:inline group-focus-visible/cmp:inline">Remove from compare</span>
        </>
    );
}
