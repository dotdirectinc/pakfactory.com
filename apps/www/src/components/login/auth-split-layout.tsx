import type {ReactNode} from 'react';
import Link from 'next/link';
import Logo from '@/components/layout/logo';
import {LOGIN_COPY} from '@/lib/copy/login';
import {WWW_ROUTES} from '@/lib/www-routes';

type AuthSplitLayoutProps = {
    children: ReactNode;
};

export function AuthSplitLayout({children}: AuthSplitLayoutProps) {
    return (
        <div className="grid min-h-screen lg:grid-cols-2">
            <div className="flex flex-col px-4 py-4 sm:px-6 sm:py-6">
                <Link
                    href={WWW_ROUTES.home}
                    aria-label="PakFactory home"
                    className="w-fit"
                >
                    <Logo />
                </Link>

                <div className="flex flex-1 items-center justify-center py-12">
                    {children}
                </div>
            </div>

            <aside
                className="hidden items-center justify-center bg-muted/40 px-12 py-16 lg:flex"
                aria-label="Customer testimonial"
            >
                <figure className="max-w-md">
                    <blockquote className="text-xl font-medium tracking-tight text-foreground">
                        <span
                            className="mb-6 block text-5xl leading-none text-muted-foreground/50"
                            aria-hidden="true"
                        >
                            &ldquo;
                        </span>
                        {LOGIN_COPY.testimonialQuote}
                    </blockquote>
                    <figcaption className="mt-8 text-sm text-muted-foreground">
                        {LOGIN_COPY.testimonialAttribution}
                    </figcaption>
                </figure>
            </aside>
        </div>
    );
}
