import {comingSoonMetadata} from '@/components/common/coming-soon-page';
import {ProfileView} from '@/components/account/profile/profile-view';
import {PROFILE_MOCK} from '@/lib/account/profile-mock';

export const metadata = comingSoonMetadata('Profile');

export default function AccountProfilePage() {
    return <ProfileView profile={PROFILE_MOCK} />;
}
