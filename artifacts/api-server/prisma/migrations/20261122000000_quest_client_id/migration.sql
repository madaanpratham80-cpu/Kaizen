-- Prisma default table and column names are retained.
ALTER TABLE "Quest" ADD COLUMN "clientId" UUID;
CREATE UNIQUE INDEX "Quest_userId_clientId_key" ON "Quest"("userId", "clientId");
