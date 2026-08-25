import type {ReactNode} from 'react';

type AuthCardProps = {
    title: string;
    description?: string;
    children: ReactNode;
    footer?: ReactNode;
};

/**
 * Deliberately minimal. PROD-1841 (Login / Portal UX-UI) is still in Backlog, so
 * this is the functional shell — spacing and tokens only, nothing invented that a
 * designer would then have to argue with. Reskinning it should not require
 * touching the forms or the actions.
 */
export function AuthCard({title, description, children, footer}: AuthCardProps) {
    return (
        <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16">
            <header className="flex flex-col gap-2">
                <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
                {description ? (
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        {description}
                    </p>
                ) : null}
            </header>

            {children}

            {footer ? (
                <footer className="text-muted-foreground text-sm">{footer}</footer>
            ) : null}
        </main>
    );
}
