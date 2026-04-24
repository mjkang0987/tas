# Prisma Seed Runbook

## Purpose

Use this runbook when importing the current JSON-based salon data into PostgreSQL through Prisma.

## Required Environment Variables

Set these values before running the seed:

- `DATABASE_URL`
- `SEED_OWNER_EMAIL`
- `SEED_OWNER_NAME`

Optional auth-related values are not required for the seed itself.

## Seed Coverage

Current seed order in `client/prisma/seed.mjs`:

1. default store
2. owner membership
3. designers
4. customers
5. services
6. reservations

Imported source files:

- `client/pages/api/store.json`
- `client/pages/api/designers.json`
- `client/pages/api/customers.json`
- `client/pages/api/services.json`
- `client/pages/api/reservations.json`

## Run Sequence

From `client/`:

```bash
pnpm prisma:import
```

Expanded import sequence:

```bash
pnpm prisma:prepare
pnpm prisma:db:push
pnpm prisma:seed
pnpm prisma:verify-seed
```

If migrations are introduced before first deploy, replace `prisma db push` inside the import flow with the migration command used by the project.

Production deploys should use:

```bash
pnpm prisma:deploy
```

## Expected Seed Behavior

- Creates the default store with business hours, closed dates, and point settings.
- Creates one owner user and links it to the default store when `SEED_OWNER_EMAIL` is set.
- Imports designers and weekly schedules.
- Imports customers, memo tags, and point histories.
- Imports services.
- Imports reservations, payment entries, and reservation history.

## Current Limitations

- `CustomerPointHistory.relatedReservationId` is not resolved yet.
- Service records are imported independently from reservation service summaries.
- Seed logic currently favors safe overwrite behavior for child records such as tags, payment entries, and history rows.

## Validation Checklist

- `Store` count is `1`
- owner membership count is at least `1`
- customer count matches `customers.json`
- designer count matches `designers.json`
- service count matches `services.json`
- reservation count matches `reservations.json`
- reservation history count matches source history length
- customer point history count matches source data
- at least one paid reservation includes imported payment entries

## First Production Run Notes

- Never use local development OAuth secrets in production.
- Run the seed against staging first.
- Take a database snapshot before first production import.
