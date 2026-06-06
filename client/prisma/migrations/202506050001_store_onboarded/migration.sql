-- Add onboarded flag to Store
ALTER TABLE "Store" ADD COLUMN "onboarded" BOOLEAN NOT NULL DEFAULT false;
