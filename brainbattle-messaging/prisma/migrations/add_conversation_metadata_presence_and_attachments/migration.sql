-- Add Conversation metadata fields for contract compliance
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;

-- Add Attachment fields for contract compliance
ALTER TABLE "Attachment" ADD COLUMN IF NOT EXISTS "fileName" TEXT;
ALTER TABLE "Attachment" ADD COLUMN IF NOT EXISTS "thumbnailUrl" TEXT;

-- Create ReadReceipt foreign key to Conversation with cascade delete
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ReadReceipt_conversationId_fkey'
    ) THEN
        ALTER TABLE "ReadReceipt" 
        ADD CONSTRAINT "ReadReceipt_conversationId_fkey" 
        FOREIGN KEY ("conversationId") 
        REFERENCES "Conversation"("id") 
        ON DELETE CASCADE;
    END IF;
END $$;

-- Create Presence table for activity tracking
CREATE TABLE IF NOT EXISTS "Presence" (
    "userId" TEXT NOT NULL,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Presence_pkey" PRIMARY KEY ("userId")
);

-- Create index on lastActiveAt for active user queries (within 5 minutes)
CREATE INDEX IF NOT EXISTS "Presence_lastActiveAt_idx" ON "Presence"("lastActiveAt");
