import type {Metadata} from 'next';
import type {ContentPageDoc} from '@pakfactory/sanity/queries';
import {robotsDirectiveToMetadata} from '@/lib/seo';

export function contentPageMetadata(page: ContentPageDoc): Metadata {
    const title = page.metaTitle?.trim() || page.title?.trim() || 'Page';
    const description = page.metaDescription?.trim() || undefined;
    return {
        title,
        ...(description ? {description} : {}),
        robots: robotsDirectiveToMetadata({
            index: page.allowIndex !== false,
            follow: page.allowFollow !== false,
        }),
    };
}
