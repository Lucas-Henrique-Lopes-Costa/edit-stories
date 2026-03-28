-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Video" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "originalName" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "shortName" TEXT,
    "shortNameAuto" TEXT,
    "duration" REAL,
    "errorMessage" TEXT,
    "subtitlePosition" REAL NOT NULL DEFAULT 0.75,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Video" ("createdAt", "duration", "errorMessage", "fileName", "filePath", "id", "originalName", "shortName", "shortNameAuto", "status", "updatedAt") SELECT "createdAt", "duration", "errorMessage", "fileName", "filePath", "id", "originalName", "shortName", "shortNameAuto", "status", "updatedAt" FROM "Video";
DROP TABLE "Video";
ALTER TABLE "new_Video" RENAME TO "Video";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
