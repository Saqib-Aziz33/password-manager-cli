/*
  Warnings:

  - You are about to drop the column `key` on the `Key` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Key` table. All the data in the column will be lost.
  - Added the required column `iv` to the `Key` table without a default value. This is not possible if the table is not empty.
  - Added the required column `text` to the `Key` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Key" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "text" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Key" ("createdAt", "id", "updatedAt") SELECT "createdAt", "id", "updatedAt" FROM "Key";
DROP TABLE "Key";
ALTER TABLE "new_Key" RENAME TO "Key";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
