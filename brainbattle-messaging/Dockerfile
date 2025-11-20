# ---------- STAGE 1: Builder ----------
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build


# ---------- STAGE 2: Runtime ----------
FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

ENV NODE_ENV=production

# Hoặc dùng migrate deploy nếu muốn:
# CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]

CMD ["node", "dist/main.js"]
