-- Convert existing 'manager' memberships and invites to 'staff'
UPDATE "Membership" SET role = 'staff'::"MembershipRole" WHERE role = 'manager'::"MembershipRole";
UPDATE "Invite" SET role = 'staff'::"MembershipRole" WHERE role = 'manager'::"MembershipRole";

-- Recreate enum without 'manager'
CREATE TYPE "MembershipRole_new" AS ENUM ('owner', 'staff');

ALTER TABLE "Membership"
    ALTER COLUMN role TYPE "MembershipRole_new"
    USING role::text::"MembershipRole_new";

ALTER TABLE "Invite"
    ALTER COLUMN role TYPE "MembershipRole_new"
    USING role::text::"MembershipRole_new";

DROP TYPE "MembershipRole";
ALTER TYPE "MembershipRole_new" RENAME TO "MembershipRole";
