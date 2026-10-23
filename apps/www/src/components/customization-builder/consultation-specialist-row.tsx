'use client';

import {Button} from '@pakfactory/ui/components/button';

import {CUSTOMIZATION_BUILDER_COPY} from '@/components/customization-builder/copy';
import {assignedSpecialist} from '@/lib/account/assigned-specialist';
import {useNavAccount} from '@/lib/auth/use-nav-account';

/**
 * Static handoff under Need consultation. Renders nothing while the session
 * is unresolved, when the buyer is signed out, or when no specialist is assigned.
 * The control does not open a chat or leave the builder.
 */
export function ConsultationSpecialistRow() {
    const session = useNavAccount();
    const specialist = assignedSpecialist(session.status === 'signed-in');
    if (!specialist) return null;

    const label = CUSTOMIZATION_BUILDER_COPY.talkToSpecialist.replace(
        '{name}',
        specialist.name,
    );

    return (
        <div className="flex flex-col items-start gap-2">
            <p className="text-sm font-medium text-foreground">
                {specialist.name}
            </p>
            <Button type="button" variant="outline" size="sm">
                {label}
            </Button>
        </div>
    );
}
