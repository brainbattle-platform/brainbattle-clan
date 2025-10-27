# 🧠 BrainBattle Core

> Core microservice for the **BrainBattle platform**, providing the foundation for social graph, community (Clan), and moderation features.
> Built with **NestJS**, **Prisma**, and **PostgreSQL**, verifying JWTs (RS256) issued by the `brainbattle-auth` service.

---

## 📦 Overview

**`brainbattle-core`** is one of the core microservices in the BrainBattle ecosystem. It serves as the backbone for social and community management, integrating tightly with authentication and messaging layers.

| Service                    | Role                            | Port   | Stack                        |
| -------------------------- | ------------------------------- | ------ | ---------------------------- |
| 🔐 `brainbattle-auth`      | Authentication & JWT RS256      | `3000` | NestJS + Prisma              |
| ⚙️ `brainbattle-core`      | Social graph, clans, moderation | `3001` | NestJS + Prisma + PostgreSQL |
| 💬 `brainbattle-messaging` | 1v1 & clan chat, WS + Redis     | `3002` | NestJS + Prisma + Redis      |

---

## ✨ Features

### 👥 Social Graph

* Follow / unfollow users
* Detect mutual relationships
* Block or unblock users

### 🏰 Community (Clan)

* Create and manage clans
* Handle join requests and invitations
* Approve or reject members
* Role management: Leader / Officer / Member

### 🛡️ Moderation (Lite)

* Submit reports for users or clans
* Admins can resolve, reject, or mark invalid
* Designed to scale to global moderation dashboard

### 🔐 Auth Integration

* RS256 JWT verification via `JwtGuard`
* Uses `JWT_PUBLIC_KEY_BASE64` from Auth Service
* Enforces consistent `issuer` and `audience`

---

## 🧰 Tech Stack

| Category  | Technology                       |
| --------- | -------------------------------- |
| Language  | TypeScript                       |
| Framework | NestJS                           |
| ORM       | Prisma ORM                       |
| Database  | PostgreSQL (port 5434)           |
| Auth      | JWT RS256 (verify only)          |
| Config    | `@nestjs/config`, `.env`         |
| Dev Tools | Docker Compose, ESLint, Prettier |

---

## ⚙️ Setup Guide

### 1️⃣ Clone & Install

```bash
git clone https://github.com/brainbattle-platform/brainbattle-core.git
cd brainbattle-core
npm install
```

### 2️⃣ Environment Variables

Create a `.env` file in the root directory:

```bash
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/coredb?schema=public

# JWT Verification (from brainbattle-auth)
JWT_ISSUER=brainbattle-auth
JWT_AUDIENCE=brainbattle-clients
JWT_PUBLIC_KEY_BASE64=LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0t...
```

> To encode your `public.pem` file:
>
> ```bash
> cat public.pem | base64 -w 0
> ```

### 3️⃣ Run Database via Docker

```yaml
version: '3.9'
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: coredb
    ports:
      - "5434:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

```bash
docker compose up -d
```

### 4️⃣ Generate Prisma Client & Seed Data

```bash
npx prisma generate
npm run prisma:migrate
npm run seed  # seeds demo users (u-1, u-2)
```

### 5️⃣ Run Service

```bash
npm run start:dev
```

> Service will be available at `http://localhost:3001`

---

## 🔌 API Endpoints

### 👥 Social Graph

| Method   | Endpoint                            | Description          |
| -------- | ----------------------------------- | -------------------- |
| `POST`   | `/v1/social/follows/:userId`        | Follow a user        |
| `DELETE` | `/v1/social/follows/:userId`        | Unfollow user        |
| `GET`    | `/v1/social/follows/mutual/:userId` | Check mutual follows |

### 🏰 Community (Clan)

| Method | Endpoint                      | Description          |
| ------ | ----------------------------- | -------------------- |
| `POST` | `/v1/clans`                   | Create a new clan    |
| `GET`  | `/v1/clans/:id`               | Get clan info        |
| `POST` | `/v1/clans/:id/join-requests` | Request to join clan |
| `POST` | `/v1/clans/:id/members`       | Approve a member     |
| `GET`  | `/v1/clans/:id/members`       | List clan members    |

### 🛡️ Moderation

| Method  | Endpoint          | Description                 |
| ------- | ----------------- | --------------------------- |
| `POST`  | `/v1/reports`     | Submit a report             |
| `GET`   | `/v1/reports`     | Get all reports             |
| `PATCH` | `/v1/reports/:id` | Resolve or dismiss a report |

---

## 🧪 Testing via Postman

Example using `ACCESS_TOKEN_U1` from `brainbattle-auth`:

```bash
POST http://localhost:3001/v1/social/follows/u-2
Authorization: Bearer <ACCESS_TOKEN_U1>
```

Or using curl:

```bash
curl -X POST http://localhost:3001/v1/social/follows/u-2 \
  -H "Authorization: Bearer <ACCESS_TOKEN_U1>"
```

---

## 📁 Project Structure

```
src/
 ├── common/              # JWT guards & interceptors
 ├── social-graph/        # Follow / unfollow logic
 ├── community/           # Clan modules
 ├── moderation/          # Report workflow
 ├── config/              # Environment setup
 └── app.module.ts        # Root module
prisma/
 ├── schema.prisma
 └── seed.ts
.env.example
docker-compose.yml
```

---

## 🔄 Useful Scripts

| Command                   | Description                 |
| ------------------------- | --------------------------- |
| `npm run start:dev`       | Start service in watch mode |
| `npm run prisma:generate` | Generate Prisma client      |
| `npm run prisma:migrate`  | Run DB migrations           |
| `npm run seed`            | Seed demo users             |
| `npm run lint`            | Lint code                   |
| `npm run format`          | Auto-format code            |

---

## 🧭 Integration Flow

```mermaid
graph TD;
    Auth[Auth Service] -->|Verify JWT| Core[Core Service (Social/Clan/Moderation)];
    Core -->|REST APIs| Client[Frontend / Mobile];
    Client --> Messaging[Messaging Service];
```

---

## 🧭 Future Roadmap

* Clan role hierarchy (Leader, Officer, Member)
* Pagination and sorting for Social Graph
* Activity logs & metrics endpoints
* Admin dashboards & audit trails
* Redis caching for user lookup

---

> © 2025 BrainBattle Platform — Core Microservice (v3.0)
> Maintained by BrainBattle Core Infrastructure Team
