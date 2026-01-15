# Community API - Endpoint Behavior Specification

> Detailed behavioral requirements for each API endpoint

---

## 1. GET /community/threads

### Purpose
Retrieve a paginated list of conversation threads (DMs and Clans) for the authenticated user.

### Authentication & Authorization
- **Required**: `x-user-id` header
- **Authorization**: Only returns threads where user is an active member (`ConversationMember.leftAt IS NULL`)

### Query Processing

#### Type Filter (`type` parameter)
- **Default**: `all`
- **Values**: 
  - `all`: Return both DM and clan threads
  - `dm`: Return only direct message threads (`Conversation.type = 'dm'`)
  - `clan`: Return only clan threads (`Conversation.type = 'clan'`)
- **Validation**: Must be one of the allowed values, else return 400

#### Unread Filter (`filter` parameter)
- **Values**:
  - `unread`: Only return threads where `unreadCount > 0`
- **Implementation**: Filter after computing unreadCount

#### Search (`q` parameter)
- **Scope**: Search across:
  - Thread title (`Conversation.title`)
  - Participant display names
  - Participant handles
- **Match**: Case-insensitive partial match
- **Implementation**: Use `ILIKE '%query%'` or full-text search

#### Pagination
- **Limit**: Default 20, max 100
- **Ordering**: By `lastMessageAt DESC` (most recent first)
- **Cursor**: Opaque token encoding `lastMessageAt` + `id` for consistent pagination

### Data Enrichment

#### Participants
- **Source**: `ConversationMember` where `leftAt IS NULL`
- **Join**: User data from user service/table
- **Fields**: `id, handle, displayName, avatarUrl`
- **Optimization**: Batch fetch to avoid N+1 queries

#### Last Message Preview
- **Source**: Latest `Message` for each conversation
- **Ordering**: By `createdAt DESC`
- **Fields**: Extract `text` (or "Attachment" if no text)
- **Truncate**: Max 100 characters
- **System Messages**: Use system message text

#### Unread Count
- **Algorithm**:
  1. Get user's `ReadReceipt.lastReadAt` for conversation
  2. Count messages where `createdAt > lastReadAt`
  3. Exclude messages sent by current user
- **Default**: If no ReadReceipt exists, unreadCount = total message count

#### Member Count
- **Source**: Count of `ConversationMember` where `leftAt IS NULL`

### Database Queries
1. **Main Query**: Fetch conversations for user with filters
2. **Batch Load**: Participants for all conversations
3. **Batch Load**: Latest message for all conversations
4. **Batch Load**: Unread counts for all conversations

### Response Construction
- Map to `ThreadLite` format
- Include all participants (not just preview)
- Calculate `nextCursor` from last item

### Error Cases
- **400**: Invalid `type` parameter
- **400**: Invalid `limit` (< 1 or > 100)
- **500**: Database error

---

## 2. GET /community/threads/:threadId

### Purpose
Retrieve detailed information about a specific conversation thread.

### Authentication & Authorization
- **Required**: `x-user-id` header
- **Authorization**: 
  - User must be an active member (`ConversationMember` exists with `leftAt IS NULL`)
  - Return 403 if not a member
  - Return 404 if thread doesn't exist

### Data Enrichment

#### Participants
- **Same as list endpoint**
- Include ALL active members

#### Seen By Summary
- **Source**: `ReadReceipt` for all members
- **Algorithm**:
  1. Find latest message `createdAt`
  2. Find all members where `ReadReceipt.lastReadAt >= latestMessage.createdAt`
  3. Exclude current user
  4. Format: "Seen by Alice, Bob" (max 3 names)
  5. If > 3: "Seen by Alice, Bob and 5 others"
- **Null Case**: If no one has seen latest message, return `null`

#### Unread Count
- **Same calculation as list endpoint**

### Database Queries
1. **Fetch Conversation**: By ID
2. **Verify Membership**: Check current user is member
3. **Load Participants**: All active members
4. **Load Latest Message**: For preview and timestamp
5. **Load Read Receipts**: For seenBySummary
6. **Calculate Unread Count**

### Response Construction
- Map to `Thread` format (includes `seenBySummary`)
- Full participant list

### Error Cases
- **403**: User not a member of conversation
- **404**: Thread not found
- **500**: Database error

---

## 3. GET /community/threads/:threadId/messages

### Purpose
Retrieve paginated list of messages in a conversation thread, ordered chronologically.

### Authentication & Authorization
- **Required**: `x-user-id` header
- **Authorization**: 
  - User must be an active member
  - Return 403 if not a member

### Query Processing

#### Pagination
- **Limit**: Default 50, max 100
- **Ordering**: By `createdAt ASC` (oldest first for initial load)
- **Cursor**: Encodes `createdAt` + `id` of last message
- **Direction**: Loads older messages (backwards in time)

### Data Enrichment

#### Sender Information
- **Source**: User service/table
- **Fields**: `id, handle, displayName, avatarUrl`
- **Null Case**: System messages have `sender = null`
- **Optimization**: Batch fetch unique sender IDs

#### Attachments
- **Source**: `Attachment` table joined by `messageId`
- **Include**: All attachment metadata
- **Optimization**: Batch load for all messages in page

#### Read Status (Optional)
- **Source**: `MessageReceipt` table
- **Status**:
  - `delivered`: Message delivered to user's device
  - `read`: Message read by user
- **Read By List**: 
  - Only for messages sent by current user
  - List users who have read this message
  - Determined by: `ReadReceipt.lastReadAt >= message.createdAt`

### Message Types

#### Text Message
- **Required**: `text` field populated
- **Optional**: Can include attachments

#### Attachment Message
- **Required**: At least one attachment
- **Optional**: Can include text

#### System Message
- **Sender**: `null`
- **Text**: System-generated message
- **Examples**: 
  - "Alice joined the conversation"
  - "Bob left the conversation"
  - "Charlie changed the group name"

### Database Queries
1. **Verify Membership**: Check current user is member
2. **Fetch Messages**: With pagination, ordered by createdAt
3. **Batch Load Senders**: Unique user IDs
4. **Batch Load Attachments**: For all messages
5. **Batch Load Receipts** (optional): For status display

### Response Construction
- Map to `Message` format
- Include nested `sender` and `attachments`
- Calculate `nextCursor` from oldest message in page

### Error Cases
- **400**: Invalid limit
- **403**: User not a member
- **404**: Thread not found
- **500**: Database error

---

## 4. POST /community/threads/:threadId/messages

### Purpose
Create and send a new message to a conversation thread.

### Authentication & Authorization
- **Required**: `x-user-id` header
- **Authorization**: 
  - User must be an active member
  - Return 403 if not a member

### Request Validation

#### Message Content
- **Rule**: Must provide either `text` OR `attachments` (or both)
- **Text Validation**:
  - Max length: 10,000 characters
  - Can be empty string if attachments present
  - Trim whitespace
- **Attachments Validation**:
  - Max 10 attachments per message
  - Each attachment must have:
    - `type`: One of `image`, `file`, `link`
    - `url`: Valid URL format
  - Optional fields validated if provided

#### Attachment Validation
- **Image Type**:
  - Allowed MIME types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
  - Max size: 10 MB (10,485,760 bytes)
  - Should include `width` and `height`
  - Should include `thumbnailUrl`
- **File Type**:
  - Max size: 25 MB (26,214,400 bytes)
  - Should include `fileName` and `mimeType`
- **Link Type**:
  - Must be valid URL
  - Should include preview metadata

### Message Creation Flow

#### 1. Validation Phase
- Verify user is member
- Validate request body
- Check attachment constraints

#### 2. Database Transaction
```
BEGIN TRANSACTION

1. Create Message record
   - conversationId: from path
   - senderId: from x-user-id header
   - kind: 'text' (default)
   - text: from body (nullable)
   - createdAt: now()

2. Create Attachment records (if any)
   - messageId: from created message
   - For each attachment in array
   - Store all metadata

3. Update Conversation.updatedAt
   - Set to message.createdAt

4. Create MessageReceipt for sender
   - messageId: from created message
   - userId: sender
   - deliveredAt: now()
   - readAt: now()

COMMIT TRANSACTION
```

#### 3. Side Effects
- **Presence Update**: Touch sender's presence (`lastActiveAt = now()`)
- **Push Notifications** (future): Notify other members
- **WebSocket Broadcast** (future): Real-time message delivery

### Response Construction
- Return created message with ID
- Include sender information
- Include all attachments with generated IDs
- Status: `delivered` (MVP doesn't track per-user delivery)

### Error Cases
- **400**: Missing both text and attachments
- **400**: Text exceeds max length
- **400**: Too many attachments
- **400**: Invalid attachment format
- **400**: Attachment size exceeds limit
- **403**: User not a member
- **404**: Thread not found
- **500**: Database error or transaction failure

---

## 5. POST /community/threads/:threadId/read

### Purpose
Mark all messages in a thread as read for the current user by updating their read receipt.

### Authentication & Authorization
- **Required**: `x-user-id` header
- **Authorization**: 
  - User must be an active member
  - Return 403 if not a member

### Read Receipt Logic

#### Upsert Read Receipt
```sql
INSERT INTO ReadReceipt (conversationId, userId, lastReadAt)
VALUES ({threadId}, {userId}, NOW())
ON CONFLICT (conversationId, userId)
DO UPDATE SET lastReadAt = NOW()
```

#### Calculation of New Unread Count
After updating receipt:
1. Get updated `lastReadAt`
2. Count messages where `createdAt > lastReadAt`
3. Exclude messages sent by current user
4. Return count (should be 0 after marking read)

### Database Transaction
```
BEGIN TRANSACTION

1. Upsert ReadReceipt
   - conversationId: from path
   - userId: from header
   - lastReadAt: now()

2. Query new unread count

COMMIT TRANSACTION
```

### Side Effects
- **Presence Update**: Touch user's presence
- **WebSocket Broadcast** (future): Notify other members of read status

### Response
- Return `unreadCount`: Should be 0 after marking read
- Return `markedAt`: Timestamp of the read receipt

### Idempotency
- Safe to call multiple times
- Each call updates `lastReadAt` to current time
- Always returns `unreadCount: 0` if no new messages

### Error Cases
- **403**: User not a member
- **404**: Thread not found
- **500**: Database error

---

## 6. POST /community/clans

### Purpose
Create a new clan with initial members and automatically create an associated conversation thread.

### Authentication & Authorization
- **Required**: `x-user-id` header
- **Authorization**: Any authenticated user can create a clan (no special permission needed)

### Request Validation

#### Clan Name
- **Required**: Yes
- **Min length**: 3 characters
- **Max length**: 50 characters
- **Format**: Alphanumeric, spaces, hyphens, underscores
- **Unique**: Must not conflict with existing clan names (case-insensitive)

#### Slug Generation
- **Auto-generated** from name
- **Algorithm**:
  1. Convert to lowercase
  2. Replace spaces with hyphens
  3. Remove special characters
  4. Truncate to 50 characters
  5. Ensure uniqueness (append number if collision)

#### Description
- **Optional**: Yes
- **Max length**: 500 characters

#### Avatar URL
- **Optional**: Yes
- **Validation**: Must be valid URL if provided

#### Member IDs
- **Required**: Yes
- **Min**: 1 member (creator)
- **Max**: 50 members initially
- **Auto-include**: Creator user ID added if not in list
- **Validation**: Check that users exist (future: from user service)

### Clan Creation Flow

#### 1. Validation Phase
- Validate all input fields
- Check name uniqueness
- Validate member IDs

#### 2. Core Service: Create Clan
```
BEGIN TRANSACTION (Core DB)

1. Generate unique slug

2. Create Clan record
   - id: generated
   - name: from request
   - slug: generated
   - description: from request (nullable)
   - avatarUrl: from request (nullable)
   - visibility: 'private' (default)
   - createdBy: from x-user-id
   - createdAt: now()

3. Create ClanMember records
   For creator:
   - clanId: from created clan
   - userId: creator
   - role: 'leader'
   - status: 'active'
   - joinedAt: now()
   
   For other members:
   - clanId: from created clan
   - userId: each member ID
   - role: 'member'
   - status: 'active'
   - joinedAt: now()

COMMIT TRANSACTION
```

#### 3. Messaging Service: Create Conversation
Core service makes internal HTTP call to messaging service:

```http
POST /internal/conversations
x-internal-secret: {secret}
Content-Type: application/json

{
  "type": "clan",
  "clanId": "clan_new_001",
  "title": "Engineering Team",
  "avatarUrl": "https://example.com/avatars/eng-team.png",
  "memberIds": ["me", "user_1", "user_2", "user_3"]
}
```

**Messaging Service Response**:
```json
{
  "data": {
    "id": "conv_new_clan_001",
    "title": "Engineering Team",
    "clanId": "clan_new_001",
    "type": "clan"
  }
}
```

#### 4. Messaging Service: Internal Conversation Creation
```
BEGIN TRANSACTION (Messaging DB)

1. Create Conversation record
   - id: generated
   - type: 'clan'
   - clanId: from request (unique constraint)
   - title: from request
   - avatarUrl: from request (nullable)
   - createdAt: now()
   - updatedAt: now()

2. Create ConversationMember records
   For each member:
   - conversationId: from created conversation
   - userId: each member ID
   - role: 'member' (leader role from clan, not conversation)
   - joinedAt: now()
   - leftAt: null

3. Create system Message
   - conversationId: from created conversation
   - senderId: null
   - kind: 'system'
   - content: "{creatorName} created this clan"
   - createdAt: now()

4. Create ReadReceipt for all members
   - conversationId: from created conversation
   - userId: each member ID
   - lastReadAt: now() (start with clan creation message read)

COMMIT TRANSACTION
```

#### 5. Error Handling
- **If Core Transaction Fails**: Return error, no cleanup needed
- **If Messaging Call Fails**: 
  - Core transaction should rollback
  - OR: Mark clan as "conversation pending" and retry
  - **MVP**: Fail entire operation, rollback core transaction

### Response Construction
```json
{
  "data": {
    "clan": {
      // Clan data from core DB
      "id": "...",
      "name": "...",
      "slug": "...",
      // ... full clan object
      "createdBy": {UserLite},
      "memberIds": ["..."],
      "memberCount": 4
    },
    "thread": {
      // Thread data from messaging DB
      "id": "...",
      "title": "...",
      "isClan": true,
      "clanId": "...",
      // ... full thread object
      "participants": [{UserLite}, ...],
      "unreadCount": 0
    }
  },
  "meta": {}
}
```

### Side Effects
- **Presence Update**: Touch creator's presence
- **Notifications** (future): Notify invited members
- **Analytics** (future): Track clan creation event

### Error Cases
- **400**: Name too short or too long
- **400**: Name contains invalid characters
- **400**: Description too long
- **400**: Invalid member IDs format
- **400**: Too many initial members
- **409**: Clan name already exists (after slug generation)
- **409**: ClanId already has a conversation
- **500**: Database error in core or messaging service
- **503**: Messaging service unavailable

### Retry Logic
- **Idempotency**: Not idempotent by default
- **Future**: Accept client-provided `idempotencyKey` header
- **Retry**: Client should not auto-retry 500 errors

---

## 7. GET /community/presence/active

### Purpose
Retrieve a list of users who are currently active (online) in the last 5 minutes.

### Authentication & Authorization
- **Required**: `x-user-id` header
- **Authorization**: Any authenticated user can query presence

### Active User Criteria
- **Definition**: User is "active now" if:
  - `Presence.lastActiveAt >= (NOW() - INTERVAL '5 minutes')`
- **Ordering**: Most recently active first (`lastActiveAt DESC`)

### Query Processing

#### Pagination
- **Limit**: Default 20, max 100
- **Cursor**: Encodes `lastActiveAt` + `userId`
- **Ordering**: By `lastActiveAt DESC`

### Presence Touch Behavior
Every Community API request should touch presence:
```sql
INSERT INTO Presence (userId, lastActiveAt, updatedAt)
VALUES ({userId}, NOW(), NOW())
ON CONFLICT (userId)
DO UPDATE SET 
  lastActiveAt = NOW(),
  updatedAt = NOW()
```

This ensures:
- User's own presence is current
- Accurate "active now" list

### Data Enrichment

#### User Information
- **Source**: User service/table
- **Fields**: `id, handle, displayName, avatarUrl`
- **Optimization**: Batch fetch all user IDs

#### Active Status
- **isActiveNow**: Always `true` for results (by definition)
- **lastActiveAt**: Include exact timestamp

### Database Queries
1. **Query Active Users**:
   ```sql
   SELECT userId, lastActiveAt
   FROM Presence
   WHERE lastActiveAt >= NOW() - INTERVAL '5 minutes'
   ORDER BY lastActiveAt DESC
   LIMIT {limit}
   OFFSET {from_cursor}
   ```

2. **Batch Load Users**: Fetch user details for all user IDs

### Response Construction
- Map to `UserLite` with presence fields
- Set `isActiveNow: true` for all items
- Include `lastActiveAt` timestamp
- Calculate `nextCursor` from last item

### Presence Cleanup (Background Job)
- **Not required for MVP**
- **Future**: Periodic job to delete old presence records
  - Delete where `lastActiveAt < NOW() - INTERVAL '30 days'`

### Error Cases
- **400**: Invalid limit
- **500**: Database error

---

## Cross-Cutting Behaviors

### 1. Presence Touch Middleware
**All Community API Endpoints** should update presence:

```
BEFORE processing request:
  - Extract userId from header
  - Upsert Presence table
  - Continue with request handling
```

This ensures:
- Accurate active user lists
- No separate presence ping needed
- Automatic activity tracking

### 2. User Data Fetching
**Current MVP Approach**:
- User data stored in local tables (Core or Messaging service)
- Each service has minimal user info: `id, handle, displayName, avatarUrl`

**Future Integration**:
- Call auth/user service API
- Cache user data with TTL
- Batch requests to avoid N+1
- Handle user-not-found gracefully (show ID as fallback)

### 3. Transaction Boundaries

#### Single-Service Endpoints
- Use database transactions for consistency
- Rollback on any error

#### Cross-Service Endpoints (Create Clan)
- **Option A**: Distributed transaction (complex)
- **Option B**: Saga pattern (rollback clan if conversation fails)
- **MVP Choice**: Fail-fast (rollback clan if messaging fails)

### 4. Error Response Format
All endpoints use consistent error format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {} // optional
  }
}
```

### 5. Response Time Targets
- **List endpoints**: < 200ms p95
- **Detail endpoints**: < 100ms p95
- **Write endpoints**: < 300ms p95
- **Create clan**: < 500ms p95 (cross-service)

### 6. Caching Strategy (Future)
- **Thread lists**: Cache for 10 seconds
- **User data**: Cache for 5 minutes
- **Presence**: Cache for 30 seconds
- **Invalidation**: On write operations

### 7. Rate Limiting (Future)
Per user:
- 100 requests/minute across all endpoints
- 20 messages/minute per thread
- 10 clan creations/day

### 8. Monitoring & Logging
Each endpoint should log:
- Request: userId, endpoint, params
- Response: status code, duration
- Errors: Full error details
- Business metrics: message count, clan creations, active users

### 9. Testing Requirements
Each endpoint needs:
- **Unit tests**: Business logic
- **Integration tests**: Database queries
- **E2E tests**: Full request/response cycle
- **Load tests**: Performance under load

### 10. Documentation Updates
When behavior changes:
- Update API contract
- Update behavior spec
- Update client SDK
- Update Figma annotations (if UI impact)
