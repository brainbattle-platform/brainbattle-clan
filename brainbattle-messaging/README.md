# 🧠 BrainBattle Messaging Service

> **Microservice:** Handles Direct Messaging (DM), realtime WebSocket communication, message lifecycle, receipts, moderation, and user thread settings.

---

## 📦 Overview

**`brainbattle-messaging`** is one of the microservices in the **BrainBattle Platform** ecosystem. It manages the **1v1 and clan chat system**, supporting realtime communication, message delivery receipts, moderation, and chat search.

* Framework: **NestJS + Prisma ORM**
* Database: **PostgreSQL** (port 5436)
* Cache / Realtime scaling: **Redis + Socket.IO Redis adapter**
* Auth: **JWT RS256**, validated via `JwtHttpGuard` and `JwtWsGuard`
* Communication: REST + WebSocket (namespace `/dm`)

---

## 🧩 Features

### 🧱 Core (Sprint 1)

* Create **one-to-one threads** with unique `pairKey`
* Join, leave, and fetch participants from threads
* Message send/receive via WebSocket in real-time
* Delivery and read receipts

### 📨 Sprint 2: Messaging Fundamentals

* Thread creation and participant validation
* Rate limit + presence tracking (`RateLimitService`)
* Prisma schema for `DMThread`, `DMMessage`, `DMParticipant`, `DMReceipt`, and `DMReport`
* WS events: `join`, `leave`, `message.send`, `message.read`, `typing`
* Moderation base (`DMReport` for reported messages)

### 🔁 Sprint 3: Lifecycle + Search + Scaling

* **Edit / Delete messages** (`PATCH /v1/messages/:id`, `DELETE /v1/messages/:id`)
* **Realtime message.update / message.delete** events
* **Message search** in threads with pagination & cursor
* **User settings** (`mute`, `pin`, `archive` per thread)
* **Redis adapter** for multi-instance WebSocket scaling
* Prisma schema expansion (`DMUserThreadSetting`, new fields in `DMMessage`)

---

## 🧠 Architecture

```
brainbattle-messaging/
├── prisma/
│   ├── schema.prisma            # DM models & enums
│   ├── migrations/              # Auto-generated DB migrations
│   └── migration_lock.toml
├── src/
│   ├── common/                  # Auth guards (JWT for HTTP/WS)
│   ├── gateway/                 # WebSocket gateway (ChatGateway)
│   ├── messages/                # Message lifecycle REST API
│   ├── moderation/              # DM-level moderation
│   ├── prisma/                  # PrismaModule + PrismaService
│   ├── rate/                    # RateLimitService (presence & throttling)
│   └── threads/                 # Thread CRUD & participant services
├── test/                        # e2e tests (optional)
├── .env                         # environment config
└── docker-compose.yml            # local test setup (Postgres + Redis)
```

---

## 🧾 Environment Variables

```bash
# JWT keys (same public key as core for RS256 verification)
JWT_PUBLIC_KEY_BASE64=<base64 public key>
JWT_PRIVATE_KEY_BASE64=<base64 private key>

# PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5436/msgdb?schema=public

# Redis (for WS adapter)
REDIS_URL=redis://localhost:6381

# Rate limiting & presence (optional tuning)
RATE_LIMIT_MAX=10
RATE_LIMIT_WINDOW=5
```

---

## 🧱 Prisma Schema (Key Models)

```prisma
model DMThread {
  id           String          @id @default(cuid())
  kind         ThreadKind
  pairKey      String?          @unique
  clanId       String?
  createdAt    DateTime         @default(now())
  participants DMParticipant[]  @relation("ThreadParticipants")
  messages     DMMessage[]      @relation("ThreadMessages")
}

model DMMessage {
  id         String      @id @default(cuid())
  threadId   String
  senderId   String
  kind       MessageKind @default(TEXT)
  content    String?
  attachment Json?
  createdAt  DateTime    @default(now())
  editedAt   DateTime?
  deletedAt  DateTime?
  deletedBy  String?
}

model DMUserThreadSetting {
  threadId   String
  userId     String
  mutedUntil DateTime?
  pinnedAt   DateTime?
  archivedAt DateTime?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  @@id([threadId, userId])
}
```

---

## 🧩 WebSocket Events

| Event               | Direction       | Description                                 |
| ------------------- | --------------- | ------------------------------------------- |
| `join`              | Client → Server | Join a DM thread room                       |
| `leave`             | Client → Server | Leave DM thread room                        |
| `typing`            | Client → Server | Send typing indicator to other participants |
| `message.send`      | Client → Server | Send a message to thread                    |
| `message.new`       | Server → Client | Broadcast new message to all participants   |
| `message.updated`   | Server → Client | Broadcast edited message                    |
| `message.deleted`   | Server → Client | Broadcast message deletion                  |
| `message.read`      | Client → Server | Mark message as read                        |
| `receipt.delivered` | Server → Client | Notify message delivered                    |
| `receipt.read`      | Server → Client | Notify message read confirmation            |

---

## 🌐 REST Endpoints

| Method   | Endpoint                             | Description                                      |
| -------- | ------------------------------------ | ------------------------------------------------ |
| `POST`   | `/v1/threads/one-to-one`             | Create or get a one-to-one thread                |
| `GET`    | `/v1/threads/:id/participants`       | Get participants in thread                       |
| `GET`    | `/v1/threads/:id/messages`           | Get recent messages (with pagination)            |
| `GET`    | `/v1/threads/:id/messages/search?q=` | Search message content                           |
| `PATCH`  | `/v1/messages/:id`                   | Edit message                                     |
| `DELETE` | `/v1/messages/:id`                   | Soft-delete message                              |
| `PATCH`  | `/v1/threads/:id/settings`           | Update user thread settings (mute, pin, archive) |

---

## 🧪 Local Development

### 1️⃣ Run database and Redis via Docker

```bash
docker compose up -d
```

### 2️⃣ Generate Prisma client

```bash
npx prisma migrate dev --name init_messaging
npx prisma generate
```

### 3️⃣ Start service

```bash
npm run start:dev
```

---

## 🧩 Realtime Test (Postman / Socket.IO Client)

1. Use **token_u1** → connect WebSocket `/dm`
2. `Create One-to-One Thread` → get & save `threadId`
3. `Get Participants` → confirm user1, user2
4. Use **token_u2** → connect as user2
5. `Get Messages` → should be empty initially
6. Send `message.send` from u1 → u2 receives `message.new`
7. Send `message.read` from u2 → u1 receives `receipt.read`
8. Confirm DB updates via `npx prisma studio`

---

## 🚀 Deployment Notes

* Each microservice uses its own PostgreSQL + Redis instance.
* JWT public key must match that of **brainbattle-auth**.
* Socket.IO Redis adapter enables horizontal scaling (multi-instance).
* All timestamps are in UTC.

---

## 📘 Next Steps (Sprint 4 Roadmap)

* **Group (Clan) chat** synchronization with BrainBattle Core
* **File upload** presigned URL workflow (S3 or GCS)
* **Central moderation dashboard** (merge DM + community reports)
* **Notification microservice** integration for offline alerts

---

> © 2025 BrainBattle Platform — Messaging microservice (v3.0)
> Maintained by the Core Infrastructure Team.
