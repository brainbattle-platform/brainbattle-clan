# Clan / Community Feature Spec (Figma → Data Needs → API Contract → BE/FE Integration)

> Scope: Community UI + Clan creation + Clan/DM settings + Thread list + Messages + Presence  
> Workspace: brainbattle-clan (brainbattle-core + brainbattle-messaging)  
> Frontend: brainbattle-frontend (Flutter)  
> Auth status: NO auth yet → userId is temporary (`x-user-id` header or fallback `"me"`)

---

## 1) Figma Screens Covered

### 1. Community View
- Thread list (DM + Clan)
- Search bar
- Filter: All / Unread / Groups
- Active users row (presence)

### 2. Create Clan
- Clan avatar
- Clan name
- Description (optional)
- Search members
- Multi-select members
- CTA: Create Clan

### 3. Clan Message View
- Message list with time/status
- Input toolbar (+ attachments)
- Inline attachment message support

### 4. Attachment Message View
- Attach Image/File/Link/Camera actions
- Send attachments inline with message

### 5. Direct Message Setting View
- User info + active now
- Actions: Block/Report, Delete chat

### 6. Clan Setting View
- Clan info (name + member count)
- Members list with roles (Owner/Mod/Member)
- Actions: Block/Report, Leave clan
- Future: Media/files/links

---

## 2) Data Needs (Frontend State Requirements)

### 2.1 Community Thread List
**ThreadLite**
- `id: string`
- `title: string`
- `isClan: boolean`
- `memberCount: number`
- `avatarUrl?: string`
- `lastMessagePreview: string`
- `lastMessageAt: string (ISO8601)`
- `unreadCount: number`
- `participants?: UserLite[]` (optional preview)

UI needs:
- show title + avatar
- show lastMessagePreview
- show unread badge
- show relative time

**Filters & Queries**
- `type=all | dm | clan`
- `filter=unread`
- `q=search`
- pagination: `cursor`, `limit`

---

### 2.2 Thread Detail (Open Chat)
**Thread**
- all ThreadLite fields
- `participants: UserLite[]`
- `seenBySummary?: string` (optional)

---

### 2.3 Message List
**Message**
- `id: string`
- `sender: UserLite`
- `text?: string`
- `attachments?: Attachment[]`
- `createdAt: ISO8601`
- `status?: delivered|read` (optional UI)
- `readBy?: UserLite[]`

Message list needs:
- pagination `cursor`, `limit`
- stable ordering (createdAt asc)
- ability to show read status

---

### 2.4 Send Message (Text / Attachments)
**MessageCreateRequest**
- `text?: string`
- `attachments?: AttachmentInput[]`

**AttachmentInput**
- `type: image|file|link`
- `url: string`
- `thumbnailUrl?: string`
- `fileName?: string`
- `sizeBytes?: number`
- `mimeType?: string`

---

### 2.5 Clan Create Result
Create clan returns:
- `clan`
- `thread` (real conversation thread in messaging)

**Clan**
- `id, name, description?, avatarUrl?, createdAt`
- `createdBy: UserLite`
- `memberIds: string[]`
- `memberCount: number`

---

### 2.6 Presence (Active users row)
**Presence user list**
- `items: UserLite[]`
- each:
  - `id, name, avatarUrl?`
  - `isActiveNow: true`
  - `lastActiveAt: ISO8601`

---

## 3) API Contract (Community / Clan)

> Base rule: `/community/*` uses **userId only**  
> Header: `x-user-id: <string>` (fallback `"me"`)

### 3.1 GET /community/threads
**Query**
- `type?=all|dm|clan`
- `filter?=unread`
- `q?=string`
- `limit?=number` (default 20)
- `cursor?=string`

**Response**
```json
{
  "data": { "items": [ThreadLite] },
  "meta": { "nextCursor": "string|null" }
}
3.2 GET /community/threads/:threadId
Response

json
Sao chép mã
{
  "data": Thread,
  "meta": {}
}
3.3 GET /community/threads/:threadId/messages
Query

limit?=50 (max 100)

cursor?=string

Response

json
Sao chép mã
{
  "data": { "items": [Message] },
  "meta": { "nextCursor": "string|null" }
}
3.4 POST /community/threads/:threadId/messages
Body

json
Sao chép mã
{
  "text": "string?",
  "attachments": [AttachmentInput]?
}
Response

json
Sao chép mã
{
  "data": Message,
  "meta": {}
}
3.5 POST /community/threads/:threadId/read
Body

json
Sao chép mã
{}
Response

json
Sao chép mã
{
  "data": { "unreadCount": 0, "markedAt": "ISO8601" },
  "meta": {}
}
3.6 POST /community/clans
Body

json
Sao chép mã
{
  "name": "string",
  "description": "string?",
  "avatarUrl": "string?",
  "memberIds": ["string"]
}
Server behavior:

auto-add current userId into memberIds if missing

create clan in core DB

create a real conversation thread in messaging DB (type=clan, clanId unique)

add conversation members

Response

json
Sao chép mã
{
  "data": {
    "clan": Clan,
    "thread": Thread
  },
  "meta": {}
}
3.7 GET /community/presence/active
Query

limit?=20

cursor?=string

Response

json
Sao chép mã
{
  "data": { "items": [UserLite] },
  "meta": { "nextCursor": "string|null" }
}
4) Behavior Rules (Business Logic)
4.1 User identity (MVP)
userId = header x-user-id OR "me"

no JWT validation

userId used for:

unreadCount computation

read receipts

createdBy

senderId

4.2 Participants
participants derived from ConversationMember where leftAt = null

memberCount = count(participants)

4.3 Unread Count
use ReadReceipt.lastReadAt per conversation + userId

unreadCount = number of messages with createdAt > lastReadAt

4.4 Presence
Presence.touch(userId) on any /community request

activeNow = lastActiveAt >= now - 5 minutes

4.5 Clan-Thread Integration
core creates clan

core calls messaging internal endpoint to create conversation

messaging persists conversation + members

core returns thread as real conversation

5) Backend Implementation Plan
5.1 brainbattle-messaging (Messaging Service)
Main modules

ConversationsModule

MessagesModule ✅ (must exist + export MessagesService)

CommunityModule (community endpoints)

PresenceService (touch + listActive)

Internal controller: /internal/conversations

DB Tables

Conversation, ConversationMember

Message, Attachment

ReadReceipt

Presence

Key logic

getThreads():

list conversations for userId

include members (avoid N+1)

include latest message for preview

compute unreadCount via ReadReceipt

getThread():

include members + metadata

getMessages():

list by conversationId

sendMessage():

create message + attachments

markRead():

upsert ReadReceipt.lastReadAt = now

5.2 brainbattle-core (Clan/Core Service)
Core endpoints

/community/clans (adapter endpoint, no JWT)

DB Tables

Clan, ClanMember, ClanInvite, ClanJoinRequest

Clan create flow

validate request

ensure memberIds includes current userId

create Clan

create ClanMember rows for memberIds (leader/member roles)

call messaging internal:
POST /internal/conversations

return { clan, thread }

6) Frontend Implementation Plan (Flutter)
6.1 API Client Rules
For all community requests:

set header x-user-id: "me" (MVP hardcode)

later replace with user.current.id

6.2 Screens → API mapping
Community View

load thread list:

GET /community/threads?type=all

filter unread:

GET /community/threads?filter=unread

groups:

GET /community/threads?type=clan

presence row:

GET /community/presence/active

Create Clan

submit:

POST /community/clans

on success: navigate to thread chat

Chat Screen

load messages:

GET /community/threads/:id/messages

send text:

POST /community/threads/:id/messages {text}

send attachments:

POST /community/threads/:id/messages {attachments:[...]}

mark read:

POST /community/threads/:id/read {}

Clan Settings

use Thread participants + memberCount

roles can come from core in future

7) Integration Checklist (BE ↔ FE)
Must-pass items
 All /community responses wrap with {data, meta}

 x-user-id header accepted (fallback "me")

 Create clan returns real conversation threadId

 getThreads returns real participants (no mock)

 getActiveUsers returns real presence (no mock)

 sendMessage supports inline attachments

 markRead updates unreadCount correctly

Local dev setup
Run DB via docker-compose

Run prisma migrate dev for both core and messaging when schema changes

Ensure env:

core has MESSAGING_BASE_URL=http://localhost:<port>

8) Notes / Future (Post MVP)
Replace user profile fetch with account/auth service

Add role-based clan settings UI backed by core ClanMember.role

Media/files/links indexing

Websocket realtime messaging + presence

Replace hardcoded userId with auth-provided user.current.id