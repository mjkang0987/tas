# takeaseat Client

Salon reservation app built with Next.js, NextAuth, Prisma, and PostgreSQL.

## Local Development

From `client/`:

```bash
pnpm install
pnpm dev
```

Required local environment variables:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_URL`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `AUTH_KAKAO_ID`
- `AUTH_KAKAO_SECRET`
- `AUTH_NAVER_ID`
- `AUTH_NAVER_SECRET`

Seed-related variables:

- `SEED_OWNER_EMAIL`
- `SEED_OWNER_NAME`

## Prisma Commands

Useful commands from `client/`:

```bash
pnpm prisma:prepare
pnpm prisma:import
pnpm prisma:deploy
pnpm prisma:bootstrap
```

Meaning:

- `prisma:import`: local/staging import flow using `db push`
- `prisma:deploy`: production migration flow using checked-in migrations
- `prisma:bootstrap`: production or staging first-run flow after database provisioning

## Production Deploy

Expected platform shape:

- App: Vercel
- Database: PostgreSQL

Build behavior:

- `pnpm build` runs `prisma generate` before `next build`
- `postinstall` also runs `prisma generate`

First production deploy order:

1. Provision PostgreSQL and set `DATABASE_URL`
2. Add app env vars in hosting
3. Deploy app
4. Run `pnpm prisma:deploy`
5. Run `pnpm prisma:seed`
6. Run `pnpm prisma:verify-seed`

For a combined first-run flow:

```bash
pnpm prisma:bootstrap
```

## Notes

- Production OAuth credentials must not reuse local development values.
- Run the import flow against staging before production.
- Take a database snapshot before first production seed/import.
