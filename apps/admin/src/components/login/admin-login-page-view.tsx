import { AuthSplitLayout } from "@pakfactory/auth-ui/auth-split-layout";
import { AdminLogo } from "@/components/layout/admin-logo";
import { AdminLoginForm } from "@/components/login/admin-login-form";
import { ADMIN_LOGIN_COPY } from "@/lib/copy/login";

export function AdminLoginPageView({
  next,
  notice,
}: {
  next?: string;
  notice?: string;
}) {
  return (
    <AuthSplitLayout
      logo={<AdminLogo />}
      homeHref="/login"
      testimonial={{
        quote: ADMIN_LOGIN_COPY.testimonialQuote,
        attribution: ADMIN_LOGIN_COPY.testimonialAttribution,
        variant: "primary",
      }}
    >
      <div className="flex w-full max-w-sm flex-col gap-4">
        <AdminLoginForm next={next} />
        {notice ? (
          <p role="alert" className="text-sm text-destructive">
            {notice}
          </p>
        ) : null}
      </div>
    </AuthSplitLayout>
  );
}
