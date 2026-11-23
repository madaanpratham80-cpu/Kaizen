CREATE TYPE "Gender" AS ENUM ('male', 'female');

ALTER TABLE "User" ADD COLUMN "gender" "Gender";
