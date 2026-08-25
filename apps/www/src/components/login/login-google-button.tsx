'use client';

import {Badge} from '@pakfactory/ui/components/badge';
import {Button} from '@pakfactory/ui/components/button';

function GoogleMark({className}: {className?: string}) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
        >
            <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
        </svg>
    );
}

type LoginGoogleButtonProps = {
    label: string;
    /** Copy for the inline unavailability badge. */
    comingSoonLabel?: string;
};

/**
 * Inert until OAuth is actually in scope.
 *
 * PROD-1426 explicitly excludes social/SSO providers, so this renders a control
 * that cannot work. Shipping it live would be a button that silently does
 * nothing; hiding it loses the design intent. It is disabled and SAYS SO.
 *
 * Three deliberate choices:
 *
 *  - `aria-disabled`, not `disabled`. A real `disabled` attribute drops the
 *    button out of the tab order, so keyboard and screen-reader users meet a
 *    control they can neither reach nor be told about. This stays focusable and
 *    announces "Continue with Google, Coming soon" as its accessible name.
 *  - A VISIBLE badge, not a tooltip. Tooltips need hover, and hover does not
 *    exist on phones or tablets — a large share of this audience. A tooltip
 *    would explain the button to desktop users and leave everyone else tapping a
 *    dead control. (`disabled` would also suppress the hover event entirely.)
 *  - No click-to-explain popup. Making someone act to discover that acting is
 *    pointless is the worst of the options.
 */
export function LoginGoogleButton({
    label,
    comingSoonLabel = 'Coming soon',
}: LoginGoogleButtonProps) {
    return (
        <Button
            type="button"
            variant="outline"
            aria-disabled="true"
            // aria-disabled is advisory only — the handler must actually refuse,
            // or the control stays clickable for anyone using a mouse.
            onClick={(event) => event.preventDefault()}
            className="h-11 w-full cursor-not-allowed rounded-sm opacity-70 hover:bg-background"
        >
            <GoogleMark className="size-4" />
            {label}
            <Badge variant="secondary" className="ml-1">
                {comingSoonLabel}
            </Badge>
        </Button>
    );
}
