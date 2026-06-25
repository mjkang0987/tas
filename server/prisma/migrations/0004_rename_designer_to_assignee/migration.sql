-- Rename Designer -> Assignee (physical rename, data preserved in place).
-- IMPORTANT: This migration uses ALTER ... RENAME so existing rows survive.
-- Do NOT regenerate this from `prisma migrate dev` (that would DROP/CREATE = data loss).
-- Constraint/index names below were verified against 0001_init (Prisma default naming).

-- enum type
ALTER TYPE "DesignerStatus" RENAME TO "AssigneeStatus";

-- tables
ALTER TABLE "Designer" RENAME TO "Assignee";
ALTER TABLE "DesignerSchedule" RENAME TO "AssigneeSchedule";

-- columns
ALTER TABLE "AssigneeSchedule" RENAME COLUMN "designerId" TO "assigneeId";
ALTER TABLE "Reservation" RENAME COLUMN "designerId" TO "assigneeId";

-- primary keys
ALTER INDEX "Designer_pkey" RENAME TO "Assignee_pkey";
ALTER INDEX "DesignerSchedule_pkey" RENAME TO "AssigneeSchedule_pkey";

-- unique indexes
ALTER INDEX "Designer_storeId_legacyId_key" RENAME TO "Assignee_storeId_legacyId_key";
ALTER INDEX "DesignerSchedule_designerId_dayIndex_key" RENAME TO "AssigneeSchedule_assigneeId_dayIndex_key";

-- foreign key constraints
ALTER TABLE "Assignee" RENAME CONSTRAINT "Designer_storeId_fkey" TO "Assignee_storeId_fkey";
ALTER TABLE "AssigneeSchedule" RENAME CONSTRAINT "DesignerSchedule_designerId_fkey" TO "AssigneeSchedule_assigneeId_fkey";
ALTER TABLE "Reservation" RENAME CONSTRAINT "Reservation_designerId_fkey" TO "Reservation_assigneeId_fkey";
