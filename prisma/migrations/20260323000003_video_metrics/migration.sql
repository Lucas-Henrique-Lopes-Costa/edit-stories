-- VideoMetrics table for manual performance tracking
CREATE TABLE "VideoMetrics" (
    "id"            TEXT     NOT NULL PRIMARY KEY,
    "videoId"       TEXT     NOT NULL UNIQUE,
    "investedValue" REAL,
    "salesValue"    REAL,
    "salesCount"    INTEGER,
    "impressions"   INTEGER,
    "reach"         INTEGER,
    "updatedAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VideoMetrics_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
