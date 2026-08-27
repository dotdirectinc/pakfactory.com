'use client';

import {useRouter} from 'next/navigation';
import {Button} from '@pakfactory/ui/components/button';
import {REQUEST_COPY} from '@/lib/copy/request';
import {useRequest} from '@/lib/request/request-provider';
import {WWW_ROUTES} from '@/lib/www-routes';

type StartRequestButtonProps = {
    selectedCount: number;
    disabled?: boolean;
};

export function StartRequestButton({
    selectedCount,
    disabled = false,
}: StartRequestButtonProps) {
    const router = useRouter();
    const {ensureBuilder} = useRequest();

    const label =
        selectedCount > 0
            ? REQUEST_COPY.startYourRequestCount.replace(
                  '{n}',
                  String(selectedCount),
              )
            : REQUEST_COPY.startYourRequest;

    function onStart() {
        ensureBuilder({mode: 'products'});
        router.push(WWW_ROUTES.requestBuilder);
    }

    return (
        <Button
            type="button"
            className="w-full"
            disabled={disabled || selectedCount === 0}
            onClick={onStart}
        >
            {label}
        </Button>
    );
}
