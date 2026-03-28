-- Add trim columns to Video
ALTER TABLE "Video" ADD COLUMN "trimStart" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Video" ADD COLUMN "trimEnd"   REAL;

-- Products table
CREATE TABLE "Product" (
    "id"        TEXT     NOT NULL PRIMARY KEY,
    "name"      TEXT     NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Product_name_key" ON "Product"("name");

-- VideoProduct junction table
CREATE TABLE "VideoProduct" (
    "videoId"   TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    PRIMARY KEY ("videoId", "productId"),
    CONSTRAINT "VideoProduct_videoId_fkey"   FOREIGN KEY ("videoId")   REFERENCES "Video"   ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VideoProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
