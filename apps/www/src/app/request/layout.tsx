import {RequestRoot} from '@/lib/request/request-root';

export default function RequestLayout({children}: {children: React.ReactNode}) {
    return <RequestRoot>{children}</RequestRoot>;
}
