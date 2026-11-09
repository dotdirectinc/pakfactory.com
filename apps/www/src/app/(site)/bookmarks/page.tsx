import type {Metadata} from 'next';

import {BookmarksView} from '@/components/bookmarks/bookmarks-view';
import {robotsDirectiveToMetadata} from '@/lib/seo';

export const metadata: Metadata = {
    title: 'Bookmarks',
    robots: robotsDirectiveToMetadata({index: false, follow: false}),
};

export default function BookmarksPage() {
    return <BookmarksView />;
}
