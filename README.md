# JobBlast

High-volume job application assistant. Aggregates listings, scores relevance
against your profile, AI-tailors your resume + cover letter per job, and gives
you a fast keyboard-driven review-and-apply loop — **you make the final click on
the employer's own site.** No bot login, no auto-submit.

## Stack

- **Next.js 16** (App Router, TypeScript) + **Tailwind v4**
- **Prisma 6 + SQLite** (swap `datasource` to `postgresql` for Neon/Supabase later)
- **Anthropic SDK** (`claude-opus-4-8`) for tailoring, with a deterministic
  template fallback so the loop runs with **no API key**
- **Vitest** for the scoring / dedup logic

## Setup

```bash
npm install
npm run db:migrate       # create the SQLite DB
npm run seed             # seed your profile (from your CV)
npm run ingest indeed    # load real Ireland listings from data/indeed-listings.json
npm run score            # rank every listing against your profile
npm run dev              # http://localhost:3000
```

`npm run ingest` also accepts `mcp` (a US/remote ZipRecruiter dump) — the two
sources coexist and are filterable in the review queue.

Optional — enable real Claude tailoring (otherwise the template fallback is used):

```bash
echo 'ANTHROPIC_API_KEY=sk-ant-...' >> .env
```

## How it works

| Page | What it does |
|------|--------------|
| **Dashboard** (`/`) | Daily-goal progress toward 50/day, funnel (applied → responded → interview → offer / rejected), follow-up reminders |
| **Review** (`/review`) | Ranked queue with a **filter bar** (keyword, sponsorship, source, seniority, min score, min salary, location, remote). Each card shows the job, a **sponsorship signal**, *why it matched*, and AI-tailored docs with a **diff view** (original vs tailored resume). Keyboard: `a` approve, `s` skip, `j`/`k` next/prev, `d` toggle diff. **Approve & Open** copies the docs to your clipboard, opens the employer's apply page, and snapshots the exact documents used. |
| **Tracker** (`/tracker`) | Status pipeline, notes, dates, and the exact resume/cover version used per application |

### The MCP data caveat

The connected job-search MCP tools (Indeed, ZipRecruiter) run inside the agent
session, not the web app. So aggregation uses an **ingestion seam**:
`scripts/ingest.ts` reads normalized listings from `data/indeed-listings.json`
(real Ireland roles pulled via the Indeed MCP `search_jobs` + `get_job_details`)
into the DB via a `JobSource` adapter. A live HTTP source (Adzuna) drops into the
same interface — see `src/lib/sources/adzuna.ts` — with zero UI changes.
Re-running `npm run ingest indeed` is the v1 "daily refresh".

### Sponsorship signal (honest heuristic)

Indeed rarely states visa sponsorship, so `detectSponsorship()`
(`src/lib/normalize.ts`) infers a signal: **stated** (explicit mention),
**likely** (a tech role typically eligible for Ireland's Critical Skills
Employment Permit), **confirm** (posted via a recruiter — verify directly), or
**unknown**. It's a filter and a light ranking nudge, not a guarantee.

## Architecture

```
prisma/schema.prisma      User · JobListing · Application · Match
prisma/seed.ts            seeds the real profile
scripts/ingest.ts         normalize + dedup + upsert listings
scripts/score.ts          write Match rows (relevance scores)
src/lib/sources/          JobSource adapter (mcpDump | adzuna-stub)
src/lib/scoring.ts        weighted title/skills/seniority/location/salary match (tested)
src/lib/normalize.ts      company+title fuzzy dedup key + seniority inference (tested)
src/lib/tailor.ts         Claude tailoring + template fallback
src/lib/diff.ts           LCS line diff for the review diff view
src/app/                  dashboard, review, tracker + API routes
```

## Build status

- [x] **M1** Scaffold + schema + seed + CRUD
- [x] **M2** JobSource adapter + MCP ingestion (dedup, salary sanitization)
- [x] **M3** Relevance scoring (weighted, unit-tested)
- [x] **M4** Claude tailoring + cover letter + diff view (+ no-key fallback)
- [x] **M5** Keyboard review queue + daily-goal dashboard
- [x] **M6** Application tracker + status pipeline
- [ ] Follow-up auto-flagging is live; duplicate detection runs in ingest.
      **Next (M7):** dedicated reminders view. **Out of v1:** browser-extension
      autofill (P2), CSV export (P2).

## Tests

```bash
npm test        # scoring + dedup unit tests (16)
npm run lint
npm run build
```
