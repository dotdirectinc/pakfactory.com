import {redirect} from 'next/navigation';
import {WWW_ROUTES} from '@/lib/www-routes';

export default function AccountIndexPage() {
    redirect(WWW_ROUTES.accountRequests);
}
