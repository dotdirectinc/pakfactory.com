import type {ReactNode} from 'react';
import type {User} from '@supabase/supabase-js';
import {SiteFooter} from '@pakfactory/ui/components/site-footer';
import {FooterWordmark} from '@/components/layout/footer-wordmark';
import {SiteNavRequestSlot} from '@/components/layout/site-nav-request-slot';
import {accountAvatarUrl, accountDisplayName} from '@pakfactory/supabase/session';
import {RequestRoot} from '@/lib/request/request-root';
import {buildSiteNavProps} from '@/lib/site-nav';
import {mapWwwFooterFromChrome} from '@/lib/www-footer';
import {fetchWebsiteNavigation} from '@/lib/website-navigation';
import {createClient} from '@pakfactory/supabase/server';

export default async function SiteLayout({children}: {children: ReactNode}) {
  let user: User | null = null;
  try {
    const supabase = await createClient();
    const {data} = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  const chrome = await fetchWebsiteNavigation();
  const nav = buildSiteNavProps({
    authenticated: Boolean(user),
    chrome,
  });
  const footer = mapWwwFooterFromChrome(chrome);

  return (
    <RequestRoot>
      <SiteNavRequestSlot
        homeHref={nav.homeHref}
        navItems={nav.items}
        cta={nav.cta}
        signIn={nav.signIn}
        account={
          user
            ? {
                displayName: accountDisplayName(user),
                email: user.email ?? '',
                avatarUrl: accountAvatarUrl(user),
              }
            : undefined
        }
      />
      {children}
      <SiteFooter
        columns={footer.columns}
        contactHref={footer.cta.href}
        contactLabel={footer.cta.label}
        social={footer.social}
        aiLinks={footer.aiLinks}
        wordmark={<FooterWordmark />}
      />
    </RequestRoot>
  );
}
