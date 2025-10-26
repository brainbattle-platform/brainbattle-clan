# 🧠 BrainBattle Core

> Core microservice for the **BrainBattle platform**, providing the foundation for social graph, community (Clan), and moderation features.  
> Built with **NestJS**, **Prisma**, and **PostgreSQL**, verifying JWTs (RS256) issued by the `brainbattle-auth` service.

---

## 🏗️ Overview

`brainbattle-core` is part of the **BrainBattle microservice ecosystem**:

| Service | Purpose | Ports | Tech |
|----------|----------|--------|------|
| 🧠 **Auth Service** | Authentication, JWT RS256, OTP | `3000` | NestJS + Prisma |
| ⚙️ **Core Service (this)** | Social Graph, Clans, Moderation | `3001` | NestJS + Prisma + PostgreSQL |
| 💬 **Messaging Service** | 1v1 & Clan chat (Socket.IO + Redis) | `3002` | NestJS + Prisma + Redis |

---

## ✨ Features

### 🧩 Social Graph
- Follow / unfollow users  
- Detect mutual relationships  
- Block users  

### 🏰 Community (Clan)
- Create / manage clans  
- Join requests & invitations  
- Approve / reject membership  
- Role management (Leader / Officer / Member)

### 🛡️ Moderation (Lite)
- Report users or clans  
- Admin review workflow  
- Resolve or dismiss reports

### 🔐 Auth Integration
- Validates RS256 tokens from `brainbattle-auth`
- Uses `JWT_PUBLIC_KEY_BASE64` (Base64 of `public.pem`)

---

## 🧰 Tech Stack

| Category | Tools |
|-----------|-------|
| Language | TypeScript |
| Framework | [NestJS](https://nestjs.com) |
| ORM | [Prisma ORM](https://www.prisma.io) |
| Database | PostgreSQL |
| Auth | JWT RS256 (verify only) |
| Config | `@nestjs/config`, `.env` |
| Dev | Docker Compose, ESLint, Prettier |

---

## ⚙️ Setup Guide

### 1️⃣ Clone the repository
```bash
git clone https://github.com/brainbattle-platform/brainbattle-core.git
cd brainbattle-core
npm install
```
2️⃣ Environment Variables
Create a file named .env in the project root:

```bash
# .env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/coredb?schema=public

# JWT Verification (public key from brainbattle-auth)
JWT_ISSUER=brainbattle-auth
JWT_AUDIENCE=brainbattle-clients
JWT_PUBLIC_KEY_BASE64=LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0t...
```
To encode your public.pem from the auth-service:

```bash
cat public.pem | base64 -w 0
```
###3️⃣ Run PostgreSQL with Docker
```yaml
# docker-compose.yml
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
Start the DB:

```bash
docker compose up -d
```
###4️⃣ Generate Prisma Client & Run Migrations
```bash
npx prisma generate
npm run prisma:migrate
npm run seed    # optional: seeds demo users u-1, u-2
```
###5️⃣ Start the service
```bash
npm run start:dev
```
###✅ Service is available at:

```arduino
http://localhost:3001
```
###🔌 API Endpoints (Summary)
###👥 Social Graph
Method	Endpoint	Description
POST	/v1/social/follows/:userId	Follow a user
DELETE	/v1/social/follows/:userId	Unfollow
GET	/v1/social/follows/mutual/:userId	Check mutual follow

###🏰 Community (Clan)
Method	Endpoint	Description
POST	/v1/clans	Create a clan
GET	/v1/clans/:id	View clan details
POST	/v1/clans/:id/join-requests	Send join request
POST	/v1/clans/:id/members	Approve a member
GET	/v1/clans/:id/members	List members

###🛡️ Moderation
Method	Endpoint	Description
POST	/v1/reports	Submit a report
GET	/v1/reports	List all reports
PATCH	/v1/reports/:id	Resolve / dismiss a report

###🧪 Testing with Postman
Example using a token from brainbattle-auth:

```bash
POST http://localhost:3001/v1/social/follows/u-2
Authorization: Bearer <ACCESS_TOKEN_U1>
```
Or using curl:

```bash
curl -X POST http://localhost:3001/v1/social/follows/u-2 \
  -H "Authorization: Bearer <ACCESS_TOKEN_U1>"
```
###🧱 Project Structure
```arduino
src/
 ├── common/
 │   └── jwt.guard.ts
 ├── social-graph/
 ├── community/
 ├── moderation/
 ├── config/
 └── app.module.ts
prisma/
 ├── schema.prisma
 └── seed.ts
docker-compose.yml
.env.example
```
###🔄 Useful Scripts
```Command	Description
npm run start:dev	Run service in watch mode
npm run prisma:generate	Generate Prisma client
npm run prisma:migrate	Apply DB migrations
npm run seed	Seed demo users
npm run format	Format source files
npm run lint	Lint all files
```
###🧭 Integration Flow
```mermaid
graph TD;
    Auth["Auth Service (JWT RS256)"] -->|Verify| Core["Core Service (Social/Clan/Moderation)"];
    Core -->|REST APIs| Client["Frontend / Mobile App"];
```
###🧰 Future Roadmap
Clan roles (Leader, Officer, Member)

Pagination & sorting for social graph

Activity logs and metrics endpoints

Audit system & admin dashboards

Redis caching for user lookups

