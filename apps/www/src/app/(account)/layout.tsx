import type {ReactNode} from 'react';
import {AccountShell} from '@/components/account/account-shell';

/** Account chrome — no marketing site nav. */
export default function AccountRouteLayout({children}: {children: ReactNode}) {
    return <AccountShell>{children}</AccountShell>;
}
