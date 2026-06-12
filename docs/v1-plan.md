# Tournament Manager v1 Plan

## Recommended Tech Stack

- Framework: Next.js App Router, React Server Components by default, TypeScript, Tailwind CSS.
- UI: Tailwind utility components with lucide-react icons. Keep admin dense and task-led; public pages get more event polish.
- Database: Postgres with Prisma ORM for relational tournament data and simple export queries.
- Auth: Clerk or Supabase Auth for protected admin routes. Use role checks for club admins and event scorers.
- Hosting: Vercel for the app, Supabase or Neon for Postgres.
- Validation: Zod schemas at form/server-action boundaries.
- Exports: CSV first for teams, fixtures, results, standings, and rosters; PDF/event pack later.

## Data Model

- Tournament: name, slug, date, venue, format, status, pitch list, game duration, points rules, announcements.
- Team: tournament, name, short name, color, captain/contact fields.
- Player: team, name, shirt number, optional email/phone and registration status later.
- Fixture: tournament, round, stage, start time, pitch, home team, away team, scores.
- Standing: derived from fixtures, not stored for v1 unless snapshots are needed after export.
- BracketMatch: tournament, stage, seed labels, optional resolved teams, start time, pitch, scores.
- AwardVote: later model for MVP/awards, voter identity, player/team nominee, category.

## Route Structure

- `/`: product/workbench overview with links into current event and admin.
- `/tournaments/[slug]`: public tournament page with info, announcements, fixtures, results, standings, and bracket.
- `/admin`: operations dashboard for current tournament.
- `/admin/tournaments`: tournament list and create/edit shell.
- `/admin/teams`: team and roster management.
- `/admin/schedule`: generated round-robin schedule view and generation controls.
- `/admin/results`: mobile-first score entry.
- `/admin/standings`: calculated standings and tiebreak note.
- `/admin/settings`: tournament configuration, points, pitch setup, public visibility.

## V1 Implementation Order

1. Build static typed prototype with sample tournament data, schedule generation, standings calculation, and all v1 routes.
2. Add Prisma schema and seed data matching the TypeScript model.
3. Add admin auth and protect `/admin`.
4. Convert team/player/tournament forms to server actions with Zod validation.
5. Persist generated fixtures and score entry, then revalidate public routes.
6. Add CSV export and event archive pages.
