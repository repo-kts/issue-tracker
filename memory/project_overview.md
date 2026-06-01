---
name: project-overview
description: IssueTracker is a SaaS for Suraj's service-based agency to track client change-requests with a 5-free-iteration limit before clients must pay
metadata:
  type: project
---

**What it is:** A SaaS at `d:\claudeee\IssueTracker` that Suraj (suraj@composio.dev) is building for his service-based agency (web development for clients). Clients submit change-requests/issues in any format (text, voice, screenshot, video) via a magic link per project. The system counts iterations per project so Suraj can enforce a 5-free-iteration limit, after which the client must pay to continue.

**Why:** Suraj currently delivers websites and verbally promises clients "5 free iterations," but clients regularly demand 50+ changes claiming they're still within the limit. He has no record of iterations, so time/money/resources are wasted. This system is the source of truth.

**Stack chosen 2026-05-31:**
- Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 3
- SQLite via better-sqlite3 + Drizzle ORM (auto-creates tables on first run via raw `CREATE TABLE IF NOT EXISTS` in [lib/db/index.ts](lib/db/index.ts))
- Magic-link-per-project access for clients (no client login; owner has bcrypt+session-cookie login)
- Razorpay for payments (Indian-market SaaS); falls back to "grant manually" button if keys absent
- Local file uploads to `./uploads/` served via `/api/files/[...path]` route. Designed to be swapped for R2/S3 by replacing [lib/storage.ts](lib/storage.ts).

**Built 2026-05-31 (v1, production build verified):**
- Owner flow: signup, login, dashboard with project list + iteration progress, project detail (issues, attachments, paid grants, status updates), copy magic link
- Client flow: `/p/[slug]` page shows iteration count + previous requests + submission form with text, voice-note recording (MediaRecorder API → webm), file uploads (images/videos/audio/PDFs)
- Iteration gate: after `freeIterationLimit`, client hits `/p/[slug]/pay`. Razorpay checkout creates order server-side, verifies HMAC SHA-256 signature, increments `projects.paidIterations`
- Owner can also grant iterations manually from project page (for off-platform payments)

**npm install needs `--legacy-peer-deps`** due to Drizzle's peerOptional sqlite-driver constraints.

**How to apply:** When extending, keep the agency-owner vs client distinction clean — owner authenticates, clients are identified only by the project slug in the URL. Iteration count is the central business metric; never let issue submission bypass it.
