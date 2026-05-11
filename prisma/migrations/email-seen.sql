-- Email-Watcher: store every Message-ID we have already processed so re-runs
-- never alert twice on the same email. Applied via src/scripts/turso-init.ts.

CREATE TABLE IF NOT EXISTS "EmailSeen" (
  "id"        TEXT PRIMARY KEY NOT NULL,
  "messageId" TEXT NOT NULL UNIQUE,
  "fromAddr"  TEXT NOT NULL,
  "subject"   TEXT NOT NULL,
  "category"  TEXT NOT NULL,
  "seenAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "EmailSeen_seenAt_idx"            ON "EmailSeen"("seenAt");
CREATE INDEX IF NOT EXISTS "EmailSeen_category_seenAt_idx"   ON "EmailSeen"("category", "seenAt");
