-- Convert fontSize from absolute pixels to fraction of video height.
-- Old default: 36 (pixels at 1920px height).
-- New default: 0.01875 (= 36 / 1920 = 1.875% of video height).
-- This makes subtitles look identical regardless of video resolution.
UPDATE "Video" SET "fontSize" = CAST("fontSize" AS REAL) / 1920.0 WHERE "fontSize" >= 1;
