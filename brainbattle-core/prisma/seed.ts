import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.user.upsert({ where: { id: 'u-1' }, update: {}, create: { id: 'u-1', email: 'u1@example.com', handle: 'u1' } });
  await prisma.user.upsert({ where: { id: 'u-2' }, update: {}, create: { id: 'u-2', email: 'u2@example.com', handle: 'u2' } });
}
main().finally(() => prisma.$disconnect());
