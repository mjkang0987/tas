-- Remove single-column unique constraint on userId (allows multiple accounts per user)
DROP INDEX IF EXISTS "AuthAccount_userId_key";

-- Add composite unique constraint: one account per provider per user
CREATE UNIQUE INDEX "AuthAccount_userId_provider_key" ON "AuthAccount"("userId", "provider");
