import type {ReactNode} from 'react';

/** Auth chrome — no marketing site nav. */
export default function AuthLayout({children}: {children: ReactNode}) {
    return <div className="min-h-screen bg-background">{children}</div>;
}
