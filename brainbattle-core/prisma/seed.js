"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    await prisma.user.upsert({ where: { id: 'u-1' }, update: {}, create: { id: 'u-1', email: 'u1@example.com', handle: 'u1' } });
    await prisma.user.upsert({ where: { id: 'u-2' }, update: {}, create: { id: 'u-2', email: 'u2@example.com', handle: 'u2' } });
}
main().finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map