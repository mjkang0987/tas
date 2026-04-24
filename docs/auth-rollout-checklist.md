# Auth Rollout Checklist

## Current State

- app routes require authentication by default
- `/login` remains public
- `role` and `storeId` fields are available in session types
- membership lookup is not connected yet

## Next Steps

1. Resolve logged-in users to `User` + `Membership` records
2. Persist `role` and `storeId` into JWT/session callbacks
3. Restrict write APIs by role
4. Scope all DB reads and writes by `storeId`
5. Add unauthorized fallback screens where needed

## Pre-Launch Checks

- production OAuth credentials rotated
- `AUTH_SECRET` replaced
- login works on staging
- unauthenticated users are redirected to `/login`
- authenticated users without membership are blocked safely
- owner account can access admin flows
