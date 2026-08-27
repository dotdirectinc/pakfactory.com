'use client';

import Link from 'next/link';
import {Button} from '@pakfactory/ui/components/button';
import {ProfileCompanyAddressSection} from '@/components/account/profile/profile-company-address';
import {ProfileContactSection} from '@/components/account/profile/profile-contact';
import {ProfileMarketingSection} from '@/components/account/profile/profile-marketing';
import {ProfilePasswordSection} from '@/components/account/profile/profile-password';
import {ProfileShippingAddressesSection} from '@/components/account/profile/profile-shipping-addresses';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import type {ProfileMock} from '@/lib/account/profile-mock';
import {ACCOUNT_COPY} from '@/lib/copy/account';
import {WWW_ROUTES} from '@/lib/www-routes';

type ProfileViewProps = {
    profile: ProfileMock;
};

export function ProfileView({profile}: ProfileViewProps) {
    return (
        <div className="mx-auto flex max-w-2xl flex-col gap-8">
            <PageHeadingSection
                variant="compact"
                title={ACCOUNT_COPY.profileTitle}
                className="px-0 sm:px-0 md:px-0"
                innerClassName="border-x-0 px-0 pb-0 pt-0 md:px-0"
            />

            <ProfileContactSection contact={profile.contact} />
            <ProfileCompanyAddressSection address={profile.companyAddress} />
            <ProfileShippingAddressesSection
                addresses={profile.shippingAddresses}
            />
            <ProfileMarketingSection
                initialEnabled={profile.marketingEmail}
            />
            <ProfilePasswordSection />

            <div>
                <Button asChild variant="outline" className="rounded-full">
                    <Link href={WWW_ROUTES.login}>{ACCOUNT_COPY.signOut}</Link>
                </Button>
            </div>
        </div>
    );
}
