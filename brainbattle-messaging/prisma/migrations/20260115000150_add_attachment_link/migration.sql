-- Extend AttachmentKind enum to support link attachments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t WHERE t.typname = 'AttachmentKind') THEN
    CREATE TYPE "AttachmentKind" AS ENUM ('image', 'file', 'link');
  ELSIF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'AttachmentKind' AND e.enumlabel = 'link'
  ) THEN
    ALTER TYPE "AttachmentKind" ADD VALUE 'link';
  END IF;
END $$;
