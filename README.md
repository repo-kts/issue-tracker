# IssueTracker

A SaaS for service-based agencies (web dev, design, etc.) to track client change-requests with a hard-counted free-iteration limit. After 5 (configurable) iterations, clients have to pay before submitting more changes.

**Stack:** Next.js 15 (App Router) + TypeScript + Tailwind + SQLite (better-sqlite3 + Drizzle) + Razorpay.

## Setup

```bash
npm install
cp .env.example .env.local
# Edit .env.local — at minimum set SESSION_SECRET
npm run dev
```

Open http://localhost:3000.

### Razorpay (optional for v1)

If you skip Razorpay keys, the system still works — you'll just grant extra iterations manually from the project page. To enable real card payments, get test keys from https://dashboard.razorpay.com and put them in `.env.local`:

```
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxx
```

Razorpay test card: `4111 1111 1111 1111`, any future expiry, any CVV.

## Flow

1. **Sign up** at `/signup` — agency owner account.
2. **Create a project** for one client engagement. You get a magic link like `/p/abc123xyz`.
3. **Share the link** with your client. They visit it, see iteration count, submit changes (text + voice notes + screenshots + screen recordings).
4. **System counts every submission** as an iteration. After the free limit, the client hits a paywall.
5. **Client pays** (Razorpay) → 1 more iteration unlocked, or you grant manually.

## Where things live

- `app/page.tsx` — public landing page
- `app/(auth)/` — signup / login / logout
- `app/dashboard/` — owner-only routes (projects list, new project, project detail)
- `app/p/[slug]/` — public client portal (no login)
- `app/api/files/[...path]/` — serves uploaded attachments
- `lib/db/schema.ts` — Drizzle schema (also raw-`CREATE TABLE`'d in `lib/db/index.ts` so it auto-migrates on first run)
- `lib/auth.ts` — bcrypt + session cookies
- `lib/projects.ts` — iteration-status math
- `lib/razorpay.ts` — order creation + signature verification
- `lib/storage.ts` — local file uploads (designed to be swapped for S3/R2)

## Data lives in

- `./data/issuetracker.db` — SQLite (gitignored)
- `./uploads/` — attachments (gitignored)

Both auto-create on first run.
