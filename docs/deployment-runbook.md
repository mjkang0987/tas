# Deployment Runbook

## Scope

This runbook covers the first deploy of the current service stack:

- Next.js app on Vercel
- PostgreSQL database
- Prisma migrations
- seed import for the default store data

## Required Environment Variables

Application:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_URL`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `AUTH_KAKAO_ID`
- `AUTH_KAKAO_SECRET`
- `AUTH_NAVER_ID`
- `AUTH_NAVER_SECRET`

Seed bootstrap:

- `SEED_OWNER_EMAIL`
- `SEED_OWNER_NAME`

Optional:

- `NEXT_DEV_ALLOWED_ORIGINS`

## Pre-Deploy Checklist

1. Create a production PostgreSQL instance.
2. Take note of the final production app URL.
3. Rotate every OAuth secret currently used in local files.
4. Register production callback URLs for each provider.
5. Replace `AUTH_SECRET` with a production-only value.
6. Confirm staging login succeeds before public release.

Provider callback URLs:

- Google: `https://<domain>/api/auth/callback/google`
- Kakao: `https://<domain>/api/auth/callback/kakao`
- Naver: `https://<domain>/api/auth/callback/naver`

## Vercel Project Setup

1. Create the Vercel project from `client/`.
2. Set the framework preset to Next.js if Vercel does not auto-detect it.
3. Add all required environment variables to the Vercel project.
4. Trigger the initial deploy.

Current build behavior:

- `pnpm build` runs `prisma generate` before `next build`
- `postinstall` runs `prisma generate`

## Database Migration

Checked-in initial migration:

- `client/prisma/migrations/202604280001_init/migration.sql`

Run after deployment environment variables are available:

```bash
cd client
pnpm prisma:deploy
```

This applies the checked-in Prisma migrations to the target database.

## First Data Import

After migrations succeed:

```bash
cd client
pnpm prisma:seed
pnpm prisma:verify-seed
```

If you want a single first-run command:

```bash
cd client
pnpm prisma:bootstrap
```

## Post-Deploy Smoke Checks

1. Open `/login`
2. Confirm enabled providers render
3. Confirm login redirects into the app
4. Confirm authenticated users without membership are blocked safely
5. Confirm seeded owner can access admin pages
6. Confirm customer, designer, service, and reservation counts look correct

## Rollback Notes

If the first production import is incorrect:

1. Put the app behind maintenance or restrict operator access.
2. Restore the database snapshot taken before import.
3. Fix the seed data or seed logic.
4. Re-run migration and seed checks in staging first.

## Current Known Risks

- `next-auth@5.0.0-beta.30` with `next@16.2.1` had development-time module resolution noise around `next/server`.
- Kakao profile parsing required a defensive override in `client/auth.ts`.
- Prisma still emits a warning that `package.json#prisma` is deprecated and should later move to `prisma.config.ts`.
