'use client';

import Link from 'next/link';
import {Button} from '@pakfactory/ui/components/button';
import {ProfileCompanyAddressSection} from '@/components/account/profile/profile-company-address';
import {ProfileContactSection} from '@/components/account/profile/profile-contact';
import {ProfileMarketingSection} from '@/components/account/profile/profile-marketing';
import {ProfileShippingAddressesSection} from '@/components/account/profile/profile-shipping-addresses';
import type {ProfileMock} from '@/lib/account/profile-mock';
import {ACCOUNT_COPY} from '@/lib/copy/account';
import {WWW_ROUTES} from '@/lib/www-routes';

type ProfileViewProps = {
    profile: ProfileMock;
};

export function ProfileView({profile}: ProfileViewProps) {
    return (
        <div className="mx-auto flex max-w-2xl flex-col gap-8">
            <h1 className="text-3xl font-bold tracking-tight">
                {ACCOUNT_COPY.profileTitle}
            </h1>

            <ProfileContactSection contact={profile.contact} />
            <ProfileCompanyAddressSection address={profile.companyAddress} />
            <ProfileShippingAddressesSection
                addresses={profile.shippingAddresses}
            />
            <ProfileMarketingSection
                initialEnabled={profile.marketingEmail}
            />

            <div>
                <Button asChild variant="outline" className="rounded-full">
                    <Link href={WWW_ROUTES.login}>{ACCOUNT_COPY.signOut}</Link>
                </Button>
            </div>
        </div>
    );
}
