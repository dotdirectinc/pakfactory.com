import type {Metadata} from 'next';
import {robotsDirectiveToMetadata} from '@/lib/seo';

type ComingSoonPageProps = {
    title: string;
    note?: string;
};

export function comingSoonMetadata(title: string): Metadata {
    return {
        title,
        robots: robotsDirectiveToMetadata({index: false, follow: false}),
    };
}

export function ComingSoonPage({title, note}: ComingSoonPageProps) {
    return (
        <main className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">
                {note ?? 'This page is reserved. Content is coming soon.'}
            </p>
        </main>
    );
}
