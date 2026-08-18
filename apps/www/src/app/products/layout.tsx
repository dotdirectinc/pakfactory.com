import {RequestRoot} from '@/lib/request/request-root';

export default function ProductsLayout({children}: {children: React.ReactNode}) {
    return <RequestRoot>{children}</RequestRoot>;
}
