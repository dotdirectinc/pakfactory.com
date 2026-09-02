'use client';

import {KeyRound} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {ProfileSection} from '@/components/account/profile/profile-section';
import {sendPasswordResetForCurrentUser} from '@/lib/auth/actions';
import {ACCOUNT_COPY} from '@/lib/copy/account';

export function ProfilePasswordSection() {
    return (
        <ProfileSection title={ACCOUNT_COPY.passwordTitle}>
            <div className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="flex items-center gap-3 text-sm text-foreground">
                    <KeyRound
                        className="size-4 text-muted-foreground"
                        aria-hidden
                    />
                    {ACCOUNT_COPY.resetPasswordDescription}
                </div>
                {/*
                  A form, not a Link: sending the reset email mutates state, so it
                  must not be reachable by a prefetch or a link scanner.
                */}
                <form action={sendPasswordResetForCurrentUser}>
                    <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                    >
                        {ACCOUNT_COPY.resetPassword}
                    </Button>
                </form>
            </div>
        </ProfileSection>
    );
}
