/*
  Warnings:

  - You are about to drop the column `taxNumber` on the `User` table. All the data in the column will be lost.
  - Added the required column `AFM` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "taxNumber",
ADD COLUMN     "AFM" TEXT NOT NULL;
