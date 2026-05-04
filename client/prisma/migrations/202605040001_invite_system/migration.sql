-- Delete duplicate AuthAccounts per user, keeping only the most recently updated one
WITH ranked AS (
  SELECT id, "userId",
    ROW_NUMBER() OVER (
      PARTITION BY "userId"
      ORDER BY "updatedAt" DESC
    ) AS rn
  FROM "AuthAccount"
)
DELETE FROM "AuthAccount" WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Drop old userId index (replaced by unique constraint)
DROP INDEX IF EXISTS "AuthAccount_userId_idx";

-- Add unique constraint on AuthAccount.userId (one account per user)
CREATE UNIQUE INDEX "AuthAccount_userId_key" ON "AuthAccount"("userId");

-- Drop lastLoginProvider column from User
ALTER TABLE "User" DROP COLUMN IF EXISTS "lastLoginProvider";

-- Create Invite table
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedById" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- Create unique index on Invite.code
CREATE UNIQUE INDEX "Invite_code_key" ON "Invite"("code");

-- Add foreign keys for Invite
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
