ALTER TABLE "User" ADD COLUMN "goals" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "User" ADD CONSTRAINT "User_goals_limit" CHECK (cardinality("goals") <= 8);
