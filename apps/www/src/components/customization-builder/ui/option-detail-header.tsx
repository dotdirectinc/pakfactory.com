import type {ReactNode} from 'react';

type OptionDetailHeaderProps = {
    title: string;
    description?: string;
    shortDescription?: string;
    /** Option media for the detail column preview. */
    imageUrl?: string | null;
    /**
     * Desktop detail draws a square frame even when `imageUrl` is empty.
     * Need consultation has no thumbnail, so that panel turns the frame off.
     */
    showMedia?: boolean;
    children?: ReactNode;
    /**
     * Stacked drill-in: title lives in the chrome bar, so skip the duplicate
     * h3 and keep media short enough that spec fields sit above the footer.
     */
    compact?: boolean;
};

/**
 * Shared identity header for the builder detail column.
 * Title + copy beside a square preview frame (image or muted placeholder).
 */
export function OptionDetailHeader({
    title,
    description,
    shortDescription,
    imageUrl,
    showMedia = true,
    children,
    compact = false,
}: OptionDetailHeaderProps) {
    const body = description?.trim() || shortDescription?.trim() || '';
    const src = imageUrl?.trim() || '';

    const copy = (
        <div className="min-w-0">
            {compact ? null : (
                <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    {title}
                </h3>
            )}
            {body ? (
                <p
                    className={
                        compact
                            ? 'text-sm leading-relaxed text-muted-foreground'
                            : 'mt-1 text-sm leading-relaxed text-muted-foreground'
                    }
                >
                    {body}
                </p>
            ) : null}
        </div>
    );

    if (!showMedia) {
        return (
            <div className="flex flex-col gap-4">
                {copy}
                {children}
            </div>
        );
    }

    if (compact) {
        return (
            <div className="flex flex-col gap-4">
                {src ? (
                    <div
                        className="flex max-h-40 w-full items-center justify-center overflow-hidden rounded-[var(--radius-control)] bg-muted"
                        role="img"
                        aria-label={title}
                    >
                        <img
                            src={src}
                            alt=""
                            className="max-h-40 w-full object-contain"
                        />
                    </div>
                ) : null}
                {copy}
                {children}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-[3fr_2fr]">
                <div
                    className="aspect-square w-full overflow-hidden rounded-[var(--radius-control)] bg-muted"
                    role="img"
                    aria-label={title}
                >
                    {src ? (
                        <img
                            src={src}
                            alt=""
                            className="size-full object-cover"
                        />
                    ) : null}
                </div>
                {copy}
            </div>
            {children}
        </div>
    );
}
