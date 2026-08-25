# Auth email templates (PROD-2283)

Source of record for the two emails **Supabase Auth** sends. Supabase renders and
sends these itself over the Resend SMTP credentials — our code never touches them
— so they live here as plain HTML and are **pasted into the dashboard**, not built
or deployed.

| File | Supabase template | Verify with |
|---|---|---|
| `confirm-signup.html` | Authentication → Emails → **Confirm signup** | `verifyOtp({ email, token, type: 'signup' })` |
| `reset-password.html` | Authentication → Emails → **Reset Password** | `verifyOtp({ email, token, type: 'recovery' })` |

## Why a code and not a link

Both templates render `.Token` (a 6-digit code) and deliberately contain **no**
`.ConfirmationURL`.

Corporate mail security — Microsoft Defender Safe Links, Proofpoint URL Defense,
Mimecast URL Protect — pre-fetches links in inbound mail to scan them. Supabase
tokens are single-use, so the scanner consumes the token and the buyer sees
"link expired" on their first click. PakFactory's buyers are corporate-email B2B,
which is precisely the population that breaks for, and the failure looks random
from our side because it depends on each buyer's employer's mail configuration.

A code has no URL to pre-fetch. It is consumed only when a human types it.

**Do not add `.ConfirmationURL` back to either template** — including inside an
HTML comment. Supabase templates placeholders in comments too, so a commented-out
example would still emit a live single-use link into every email.

## Applying a change

1. Edit the file here first — this is the source of record.
2. Paste **everything below the `-->`** into the matching dashboard template
   (the leading comment is repo documentation, not part of the email).
3. Apply to **staging** (`gqyqizmycunqxocorfzd`) first, send one test, confirm
   delivery in Resend → Logs.
4. Then apply to **prod** (`vdjkpflnsvzjpecpsnzv`).

There is no automation for this. A change made only in the dashboard will be
silently reverted by the next person who pastes from here.

## Settings these depend on

| Setting | Required value | Why |
|---|---|---|
| Auth → **Confirm email** | enabled | with it off, `mailer_autoconfirm` is true and **no confirmation email is sent at all** |
| Auth → Rate Limits → **Emails sent per hour** | raised above the default | enabling custom SMTP does not lift Supabase's own cap; the default is a handful per hour |
| Auth → **Minimum password length** / strength | set deliberately | password is the primary credential now, not a fallback |

A 6-digit code is short, so the rate limit is a **security control** here, not
just a throughput setting — it is what makes brute-forcing impractical.

## Rendering check

No build step, so preview by opening the file in a browser (the `{{ .Token }}`
placeholder shows literally) or by sending a real test from the dashboard.
Email clients ignore external CSS, webfonts, flexbox and grid, which is why these
are table-based with inline styles.
