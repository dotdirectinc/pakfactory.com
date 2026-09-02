'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {cn} from '@pakfactory/ui/lib/utils';
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from '@pakfactory/ui/components/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@pakfactory/ui/components/dropdown-menu';
import {signOut} from '@/lib/auth/actions';
import {ACCOUNT_COPY} from '@/lib/copy/account';
import {WWW_ROUTES} from '@/lib/www-routes';

export type AccountMenuProps = {
    displayName: string;
    email: string;
    /** The login provider's photo, when the session came with one. */
    avatarUrl?: string;
};

/**
 * Presentation only, kept out of AccountMenuProps so that stays the plain data
 * contract a server layout can serialize.
 */
type AccountMenuLayout = {
    /** 'sm' matches the nav's request folder. The account shell uses the default. */
    size?: 'default' | 'sm';
};

const NAV_ITEMS = [
    {
        href: WWW_ROUTES.accountRequests,
        label: ACCOUNT_COPY.requestsTitle,
    },
    {
        href: WWW_ROUTES.accountProfile,
        label: ACCOUNT_COPY.profileTitle,
    },
] as const;

function isNavActive(pathname: string, href: string): boolean {
    if (href === WWW_ROUTES.accountRequests) {
        return (
            pathname === href ||
            pathname.startsWith(`${WWW_ROUTES.accountRequests}/`) ||
            pathname === WWW_ROUTES.account
        );
    }
    return pathname === href || pathname.startsWith(`${href}/`);
}

/** Up to two initials, so the fallback stays legible in a 32px circle. */
function initialsOf(name: string): string {
    const words = name.split(/\s+/).filter(Boolean).slice(0, 2);
    return words.map((word) => word[0]?.toUpperCase() ?? '').join('');
}

/**
 * The signed-in identity control: avatar trigger plus account navigation and
 * sign out. Shared by the account shell and the marketing site header, so a
 * signed-in buyer sees the same control wherever they are.
 */
export function AccountMenu({
    displayName,
    email,
    avatarUrl,
    size = 'default',
}: AccountMenuProps & AccountMenuLayout) {
    const pathname = usePathname();
    const initials = initialsOf(displayName || email);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                aria-label={ACCOUNT_COPY.accountMenu}
                className={cn(
                    'rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    // Match the request folder's 36px button so the 24px avatar
                    // keeps a comfortable target instead of a bare 24px one.
                    size === 'sm' && 'flex size-9 items-center justify-center',
                )}
            >
                {/*
                  alt is empty on purpose: the trigger is already labelled, and a
                  second label would be announced twice. Radix falls back to the
                  initials on its own when the image is missing or fails to load.
                */}
                <Avatar size={size}>
                    {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
                    <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
                <DropdownMenuLabel className="font-normal">
                    <span className="block truncate text-sm font-medium">
                        {displayName}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                        {email}
                    </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {NAV_ITEMS.map((item) => {
                    const active = isNavActive(pathname, item.href);
                    return (
                        <DropdownMenuItem key={item.href} asChild>
                            <Link
                                href={item.href}
                                className={cn(active && 'font-medium')}
                                aria-current={active ? 'page' : undefined}
                            >
                                {item.label}
                            </Link>
                        </DropdownMenuItem>
                    );
                })}
                <DropdownMenuSeparator />
                {/*
                  A form, not a Link: signing out mutates state, and a GET that
                  changes state can be fired by a prefetch or a link scanner. The
                  item is the button rather than the form, so the whole row
                  submits — wrapping the form in the item leaves its padding dead.
                */}
                <form action={signOut}>
                    <DropdownMenuItem asChild>
                        <button type="submit" className="w-full text-left">
                            {ACCOUNT_COPY.signOut}
                        </button>
                    </DropdownMenuItem>
                </form>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
