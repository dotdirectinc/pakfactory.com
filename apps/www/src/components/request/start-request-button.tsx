'use client';

import {useRouter} from 'next/navigation';
import {Button} from '@pakfactory/ui/components/button';
import {REQUEST_COPY} from '@/lib/copy/request';
import {useRequest} from '@/lib/request/request-provider';
import {WWW_ROUTES} from '@/lib/www-routes';

type StartRequestButtonProps = {
    selectedIds: string[];
    disabled?: boolean;
};

export function StartRequestButton({
    selectedIds,
    disabled = false,
}: StartRequestButtonProps) {
    const router = useRouter();
    const {startFromSelection} = useRequest();
    const selectedCount = selectedIds.length;

    const label =
        selectedCount > 0
            ? REQUEST_COPY.startYourRequestCount.replace(
                  '{n}',
                  String(selectedCount),
              )
            : REQUEST_COPY.startYourRequest;

    function onStart() {
        if (selectedCount === 0) return;
        startFromSelection(selectedIds);
        router.push(WWW_ROUTES.requestProducts);
    }

    return (
        <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={disabled || selectedCount === 0}
            onClick={onStart}
        >
            {label}
        </Button>
    );
}
