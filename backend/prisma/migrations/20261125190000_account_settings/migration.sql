CREATE TABLE "account_settings" (
  "userId" INTEGER NOT NULL PRIMARY KEY,
  "cloudAiEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT "account_settings_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user_account"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
