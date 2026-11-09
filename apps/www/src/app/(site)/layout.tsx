import type {ReactNode} from 'react';
import {SiteFooter} from '@pakfactory/ui/components/site-footer';
import {FooterWordmark} from '@/components/layout/footer-wordmark';
import {SiteNavRequestSlot} from '@/components/layout/site-nav-request-slot';
import {NAV_SESSION_WRAPPER_ID} from '@/lib/auth/nav-session-flag';
import {buildSiteNavProps} from '@/lib/site-nav';
import {mapWwwFooterFromChrome} from '@/lib/www-footer';
import {fetchWebsiteNavigation} from '@/lib/website-navigation';

/**
 * No session read here (PROD-2754): a `cookies()` / getUser() call in this
 * layout made every `(site)` page dynamic, so none could be served from the
 * CDN and every `revalidate` was ignored. The server renders the signed-out
 * header for everyone; `SiteNavRequestSlot` resolves the account in the
 * browser, and the root-layout pre-paint script marks `#pf-nav-session` when
 * an auth cookie is present.
 *
 * RequestRoot is on the root layout so leaving Quote Request does not remount
 * the request provider / chat / compare dock.
 */
export default async function SiteLayout({children}: {children: ReactNode}) {
  const chrome = await fetchWebsiteNavigation();
  const nav = buildSiteNavProps({chrome});
  const accountLink = buildSiteNavProps({authenticated: true, chrome}).signIn;
  const footer = mapWwwFooterFromChrome(chrome);

  return (
    <div
      id={NAV_SESSION_WRAPPER_ID}
      className="contents"
      suppressHydrationWarning
    >
      <SiteNavRequestSlot
        homeHref={nav.homeHref}
        navItems={nav.items}
        cta={nav.cta}
        signIn={nav.signIn}
        accountLink={accountLink}
      />
      {children}
      <SiteFooter
        columns={footer.columns}
        social={footer.social}
        aiLinks={footer.aiLinks}
        wordmark={<FooterWordmark />}
      />
    </div>
  );
}
