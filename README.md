# NDSC Tournament Manager

A Next.js app for managing one-day softball club tournaments with a public event page and practical admin screens.

## V1 Scope

- Create and manage tournament records.
- Add teams and team rosters.
- Generate a round-robin fixture schedule.
- Enter scores quickly from mobile-friendly result cards.
- Calculate standings from completed fixtures.
- Publish tournament info, fixtures, results, standings, and a playoff bracket.

The current scaffold uses typed sample data in `src/lib/tournaments` so the full route structure and UI can be exercised before persistence is added.

## Routes

- `/` - app overview and stack/build plan summary.
- `/tournaments/pop-icons-2026` - public tournament page.
- `/admin` - admin dashboard.
- `/admin/tournaments` - tournament list/create shell.
- `/admin/teams` - teams and roster management.
- `/admin/schedule` - round-robin schedule controls and fixture view.
- `/admin/results` - mobile-first score entry.
- `/admin/standings` - calculated standings and tiebreak notes.
- `/admin/settings` - tournament configuration.

## Architecture Plan

See `docs/v1-plan.md` for the recommended stack, data model, route structure, and implementation order.

## Development

```bash
npm run dev
```

Then open `http://localhost:3000`.

## Verification

```bash
npm run lint
npm run build
```
