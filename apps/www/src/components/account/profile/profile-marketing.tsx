'use client';

import {useState} from 'react';
import {Mail} from 'lucide-react';
import {Switch} from '@pakfactory/ui/components/switch';
import {ProfileSection} from '@/components/account/profile/profile-section';
import {ACCOUNT_COPY} from '@/lib/copy/account';

type ProfileMarketingSectionProps = {
    initialEnabled: boolean;
};

export function ProfileMarketingSection({
    initialEnabled,
}: ProfileMarketingSectionProps) {
    const [enabled, setEnabled] = useState(initialEnabled);

    return (
        <ProfileSection title={ACCOUNT_COPY.marketingTitle}>
            <div className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="flex items-center gap-3 text-sm text-foreground">
                    <Mail className="size-4 text-muted-foreground" aria-hidden />
                    {ACCOUNT_COPY.fieldEmail}
                </div>
                <Switch
                    checked={enabled}
                    onCheckedChange={setEnabled}
                    aria-label={ACCOUNT_COPY.marketingEmailAria}
                />
            </div>
        </ProfileSection>
    );
}
