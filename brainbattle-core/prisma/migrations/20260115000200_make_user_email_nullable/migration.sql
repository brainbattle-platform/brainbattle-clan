-- Align User.email nullability with Prisma schema
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
