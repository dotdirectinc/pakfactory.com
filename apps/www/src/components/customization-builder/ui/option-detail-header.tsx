import type {ReactNode} from 'react';

type OptionDetailHeaderProps = {
    title: string;
    description?: string;
    shortDescription?: string;
    /** Option media for the detail column preview. */
    imageUrl?: string | null;
    children?: ReactNode;
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
    children,
}: OptionDetailHeaderProps) {
    const body = description?.trim() || shortDescription?.trim() || '';
    const src = imageUrl?.trim() || '';

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
                <div className="min-w-0">
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">
                        {title}
                    </h3>
                    {body ? (
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                            {body}
                        </p>
                    ) : null}
                </div>
            </div>
            {children}
        </div>
    );
}
