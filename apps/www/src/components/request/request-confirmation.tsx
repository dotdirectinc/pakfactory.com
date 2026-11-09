import Link from 'next/link';
import {CheckCircle2} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {REQUEST_COPY} from '@/lib/copy/request';
import {WWW_ROUTES} from '@/lib/www-routes';

/**
 * R30 (Website PRD, Unreleased · POC): confirmation page after submit. Replaces the
 * "Request submitted" popup (both versions switch in the POC: Request confirmation).
 * Request ref, what happens next, where to track it; guests get R25's optional
 * "Create your account". The assigned specialist (c51) is next phase.
 */
export function RequestConfirmation({
    reference,
    signedIn,
    express,
    document,
}: {
    reference: string | null;
    signedIn: boolean;
    express: boolean;
    /** The request as a document (owner Nov 2: the paper moves here from the step intake's review). */
    document?: React.ReactNode;
}) {
    const steps = [
        {title: 'We email you a receipt', body: 'A copy of your request goes to the email you gave us.'},
        {title: 'A packaging specialist reviews it', body: REQUEST_COPY.submitSuccessBody.replace(/^Thanks\.\s*/, '')},
        {title: 'You get your quote', body: signedIn ? 'Follow its status in My requests.' : 'Open it from the link in your receipt email.'},
    ];
    return (
        <PageDielineSection innerClassName="py-16 sm:py-24" borderBottom>
            {/* With the paper (owner Nov 2): checkout-style two columns on desktop — what happens
                next on the left, the request as a document on the right. Without it: one column, centred. */}
            <div
                className={cn(
                    'mx-auto w-full',
                    document ? 'grid max-w-[1200px] gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start' : 'max-w-[640px]',
                )}
            >
            {/* With the paper, the left column stays in view while the (taller) paper scrolls (owner Nov 2). */}
            <div className={cn('flex w-full flex-col', document ? 'items-start text-left lg:sticky lg:top-24' : 'items-center text-center')}>
                <CheckCircle2 className="size-12 text-foreground" aria-hidden />
                <h1 className="mt-6 text-3xl font-medium tracking-tight text-foreground">
                    {REQUEST_COPY.submitSuccessTitle}
                </h1>
                {reference ? (
                    <p className="mt-3 text-base text-muted-foreground">
                        {REQUEST_COPY.yourRefPrefix}{' '}
                        <span className="font-mono font-semibold text-foreground">{reference}</span>
                    </p>
                ) : null}

                <ol className="mt-10 grid w-full gap-3 text-left">
                    {steps.map((s, i) => (
                        <li key={s.title} className="flex gap-4 rounded-md border border-border bg-background p-4">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
                                {i + 1}
                            </span>
                            <span>
                                <span className="block text-sm font-semibold text-foreground">{s.title}</span>
                                <span className="mt-0.5 block text-sm text-muted-foreground">{s.body}</span>
                            </span>
                        </li>
                    ))}
                </ol>

                <div className={cn('mt-10 flex flex-wrap items-center gap-3', document ? 'justify-start' : 'justify-center')}>
                    {signedIn ? (
                        <Button asChild size="xl">
                            <Link href={WWW_ROUTES.accountRequests}>Track it in My requests</Link>
                        </Button>
                    ) : (
                        <Button asChild size="xl">
                            <Link href={WWW_ROUTES.signUp}>Create your account</Link>
                        </Button>
                    )}
                    <Button asChild size="xl" variant="outline">
                        <Link href={express ? WWW_ROUTES.products : WWW_ROUTES.request}>
                            {express ? REQUEST_COPY.keepBrowsing : REQUEST_COPY.backToYourRequest}
                        </Link>
                    </Button>
                </div>
                {!signedIn ? (
                    <p className="mt-4 max-w-md text-xs text-muted-foreground">
                        Optional: an account keeps all your requests in one place. Use the same email to see this one there.
                    </p>
                ) : null}
            </div>
            {document ? <div className="w-full">{document}</div> : null}
            </div>
        </PageDielineSection>
    );
}
