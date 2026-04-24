# Service Launch Plan

## Goal

Convert the current single-workspace salon reservation app into a production service that can be opened to real operators with:

- durable data storage
- authenticated access
- store-scoped authorization
- deployable infrastructure
- recoverable operations

## Current Blockers

### 1. File-based persistence

The app currently writes live data into JSON files under `client/pages/api/*.json`.

Risks:

- data loss on redeploy
- write conflicts on concurrent edits
- impossible to scale horizontally
- no reliable audit or rollback model

### 2. Auth is not enforcing access

`client/auth.ts` currently allows all requests in `authorized()`.

Risks:

- unauthenticated access
- no role separation
- no store boundary enforcement

### 3. Business rules rely too much on client state

Important rules such as:

- reservation overlap
- payment completion before completion
- point balance checks
- designer status rules

must be finalized server-side against the database.

### 4. Secrets handling

Local auth credentials currently exist in `.env.local`.

Before service launch:

- rotate all exposed OAuth secrets
- recreate production-only credentials
- store them in the hosting platform secret manager

## Recommended Stack

- Frontend/App server: Next.js on Vercel
- Database: PostgreSQL
- ORM: Prisma
- Auth: NextAuth + database-backed users/memberships
- Monitoring: Sentry
- Domain: custom domain + HTTPS

## Rollout Order

### Phase 1. Foundation

1. Add Prisma + PostgreSQL schema
2. Define store/user/membership model
3. Map current JSON models to relational schema
4. Add Prisma client bootstrap

### Phase 2. Data migration

1. Create seed/import script from existing JSON files
2. Import designers/customers/services/store settings
3. Import reservations + history
4. Verify record counts and integrity

### Phase 3. API migration

1. Replace JSON read/write API routes with DB-backed handlers
2. Move critical business validations server-side
3. Add transaction boundaries for:
   - reservation update + history write
   - payment save + point update + point history

### Phase 4. Auth and authorization

1. Restrict access to authenticated users
2. Add `owner / manager / staff` roles
3. Scope all data access by `storeId`
4. Add protected middleware / route guards

### Phase 5. Deployment

1. Provision production database
2. Configure Vercel project
3. Set environment variables
4. Run migrations
5. Import seed data

### Phase 6. Operations

1. Add error monitoring
2. Add DB backup policy
3. Add staging environment
4. Define incident response and rollback steps

## Initial Cost Estimate

### Lean start

- Vercel Pro
- Neon Launch
- custom domain

Expected monthly range: KRW 50,000 to 60,000

### Integrated stack option

- Vercel Pro
- Supabase Pro
- custom domain

Expected monthly range: KRW 60,000 to 80,000

## First Implementation Scope

This repository will proceed in this order:

1. Prisma schema and package setup
2. DB client bootstrap
3. relational mapping for current entities
4. migration/import plan from JSON
5. API replacement

## Notes

- Existing uncommitted feature work in the repository should not be reverted.
- Production release should not reuse local OAuth credentials.
- A staging deploy is required before any public launch.
