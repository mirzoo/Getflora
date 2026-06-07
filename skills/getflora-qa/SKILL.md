---
name: getflora-qa
description: Use when testing Getflora marketplace scenarios, especially Iteration 5 manual QA for A/B user flows across auth, listings, favorites, chat, seller workflow, and lifecycle states.
---

# Getflora QA

Use this skill to test Getflora as a marketplace, not as isolated screens.

## Before Testing

- Read `docs/ITERATIONS.md`, `docs/PROJECT_NOTES.md`, and `docs/ROADMAP.md`.
- For Cursor setup, see `docs/CURSOR_SETUP.md`.
- Confirm local infrastructure:
  - `docker compose up -d`
  - `npm run dev`
  - open the URL printed by Next.js.
- If schema changed, run migrations or apply SQL fallback documented in project notes.

## Admin And Moderation QA

Prerequisites:

- Set `ADMIN_EMAILS` in `.env` to your admin account email.
- Apply migration `20260607000100_add_admin_moderation`.
- Sign in as admin and non-admin test users.

Scenarios:

1. Non-admin opens `/admin` → 404.
2. Admin opens `/admin` → dashboard with stats.
3. Admin blocks an ACTIVE listing → it disappears from marketplace.
4. Seller sees blocked listing under `Неактивные` with status notice.
5. Admin bans a user → user is signed out and cannot sign in again.
6. Banned user's ACTIVE listings become BLOCKED.
7. User B reports User A listing → report appears in `/admin/reports`.
8. Admin dismisses or marks report reviewed from reports page.
9. Rate limit: more than 5 reports per hour returns an error.

Bug reports for admin/moderation use the standard format below.

## Iteration 5 Scenario

Test the full A/B flow:

1. User A signs in with a stable email.
2. User A creates an active listing with several photo URLs.
3. User A sees the listing in marketplace and `Мои объявления`.
4. User A cannot add their own listing to favorites.
5. User A signs out.
6. User B signs in with a different stable email.
7. User B sees User A's listing.
8. User B can add it to favorites.
9. User B opens listing details and clicks `Купить`.
10. User B lands in chat with seller and sends a message.
11. User B signs out.
12. User A signs back in with the same email.
13. User A sees the conversation and message from User B.
14. User A marks the listing as `Продано`.
15. Listing disappears from marketplace but remains in `Мои объявления` as sold.

## What To Inspect

- Auth state after sign in/out and refresh.
- Role-specific UI: seller vs buyer.
- Modal stacking and close behavior.
- Empty states for favorites, messages, and my listings.
- Server actions failing silently or leaving stale client state.
- Listing lifecycle: `ACTIVE`, `SOLD`, `EXPIRED`, `soldAt`, `archivedAt`, `expiresAt`.
- Data persistence after signing out and signing back in.

## Bug Report Format

Use this compact format:

```text
ПРОБЛЕМА:

ШАГИ:

ОЖИДАЛОСЬ:

ФАКТИЧЕСКИ:

ГДЕ В КОДЕ:

РИСК:

МИНИМАЛЬНОЕ ИСПРАВЛЕНИЕ:
```

## Completion Criteria

Iteration 5 is done only when:

- The A/B scenario passes without manual database edits.
- Seller and buyer roles are visually clear.
- Auth, favorites, messages, and seller actions survive refresh/sign out/sign in.
- Known limitations are documented in `docs/PROJECT_NOTES.md` or `docs/ITERATIONS.md`.
- `npm run typecheck`, `npm run lint`, and `npm run build` pass.
