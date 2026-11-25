DROP TABLE IF EXISTS "ReflectionSuggestion";
DROP TYPE IF EXISTS "SuggestionType";

ALTER TABLE "reflection"
  DROP COLUMN "title",
  DROP COLUMN "content",
  DROP COLUMN "date",
  DROP COLUMN "drawingPaths",
  ADD COLUMN "revision" UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN "payload" JSONB;
