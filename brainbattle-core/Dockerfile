# Base image
FROM node:20 as base
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build NestJS (creates dist/)
RUN npm run build



# ==========================
#  PRODUCTION IMAGE (SMALL)
# ==========================
FROM node:20

WORKDIR /app

# Copy only necessary files from build stage
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/prisma ./prisma

# Prisma needs schema at runtime
COPY --from=base /app/package*.json ./

EXPOSE 3001

CMD ["node", "dist/main.js"]
