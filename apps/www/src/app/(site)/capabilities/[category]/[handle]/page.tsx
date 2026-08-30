import type {Metadata} from 'next';
import {notFound} from 'next/navigation';

export const revalidate = 60;

export async function generateStaticParams(): Promise<
    {category: string; handle: string}[]
> {
    return [];
}

export async function generateMetadata(): Promise<Metadata> {
    return {title: 'Capability'};
}

export default async function CapabilityDetailPage() {
    notFound();
}
