---
name: email-resend-plan
description: Planned email notifications via Resend — deferred until Suraj has the API key and domain DNS verified
metadata:
  type: project
---

**Status:** Not started. Deferred at user's request on 2026-05-31.

**Plan agreed:**
- Use [Resend](https://resend.com) (free 3k/month tier — plenty for a service agency).
- Verify domain `kalopetechservices.com` in Resend by adding ~3 DNS records (SPF, DKIM, return-path) wherever the domain's DNS is hosted.
- Send `from notifications@kalopetechservices.com` once verified.
- Store API key in `.env.local` as `RESEND_API_KEY`.

**Why this matters:** The existing notification bell only works while the user has the dashboard open. Without email, evening/weekend client submissions go unseen — biggest gap between "feature-complete app" and "actually usable for the agency".

**How to apply:** When user comes back with a Resend API key, build `lib/email.ts` with a `sendEmail()` helper and trigger emails on these events:
- New issue submitted → email owner ("New request on PROJECT")
- Owner reply → email client ("Suraj replied on #N TITLE")
- Status changed to `resolved` → email client ("Your request is ready for approval")
- Client approval → email owner ("Ujjwal approved #N — closed")
- Razorpay payment success → email both ("Payment received, 1 iteration unlocked")

Estimated implementation: ~30 minutes once the key + verified domain are ready.

**Fallback if no domain access:** Brevo (Indian-friendly, 300/day free) sends from gmail addresses without DNS verification but emails show "via brevomail.com" which looks unprofessional. Resend with verified domain is strongly preferred.
