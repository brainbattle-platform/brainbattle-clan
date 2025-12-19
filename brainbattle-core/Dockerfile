# ==========================
# BUILD STAGE
# ==========================
FROM node:20 AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
COPY . .

RUN npx prisma generate
RUN npm run build

# ==========================
# RUNTIME STAGE
# ==========================
FROM node:20
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY prisma ./prisma
COPY --from=build /app/dist ./dist

# 🔴 BẮT BUỘC: generate lại trong runtime image
RUN npx prisma generate

EXPOSE 3000
CMD ["node", "dist/main.js"]
