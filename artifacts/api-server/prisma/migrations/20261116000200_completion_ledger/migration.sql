BEGIN;

-- PlayerState counter defaults, NOT NULL, and value checks already exist from Slice 2.

-- CreateTable
CREATE TABLE "ProgressEvent" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "awardKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "occurrenceId" UUID,
    "dayId" UUID,
    "sealCode" TEXT,
    "xpDelta" INTEGER NOT NULL,
    "healthDelta" INTEGER NOT NULL,
    "ruleVersion" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompletionReceipt" (
    "userId" UUID NOT NULL,
    "operationId" UUID NOT NULL,
    "requestHash" CHAR(64) NOT NULL,
    "responseBody" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompletionReceipt_pkey" PRIMARY KEY ("userId","operationId")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "code" TEXT NOT NULL,
    "ruleVersion" INTEGER NOT NULL,
    "eligibilityRule" JSONB NOT NULL,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("code","ruleVersion")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "userId" UUID NOT NULL,
    "achievementCode" TEXT NOT NULL,
    "ruleVersion" INTEGER NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "qualifyingOccurrenceId" UUID,
    "qualifyingDayId" UUID,
    "bonusXp" INTEGER NOT NULL,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("userId","achievementCode")
);

-- CreateIndex
CREATE INDEX "ProgressEvent_userId_recordedAt_idx" ON "ProgressEvent"("userId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProgressEvent_userId_sequence_key" ON "ProgressEvent"("userId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "ProgressEvent_userId_awardKey_key" ON "ProgressEvent"("userId", "awardKey");

-- CreateIndex
CREATE INDEX "CompletionReceipt_createdAt_idx" ON "CompletionReceipt"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuestOccurrence_userId_id_key" ON "QuestOccurrence"("userId", "id");

-- AddForeignKey
ALTER TABLE "ProgressEvent" ADD CONSTRAINT "ProgressEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressEvent" ADD CONSTRAINT "ProgressEvent_userId_dayId_fkey" FOREIGN KEY ("userId", "dayId") REFERENCES "DayPlan"("userId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressEvent" ADD CONSTRAINT "ProgressEvent_userId_occurrenceId_fkey" FOREIGN KEY ("userId", "occurrenceId") REFERENCES "QuestOccurrence"("userId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressEvent" ADD CONSTRAINT "ProgressEvent_userId_dayId_occurrenceId_fkey" FOREIGN KEY ("userId", "dayId", "occurrenceId") REFERENCES "QuestOccurrence"("userId", "dayPlanId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressEvent" ADD CONSTRAINT "ProgressEvent_sealCode_ruleVersion_fkey" FOREIGN KEY ("sealCode", "ruleVersion") REFERENCES "Achievement"("code", "ruleVersion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompletionReceipt" ADD CONSTRAINT "CompletionReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_achievementCode_ruleVersion_fkey" FOREIGN KEY ("achievementCode", "ruleVersion") REFERENCES "Achievement"("code", "ruleVersion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_qualifyingDayId_fkey" FOREIGN KEY ("userId", "qualifyingDayId") REFERENCES "DayPlan"("userId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_qualifyingOccurrenceId_fkey" FOREIGN KEY ("userId", "qualifyingOccurrenceId") REFERENCES "QuestOccurrence"("userId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_qualifyingDayId_qualifyingOccurrenc_fkey" FOREIGN KEY ("userId", "qualifyingDayId", "qualifyingOccurrenceId") REFERENCES "QuestOccurrence"("userId", "dayPlanId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProgressEvent" ADD CONSTRAINT "ProgressEvent_values_check" CHECK (
  "sequence" > 0 AND "ruleVersion" > 0 AND "xpDelta" >= 0
  AND "healthDelta" BETWEEN -100 AND 100
  AND length(btrim("kind")) > 0 AND length(btrim("awardKey")) > 0
);

ALTER TABLE "CompletionReceipt" ADD CONSTRAINT "CompletionReceipt_hash_check"
CHECK ("requestHash" ~ '^[0-9a-f]{64}$');

ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_values_check"
CHECK ("ruleVersion" > 0 AND length(btrim("code")) > 0);

ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_values_check"
CHECK ("bonusXp" >= 0 AND ("qualifyingDayId" IS NOT NULL OR "qualifyingOccurrenceId" IS NOT NULL));

COMMIT;
