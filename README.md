# ReBloom

ReBloom is a web-first MVP for resale of gifted bouquets. The project is a
single Next.js monolith: marketplace UI, server actions/API, auth, admin,
database access, and storage integrations live in one codebase.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style component structure
- PostgreSQL + Prisma, planned for the next iteration
- S3-compatible photo storage, planned after listing creation is stable

## Deployment Constraint

ReBloom should not depend on a single hosting provider. Some global services can
be unreliable or unavailable for users in Russia, so infrastructure decisions
must stay replaceable:

- app hosting should work on Docker/VPS, not only managed platforms;
- database access should use a plain PostgreSQL connection string;
- photo storage should use S3-compatible adapters;
- auth, email, and object storage providers should be isolated behind
  environment variables and small service modules.

Vercel can be useful for demos where available, but it must not be a hard
requirement for production.

## Run Locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Project Structure

```txt
app/              Next.js routes and layouts
components/       shared UI components
features/         domain features: listings, filters, cities, auth, admin
lib/              framework-agnostic helpers
server/           server-only logic and app services
db/               database client and schema helpers
services/         external services such as storage and email
types/            shared TypeScript types
```

## Iteration 0 Status

- Next.js foundation
- Typed mock marketplace data
- Scalable feature folders
- Basic marketplace home screen matching the future layout direction
- No database/auth/storage yet

## Iteration 1 Status

- City selection works on mock data
- Filters work locally
- Listing details open in a modal
- Favorites work in local component state
- New listings can be added to the current page without a backend

## Iteration 2 Status

- Shared app frame and header keep marketplace, favorites, messages, and chat pages visually consistent
- Favorites and messages behave as first-level MVP sections
- Listing purchase opens a direct seller chat route
- Chat page has the same header and responsive width as the marketplace
- Modal overlays close on outside tap/click
- Still no real database/auth/storage; those remain separate backend work
