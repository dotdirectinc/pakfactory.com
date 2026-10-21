'use client';

import {useState} from 'react';
import {ChevronDown} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';

import {CustomizationCompatibleOptionCard} from '@/components/customization/customization-compatible-option-card';
import type {CustomizationCompatibleOption} from '@/lib/catalog/types';

const PAGE_SIZE = 8;

type CustomizationCompatibleOptionsGridProps = {
    options: CustomizationCompatibleOption[];
};

export function CustomizationCompatibleOptionsGrid({
    options,
}: CustomizationCompatibleOptionsGridProps) {
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const visible = options.slice(0, visibleCount);
    const canLoadMore = visibleCount < options.length;

    return (
        <>
            <ul className="mt-8 grid list-none grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {visible.map((option) => (
                    <li key={option.id}>
                        <CustomizationCompatibleOptionCard option={option} />
                    </li>
                ))}
            </ul>
            {canLoadMore ? (
                <div className="mt-8 flex justify-center">
                    <Button
                        type="button"
                        variant="link"
                        onClick={() =>
                            setVisibleCount((count) => count + PAGE_SIZE)
                        }
                        className="gap-1 font-semibold text-primary"
                    >
                        Show more
                        <ChevronDown className="size-4" aria-hidden />
                    </Button>
                </div>
            ) : null}
        </>
    );
}
