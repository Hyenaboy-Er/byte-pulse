-- Adds Article.originalTitle so the dedup gate can compare picked RSS titles
-- against the source-language title of already-published articles (catches
-- cross-language duplicates like a German Heise story rephrased as an English
-- article being re-picked from t3n later in the same day).
ALTER TABLE "Article" ADD COLUMN "originalTitle" TEXT;
