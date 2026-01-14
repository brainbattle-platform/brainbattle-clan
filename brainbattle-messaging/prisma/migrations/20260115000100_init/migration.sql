-- Initial migration creating messaging schema

-- Enums
CREATE TYPE "ConversationType" AS ENUM ('dm', 'clan');
CREATE TYPE "MessageKind" AS ENUM ('text', 'attachment', 'system');
CREATE TYPE "AttachmentKind" AS ENUM ('image', 'file', 'link');

-- Tables
CREATE TABLE "Conversation" (
    "id" TEXT PRIMARY KEY,
    "type" "ConversationType" NOT NULL,
    "clanId" TEXT UNIQUE,
    "title" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Conversation_type_idx" ON "Conversation"("type");

CREATE TABLE "ConversationMember" (
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    CONSTRAINT "ConversationMember_pkey" PRIMARY KEY ("conversationId", "userId"),
    CONSTRAINT "ConversationMember_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE
);

CREATE INDEX "ConversationMember_userId_joinedAt_idx" ON "ConversationMember"("userId", "joinedAt");
CREATE INDEX "ConversationMember_conversationId_leftAt_idx" ON "ConversationMember"("conversationId", "leftAt");

CREATE TABLE "Message" (
    "id" TEXT PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT,
    "kind" "MessageKind" NOT NULL DEFAULT 'text',
    "content" TEXT,
    "systemPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE
);

CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
CREATE INDEX "Message_senderId_createdAt_idx" ON "Message"("senderId", "createdAt");

CREATE TABLE "Attachment" (
    "id" TEXT PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "kind" "AttachmentKind" NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "bucket" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "url" TEXT,
    "thumbnailUrl" TEXT,
    "fileName" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE
);

CREATE INDEX "Attachment_messageId_idx" ON "Attachment"("messageId");
CREATE INDEX "Attachment_objectKey_idx" ON "Attachment"("objectKey");

CREATE TABLE "MessageReceipt" (
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageReceipt_pkey" PRIMARY KEY ("messageId", "userId"),
    CONSTRAINT "MessageReceipt_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE
);

CREATE INDEX "MessageReceipt_userId_deliveredAt_idx" ON "MessageReceipt"("userId", "deliveredAt");
CREATE INDEX "MessageReceipt_userId_readAt_idx" ON "MessageReceipt"("userId", "readAt");

CREATE TABLE "ReadReceipt" (
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReadReceipt_pkey" PRIMARY KEY ("conversationId", "userId"),
    CONSTRAINT "ReadReceipt_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE
);

CREATE INDEX "ReadReceipt_userId_lastReadAt_idx" ON "ReadReceipt"("userId", "lastReadAt");

CREATE TABLE "DmKey" (
    "key" TEXT PRIMARY KEY,
    "conversationId" TEXT UNIQUE NOT NULL,
    CONSTRAINT "DmKey_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE
);

CREATE TABLE "Notification" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3)
);

CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

CREATE TABLE "Presence" (
    "userId" TEXT PRIMARY KEY,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Presence_lastActiveAt_idx" ON "Presence"("lastActiveAt");
