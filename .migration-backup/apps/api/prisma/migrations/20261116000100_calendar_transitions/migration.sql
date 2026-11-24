BEGIN;

-- CreateTable
CREATE TABLE "CalendarTimezoneTransition" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "fromTimezone" TEXT NOT NULL,
    "toTimezone" TEXT NOT NULL,
    "lastOldDate" DATE NOT NULL,
    "firstNewDate" DATE NOT NULL,
    "gapStartsAt" TIMESTAMP(3) NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "appliedAt" TIMESTAMP(3),

    CONSTRAINT "CalendarTimezoneTransition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalendarTimezoneTransition_userId_appliedAt_idx" ON "CalendarTimezoneTransition"("userId", "appliedAt");

-- AddForeignKey
ALTER TABLE "CalendarTimezoneTransition" ADD CONSTRAINT "CalendarTimezoneTransition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CalendarTimezoneTransition"
ADD CONSTRAINT "CalendarTimezoneTransition_bounds_check" CHECK (
  "firstNewDate" > "lastOldDate" AND "effectiveAt" >= "gapStartsAt"
  AND ("appliedAt" IS NULL OR "appliedAt" >= "effectiveAt")
);
CREATE UNIQUE INDEX "CalendarTimezoneTransition_pending_key"
ON "CalendarTimezoneTransition" ("userId") WHERE "appliedAt" IS NULL;

-- Reconcile accounts created between the schema backfill and this rollout.
INSERT INTO "PlayerState" ("userId") SELECT "id" FROM "User"
ON CONFLICT ("userId") DO NOTHING;

COMMIT;
