# ---------- STAGE 1: Builder ----------
FROM node:20-alpine AS builder

# Cài thêm vài thứ nếu prisma/native libs cần
RUN apk add --no-cache openssl

WORKDIR /app

# Copy file khai báo dependency trước để cache npm install
COPY package*.json ./

# Cài deps (dùng npm ci nếu lockfile chuẩn)
RUN npm install

# Prisma schema & migrate scripts (để prisma generate có schema)
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy toàn bộ source
COPY . .

# Build NestJS (ra thư mục dist/)
RUN npm run build


# ---------- STAGE 2: Runtime ----------
FROM node:20-alpine AS runner

WORKDIR /app

# Copy node_modules & build output từ builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

ENV NODE_ENV=production

# Nếu muốn container tự chạy migrate mỗi khi start, dùng dòng dưới:
# CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]

# Nếu bạn migrate thủ công (đã làm rồi) thì dùng dòng đơn giản:
CMD ["node", "dist/main.js"]
