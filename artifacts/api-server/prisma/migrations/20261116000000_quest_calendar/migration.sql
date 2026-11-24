BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- CreateEnum
CREATE TYPE "DayStatus" AS ENUM ('OPEN', 'ACTIVE', 'MISSED', 'REST', 'EMPTY');

-- CreateEnum
CREATE TYPE "OccurrenceStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "QuestDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateTable
CREATE TABLE "PlayerState" (
    "userId" UUID NOT NULL,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "health" INTEGER NOT NULL DEFAULT 70,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastFinalizedDate" DATE,
    "stateVersion" INTEGER NOT NULL DEFAULT 0,
    "nextEventSequence" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PlayerState_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Quest" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "pillar" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "archiveEffectiveDate" DATE,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Quest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleVersion" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "questId" UUID NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "recurrence" TEXT NOT NULL,
    "weekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "pillar" TEXT NOT NULL,
    "difficulty" "QuestDifficulty" NOT NULL,
    "target" INTEGER NOT NULL,
    "ruleVersion" INTEGER NOT NULL,

    CONSTRAINT "ScheduleVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DayPreferenceVersion" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "restWeekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],

    CONSTRAINT "DayPreferenceVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DayPlan" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "localDate" DATE NOT NULL,
    "timezoneSnapshot" TEXT NOT NULL,
    "startsAtUtc" TIMESTAMP(3) NOT NULL,
    "deadlineUtc" TIMESTAMP(3) NOT NULL,
    "status" "DayStatus" NOT NULL,
    "priorityId" UUID,
    "priorityLockedAt" TIMESTAMP(3),
    "plannedCount" INTEGER NOT NULL DEFAULT 0,
    "healthGainAccounted" INTEGER NOT NULL DEFAULT 0,
    "streakApplied" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "DayPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestOccurrence" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "questId" UUID NOT NULL,
    "dayPlanId" UUID NOT NULL,
    "planned" BOOLEAN NOT NULL,
    "status" "OccurrenceStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "pillar" TEXT NOT NULL,
    "difficulty" "QuestDifficulty" NOT NULL,
    "target" INTEGER NOT NULL,
    "rewardXp" INTEGER NOT NULL,
    "ruleVersion" INTEGER NOT NULL,

    CONSTRAINT "QuestOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Quest_userId_archivedAt_idx" ON "Quest"("userId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Quest_userId_id_key" ON "Quest"("userId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleVersion_userId_questId_effectiveFrom_key" ON "ScheduleVersion"("userId", "questId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "DayPreferenceVersion_userId_effectiveFrom_key" ON "DayPreferenceVersion"("userId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "DayPlan_userId_localDate_key" ON "DayPlan"("userId", "localDate");

-- CreateIndex
CREATE UNIQUE INDEX "DayPlan_userId_id_key" ON "DayPlan"("userId", "id");

-- CreateIndex
CREATE INDEX "QuestOccurrence_dayPlanId_status_idx" ON "QuestOccurrence"("dayPlanId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "QuestOccurrence_questId_dayPlanId_key" ON "QuestOccurrence"("questId", "dayPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestOccurrence_userId_dayPlanId_id_key" ON "QuestOccurrence"("userId", "dayPlanId", "id");

-- AddForeignKey
ALTER TABLE "PlayerState" ADD CONSTRAINT "PlayerState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleVersion" ADD CONSTRAINT "ScheduleVersion_userId_questId_fkey" FOREIGN KEY ("userId", "questId") REFERENCES "Quest"("userId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayPreferenceVersion" ADD CONSTRAINT "DayPreferenceVersion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayPlan" ADD CONSTRAINT "DayPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayPlan" ADD CONSTRAINT "DayPlan_userId_id_priorityId_fkey" FOREIGN KEY ("userId", "id", "priorityId") REFERENCES "QuestOccurrence"("userId", "dayPlanId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "QuestOccurrence" ADD CONSTRAINT "QuestOccurrence_userId_questId_fkey" FOREIGN KEY ("userId", "questId") REFERENCES "Quest"("userId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestOccurrence" ADD CONSTRAINT "QuestOccurrence_userId_dayPlanId_fkey" FOREIGN KEY ("userId", "dayPlanId") REFERENCES "DayPlan"("userId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlayerState" ADD CONSTRAINT "PlayerState_values_check" CHECK (
  "health" BETWEEN 0 AND 100 AND "totalXp" >= 0 AND "currentStreak" >= 0
  AND "bestStreak" >= "currentStreak" AND "stateVersion" >= 0 AND "nextEventSequence" > 0
);
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_version_and_archive_check" CHECK (
  "version" > 0 AND ("archivedAt" IS NULL) = ("archiveEffectiveDate" IS NULL)
);
ALTER TABLE "ScheduleVersion"
  ADD CONSTRAINT "ScheduleVersion_values_check" CHECK (
    ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom")
    AND "target" >= 0 AND "ruleVersion" > 0
    AND "weekdays" IS NOT NULL AND array_position("weekdays", NULL) IS NULL
    AND "weekdays" <@ ARRAY[1,2,3,4,5,6,7]
  ),
  ADD CONSTRAINT "ScheduleVersion_no_overlap" EXCLUDE USING gist (
    "userId" WITH =, "questId" WITH =,
    daterange("effectiveFrom", "effectiveTo", '[)') WITH &&
  );
ALTER TABLE "DayPreferenceVersion"
  ADD CONSTRAINT "DayPreferenceVersion_values_check" CHECK (
    ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom")
    AND "restWeekdays" IS NOT NULL AND array_position("restWeekdays", NULL) IS NULL
    AND "restWeekdays" <@ ARRAY[1,2,3,4,5,6,7]
  ),
  ADD CONSTRAINT "DayPreferenceVersion_no_overlap" EXCLUDE USING gist (
    "userId" WITH =, daterange("effectiveFrom", "effectiveTo", '[)') WITH &&
  );
ALTER TABLE "DayPlan" ADD CONSTRAINT "DayPlan_values_check" CHECK (
  "deadlineUtc" > "startsAtUtc" AND "plannedCount" >= 0
  AND "healthGainAccounted" BETWEEN 0 AND 5
);
ALTER TABLE "QuestOccurrence" ADD CONSTRAINT "QuestOccurrence_values_check" CHECK (
  "target" >= 0 AND "rewardXp" >= 0 AND "ruleVersion" > 0
  AND ("status" = 'COMPLETED') = ("completedAt" IS NOT NULL)
);
CREATE INDEX "DayPlan_unclosed_deadline_idx" ON "DayPlan" ("deadlineUtc") WHERE "closedAt" IS NULL;

INSERT INTO "PlayerState" ("userId") SELECT "id" FROM "User";

COMMIT;
