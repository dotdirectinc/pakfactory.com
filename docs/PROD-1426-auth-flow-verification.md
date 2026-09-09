# PROD-1426 — buyer auth, end-to-end verification (2026-09-08)

Manual run of every buyer auth flow against **staging** (`gqyqizmycunqxocorfzd`),
two weeks after the 2026-08-25 implementation. Two defects found and fixed; three
Supabase behaviours recorded that are not visible in our code and that misled the
original verification.

## Results

| Flow | Result |
|---|---|
| Register, fresh address (`…@qq.com`) | ✅ 22 s create→confirm — a real emailed code |
| `Confirm email` enabled / `mailer_autoconfirm` off | ✅ implied by that lag |
| `public.customers` row via `handle_new_user` | ✅ |
| Login + logout, email+password | ✅ |
| Login, Google OAuth | ✅ |
| Password reset via emailed code | ✅ twice |
| Reset on a Google-created account → both methods work | ✅ |
| No duplicate or orphaned identity | ✅ one `auth.users` row per address throughout |
| QQ mail deliverability | ✅ first datapoint (see MFA note below) |
| **Register on an already-confirmed address** | ❌ fixed — silent dead end |
| **Password login on a Google-created account** | ❌ fixed — misleading error |

## Defect 1 — re-registering a confirmed address stranded the buyer

With `Confirm email` on, GoTrue answers `signUp` for an existing **confirmed**
address with a **decoy user**: no error, no email. So `mapAuthError` never runs,
the `already_registered` branch in `lib/auth/actions.ts` never fires, and control
reaches the unconditional `redirect('/verify')`.

There the buyer was stuck. No code arrives; `resend({type:'signup'})` errors for a
confirmed user and `resendCode` swallows everything but rate limiting, so "Send a
new code" is silently a no-op; and the page asserted *"Enter the code we sent to
…"*, which was false.

Not Google-specific — the decoy keys on *a confirmed account exists*, so an
email+password address behaves identically.

**Fix:** `/verify` copy is now conditional (*"If that address is new, we've sent a
code…"*) and the footer offers **Sign in** and **Forgot your password?**. Both
render for everyone, so neither reveals whether the address has an account.

## Defect 2 — "password doesn't match" on an account with no password

A Google-created account has no password, and `signInWithPassword` reported *"That
email and password don't match"* — which reads as forgotten, not never-set.

We cannot detect the case: Supabase returns **one** error for a wrong password, an
unknown address, and no password at all. Distinguishing them needs a lookup, and
www has no service-role client on purpose — adding one would be the enumeration
oracle `lib/auth/errors.ts` rule 1 exists to prevent. Naming the provider would
leak more than existence: it tells an attacker which door to try.

**Fix:** the generic message now names both exits — *"If you signed up with
Google, use Continue with Google — or reset your password to set one."* Identical
for every failure, so it leaks nothing.

## Supabase behaviours worth knowing

1. **`providers` does not describe which sign-in methods work.** After a reset on
   a Google-created account: `encrypted_password` is set and password sign-in
   works, but **no `email` identity row is created** — the account still reads
   `providers=['google']`. Credentials live on `auth.users`; `auth.identities` is
   provider linking. Do not read `providers` as "this account uses only Google"
   (relevant to the admin app as it surfaces account state to staff).

2. **`confirmation_sent_at` / `recovery_sent_at` are cleared when the token is
   consumed.** A completed reset leaves `recovery_sent_at` NULL. Null means "no
   send pending", **not** "no email was ever sent" — it cannot be used to
   diagnose whether mail went out after the fact.

3. **Identity linking is order-dependent.** Password-then-Google links into one
   user (`providers=['email','google']`). Google-then-password does **not** — the
   decoy above silently discards the password attempt. The 2026-08-25 AC
   *"already registered via Google → tries email+password → guided to the existing
   method"* was verified in the password-first direction only; the direction it is
   written in was the dead end. Even after this fix the buyer is guided
   *generically*, never told "use Google", because that is the leak above.

## Note for the deferred MFA decision

The 2026-08-25 MFA analysis named **QQ/163/126 deliverability** as the main
argument against custom email OTP for the China audience. A signup code delivered
to `…@qq.com` through Resend on 2026-09-08. One datapoint does not reopen the
decision, but it is the first real evidence and it went the favourable way.

## Still open (unchanged by this pass)

Password policy and lockout/rate limit, session lifetime, and whether to prompt
rather than silently link on same-email-different-provider.
