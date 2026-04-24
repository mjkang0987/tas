# Auth Rollout Checklist

## Current State

- app routes require authentication by default
- `/login` remains public
- `role` and `storeId` fields are available in session types
- JWT/session callbacks now hydrate the first available membership
- write API authorization is not connected yet

## Next Steps

1. Restrict write APIs by role
2. Scope all DB reads and writes by `storeId`
3. Handle users with multiple memberships explicitly
4. Add unauthorized fallback screens where needed

## Pre-Launch Checks

- production OAuth credentials rotated
- `AUTH_SECRET` replaced
- login works on staging
- unauthenticated users are redirected to `/login`
- authenticated users without membership are blocked safely
- owner account can access admin flows
