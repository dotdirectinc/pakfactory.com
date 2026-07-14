import Image from 'next/image';
import Link from 'next/link';

import { Badge } from '@pakfactory/ui/components/badge';
import {
    Card,
    CardContent,
    CardFooter,
} from '@pakfactory/ui/components/card';

export type CapabilityCardItem = {
    _id: string;
    title: string;
    slug: string;
    categoryValue: 'material' | 'finish';
    categoryLabel?: string;
    imageUrl?: string | null;
    imageAlt?: string | null;
};

type Props = {
    item: CapabilityCardItem;
};

export function CapabilityCard({ item }: Props) {
    const href = `/capabilities/${item.categoryValue}/${item.slug}`;
    return (
        <Link href={href} className="group block">
            <Card className="overflow-hidden p-0 gap-0 transition-shadow hover:shadow-md">
                <CardContent className="p-0">
                    <div className="relative aspect-[4/3] w-full bg-muted">
                        {item.imageUrl ? (
                            <Image
                                src={item.imageUrl}
                                alt={item.imageAlt ?? item.title}
                                fill
                                sizes="(max-width: 640px) 100vw, (max-width: 1280px) 33vw, 20vw"
                                className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                            />
                        ) : null}
                    </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="truncate text-sm font-medium">{item.title}</span>
                    {item.categoryLabel ? (
                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                            {item.categoryLabel}
                        </Badge>
                    ) : null}
                </CardFooter>
            </Card>
        </Link>
    );
}
