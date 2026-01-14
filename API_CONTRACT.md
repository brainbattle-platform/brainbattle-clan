# Community API Contract

> **Base URL**: `/community`  
> **Auth**: MVP uses `x-user-id` header (no JWT validation)  
> **Response Format**: All responses wrapped in `{data, meta}`

---

## Headers

### Required for all endpoints
```
x-user-id: string
```

**Fallback**: If header is missing, use `"me"` as userId

---

## Data Models

### UserLite
```json
{
  "id": "string",
  "handle": "string",
  "displayName": "string",
  "avatarUrl": "string | null",
  "isActiveNow": "boolean (optional)",
  "lastActiveAt": "ISO8601 (optional)"
}
```

### ThreadLite
```json
{
  "id": "string",
  "title": "string",
  "isClan": "boolean",
  "clanId": "string | null",
  "memberCount": "number",
  "avatarUrl": "string | null",
  "lastMessagePreview": "string",
  "lastMessageAt": "ISO8601",
  "unreadCount": "number",
  "participants": ["UserLite[]"]
}
```

### Thread (extends ThreadLite)
```json
{
  "id": "string",
  "title": "string",
  "isClan": "boolean",
  "clanId": "string | null",
  "memberCount": "number",
  "avatarUrl": "string | null",
  "lastMessagePreview": "string",
  "lastMessageAt": "ISO8601",
  "unreadCount": "number",
  "participants": ["UserLite[]"],
  "seenBySummary": "string | null"
}
```

### Message
```json
{
  "id": "string",
  "conversationId": "string",
  "sender": "UserLite | null",
  "text": "string | null",
  "attachments": ["Attachment[]"],
  "createdAt": "ISO8601",
  "status": "delivered | read (optional)",
  "readBy": ["UserLite[] (optional)"]
}
```

### Attachment
```json
{
  "id": "string",
  "type": "image | file | link",
  "url": "string",
  "thumbnailUrl": "string | null",
  "fileName": "string | null",
  "sizeBytes": "number | null",
  "mimeType": "string | null",
  "width": "number | null",
  "height": "number | null"
}
```

### Clan
```json
{
  "id": "string",
  "name": "string",
  "slug": "string",
  "description": "string | null",
  "avatarUrl": "string | null",
  "visibility": "public | private",
  "createdBy": "UserLite",
  "memberIds": ["string[]"],
  "memberCount": "number",
  "createdAt": "ISO8601"
}
```

---

## Endpoints

### 1. GET /community/threads

**Description**: Get list of conversation threads (DMs + Clans) for current user

**Headers**
```
x-user-id: me
```

**Query Parameters**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| type | string | No | all | Filter by type: `all`, `dm`, `clan` |
| filter | string | No | - | Filter unread: `unread` |
| q | string | No | - | Search query (searches title and participants) |
| limit | number | No | 20 | Number of results (max 100) |
| cursor | string | No | - | Pagination cursor |

**Request Example**
```http
GET /community/threads?type=all&limit=20
x-user-id: me
```

**Response 200 OK**
```json
{
  "data": {
    "items": [
      {
        "id": "conv_abc123",
        "title": "Engineering Team",
        "isClan": true,
        "clanId": "clan_xyz789",
        "memberCount": 5,
        "avatarUrl": "https://example.com/avatars/clan1.png",
        "lastMessagePreview": "Hey team, meeting at 3pm today",
        "lastMessageAt": "2026-01-14T10:30:00Z",
        "unreadCount": 3,
        "participants": [
          {
            "id": "user_1",
            "handle": "alice",
            "displayName": "Alice Johnson",
            "avatarUrl": "https://example.com/avatars/alice.png"
          },
          {
            "id": "user_2",
            "handle": "bob",
            "displayName": "Bob Smith",
            "avatarUrl": null
          }
        ]
      },
      {
        "id": "conv_def456",
        "title": "John Doe",
        "isClan": false,
        "clanId": null,
        "memberCount": 2,
        "avatarUrl": "https://example.com/avatars/john.png",
        "lastMessagePreview": "Thanks for the help!",
        "lastMessageAt": "2026-01-14T09:15:00Z",
        "unreadCount": 0,
        "participants": [
          {
            "id": "user_3",
            "handle": "john",
            "displayName": "John Doe",
            "avatarUrl": "https://example.com/avatars/john.png"
          }
        ]
      }
    ]
  },
  "meta": {
    "nextCursor": "cursor_next_page_token"
  }
}
```

**Response 400 Bad Request**
```json
{
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "Invalid type parameter. Must be one of: all, dm, clan"
  }
}
```

---

### 2. GET /community/threads/:threadId

**Description**: Get detailed information about a specific thread

**Headers**
```
x-user-id: me
```

**Path Parameters**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| threadId | string | Yes | Conversation ID |

**Request Example**
```http
GET /community/threads/conv_abc123
x-user-id: me
```

**Response 200 OK**
```json
{
  "data": {
    "id": "conv_abc123",
    "title": "Engineering Team",
    "isClan": true,
    "clanId": "clan_xyz789",
    "memberCount": 5,
    "avatarUrl": "https://example.com/avatars/clan1.png",
    "lastMessagePreview": "Hey team, meeting at 3pm today",
    "lastMessageAt": "2026-01-14T10:30:00Z",
    "unreadCount": 3,
    "participants": [
      {
        "id": "user_1",
        "handle": "alice",
        "displayName": "Alice Johnson",
        "avatarUrl": "https://example.com/avatars/alice.png"
      },
      {
        "id": "user_2",
        "handle": "bob",
        "displayName": "Bob Smith",
        "avatarUrl": null
      },
      {
        "id": "user_3",
        "handle": "charlie",
        "displayName": "Charlie Davis",
        "avatarUrl": "https://example.com/avatars/charlie.png"
      }
    ],
    "seenBySummary": "Seen by Alice, Bob"
  },
  "meta": {}
}
```

**Response 403 Forbidden**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You are not a member of this conversation"
  }
}
```

**Response 404 Not Found**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Thread not found"
  }
}
```

---

### 3. GET /community/threads/:threadId/messages

**Description**: Get paginated list of messages in a thread

**Headers**
```
x-user-id: me
```

**Path Parameters**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| threadId | string | Yes | Conversation ID |

**Query Parameters**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| limit | number | No | 50 | Number of messages (max 100) |
| cursor | string | No | - | Pagination cursor (for older messages) |

**Request Example**
```http
GET /community/threads/conv_abc123/messages?limit=50
x-user-id: me
```

**Response 200 OK**
```json
{
  "data": {
    "items": [
      {
        "id": "msg_001",
        "conversationId": "conv_abc123",
        "sender": {
          "id": "user_1",
          "handle": "alice",
          "displayName": "Alice Johnson",
          "avatarUrl": "https://example.com/avatars/alice.png"
        },
        "text": "Hey team, meeting at 3pm today",
        "attachments": [],
        "createdAt": "2026-01-14T10:30:00Z",
        "status": "read",
        "readBy": [
          {
            "id": "user_2",
            "handle": "bob",
            "displayName": "Bob Smith",
            "avatarUrl": null
          }
        ]
      },
      {
        "id": "msg_002",
        "conversationId": "conv_abc123",
        "sender": {
          "id": "user_2",
          "handle": "bob",
          "displayName": "Bob Smith",
          "avatarUrl": null
        },
        "text": "Here's the design mockup",
        "attachments": [
          {
            "id": "att_001",
            "type": "image",
            "url": "https://example.com/uploads/design.png",
            "thumbnailUrl": "https://example.com/uploads/design_thumb.png",
            "fileName": "design-mockup.png",
            "sizeBytes": 524288,
            "mimeType": "image/png",
            "width": 1920,
            "height": 1080
          }
        ],
        "createdAt": "2026-01-14T10:32:00Z",
        "status": "delivered"
      },
      {
        "id": "msg_003",
        "conversationId": "conv_abc123",
        "sender": null,
        "text": "Alice Johnson joined the conversation",
        "attachments": [],
        "createdAt": "2026-01-14T09:00:00Z"
      }
    ]
  },
  "meta": {
    "nextCursor": "cursor_older_messages"
  }
}
```

**Response 403 Forbidden**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You are not a member of this conversation"
  }
}
```

---

### 4. POST /community/threads/:threadId/messages

**Description**: Send a new message (text and/or attachments) to a thread

**Headers**
```
x-user-id: me
Content-Type: application/json
```

**Path Parameters**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| threadId | string | Yes | Conversation ID |

**Request Body**
```json
{
  "text": "string (optional)",
  "attachments": [
    {
      "type": "image | file | link",
      "url": "string",
      "thumbnailUrl": "string (optional)",
      "fileName": "string (optional)",
      "sizeBytes": "number (optional)",
      "mimeType": "string (optional)"
    }
  ]
}
```

**Request Example - Text Only**
```http
POST /community/threads/conv_abc123/messages
x-user-id: me
Content-Type: application/json

{
  "text": "Great work everyone!"
}
```

**Request Example - With Attachments**
```http
POST /community/threads/conv_abc123/messages
x-user-id: me
Content-Type: application/json

{
  "text": "Here are the updated specs",
  "attachments": [
    {
      "type": "file",
      "url": "https://example.com/uploads/specs-v2.pdf",
      "fileName": "product-specs-v2.pdf",
      "sizeBytes": 1048576,
      "mimeType": "application/pdf"
    },
    {
      "type": "image",
      "url": "https://example.com/uploads/diagram.png",
      "thumbnailUrl": "https://example.com/uploads/diagram_thumb.png",
      "fileName": "architecture-diagram.png",
      "sizeBytes": 327680,
      "mimeType": "image/png",
      "width": 2000,
      "height": 1500
    }
  ]
}
```

**Response 201 Created**
```json
{
  "data": {
    "id": "msg_new_001",
    "conversationId": "conv_abc123",
    "sender": {
      "id": "me",
      "handle": "currentuser",
      "displayName": "Current User",
      "avatarUrl": "https://example.com/avatars/me.png"
    },
    "text": "Here are the updated specs",
    "attachments": [
      {
        "id": "att_new_001",
        "type": "file",
        "url": "https://example.com/uploads/specs-v2.pdf",
        "thumbnailUrl": null,
        "fileName": "product-specs-v2.pdf",
        "sizeBytes": 1048576,
        "mimeType": "application/pdf",
        "width": null,
        "height": null
      },
      {
        "id": "att_new_002",
        "type": "image",
        "url": "https://example.com/uploads/diagram.png",
        "thumbnailUrl": "https://example.com/uploads/diagram_thumb.png",
        "fileName": "architecture-diagram.png",
        "sizeBytes": 327680,
        "mimeType": "image/png",
        "width": 2000,
        "height": 1500
      }
    ],
    "createdAt": "2026-01-14T11:00:00Z",
    "status": "delivered"
  },
  "meta": {}
}
```

**Response 400 Bad Request**
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Message must contain either text or attachments"
  }
}
```

**Response 403 Forbidden**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You are not a member of this conversation"
  }
}
```

---

### 5. POST /community/threads/:threadId/read

**Description**: Mark thread as read (update read receipt for current user)

**Headers**
```
x-user-id: me
Content-Type: application/json
```

**Path Parameters**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| threadId | string | Yes | Conversation ID |

**Request Body**
```json
{}
```

**Request Example**
```http
POST /community/threads/conv_abc123/read
x-user-id: me
Content-Type: application/json

{}
```

**Response 200 OK**
```json
{
  "data": {
    "unreadCount": 0,
    "markedAt": "2026-01-14T11:05:00Z"
  },
  "meta": {}
}
```

**Response 403 Forbidden**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You are not a member of this conversation"
  }
}
```

---

### 6. POST /community/clans

**Description**: Create a new clan with initial members and associated conversation thread

**Headers**
```
x-user-id: me
Content-Type: application/json
```

**Request Body**
```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "avatarUrl": "string (optional)",
  "memberIds": ["string[] (required)"]
}
```

**Request Example**
```http
POST /community/clans
x-user-id: me
Content-Type: application/json

{
  "name": "Engineering Team",
  "description": "Main engineering discussion group",
  "avatarUrl": "https://example.com/avatars/eng-team.png",
  "memberIds": ["user_1", "user_2", "user_3"]
}
```

**Response 201 Created**
```json
{
  "data": {
    "clan": {
      "id": "clan_new_001",
      "name": "Engineering Team",
      "slug": "engineering-team",
      "description": "Main engineering discussion group",
      "avatarUrl": "https://example.com/avatars/eng-team.png",
      "visibility": "private",
      "createdBy": {
        "id": "me",
        "handle": "currentuser",
        "displayName": "Current User",
        "avatarUrl": "https://example.com/avatars/me.png"
      },
      "memberIds": ["me", "user_1", "user_2", "user_3"],
      "memberCount": 4,
      "createdAt": "2026-01-14T11:10:00Z"
    },
    "thread": {
      "id": "conv_new_clan_001",
      "title": "Engineering Team",
      "isClan": true,
      "clanId": "clan_new_001",
      "memberCount": 4,
      "avatarUrl": "https://example.com/avatars/eng-team.png",
      "lastMessagePreview": "Clan created",
      "lastMessageAt": "2026-01-14T11:10:00Z",
      "unreadCount": 0,
      "participants": [
        {
          "id": "me",
          "handle": "currentuser",
          "displayName": "Current User",
          "avatarUrl": "https://example.com/avatars/me.png"
        },
        {
          "id": "user_1",
          "handle": "alice",
          "displayName": "Alice Johnson",
          "avatarUrl": "https://example.com/avatars/alice.png"
        },
        {
          "id": "user_2",
          "handle": "bob",
          "displayName": "Bob Smith",
          "avatarUrl": null
        },
        {
          "id": "user_3",
          "handle": "charlie",
          "displayName": "Charlie Davis",
          "avatarUrl": "https://example.com/avatars/charlie.png"
        }
      ]
    }
  },
  "meta": {}
}
```

**Response 400 Bad Request**
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Clan name is required"
  }
}
```

**Response 409 Conflict**
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Clan with this name already exists"
  }
}
```

---

### 7. GET /community/presence/active

**Description**: Get list of currently active users (online in last 5 minutes)

**Headers**
```
x-user-id: me
```

**Query Parameters**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| limit | number | No | 20 | Number of results (max 100) |
| cursor | string | No | - | Pagination cursor |

**Request Example**
```http
GET /community/presence/active?limit=20
x-user-id: me
```

**Response 200 OK**
```json
{
  "data": {
    "items": [
      {
        "id": "user_1",
        "handle": "alice",
        "displayName": "Alice Johnson",
        "avatarUrl": "https://example.com/avatars/alice.png",
        "isActiveNow": true,
        "lastActiveAt": "2026-01-14T11:12:00Z"
      },
      {
        "id": "user_2",
        "handle": "bob",
        "displayName": "Bob Smith",
        "avatarUrl": null,
        "isActiveNow": true,
        "lastActiveAt": "2026-01-14T11:11:30Z"
      },
      {
        "id": "user_3",
        "handle": "charlie",
        "displayName": "Charlie Davis",
        "avatarUrl": "https://example.com/avatars/charlie.png",
        "isActiveNow": true,
        "lastActiveAt": "2026-01-14T11:10:15Z"
      }
    ]
  },
  "meta": {
    "nextCursor": null
  }
}
```

---

## Error Response Format

All error responses follow this structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {} // optional additional context
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| INVALID_PARAMETER | 400 | Invalid query parameter or path parameter |
| INVALID_REQUEST | 400 | Invalid request body |
| UNAUTHORIZED | 401 | Missing or invalid authentication |
| FORBIDDEN | 403 | User lacks permission for this resource |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource conflict (e.g., duplicate name) |
| INTERNAL_ERROR | 500 | Internal server error |

---

## Pagination

### Cursor-based Pagination

All list endpoints use cursor-based pagination:

1. **First Request**: Omit `cursor` parameter
2. **Subsequent Requests**: Use `nextCursor` from previous response
3. **Last Page**: `nextCursor` will be `null`

**Example Flow**:
```http
# Request 1
GET /community/threads?limit=20

# Response includes nextCursor
{
  "data": { "items": [...] },
  "meta": { "nextCursor": "abc123" }
}

# Request 2 - Get next page
GET /community/threads?limit=20&cursor=abc123

# Response - last page
{
  "data": { "items": [...] },
  "meta": { "nextCursor": null }
}
```

---

## Rate Limiting

**Not implemented in MVP**

Future rate limits:
- 100 requests per minute per user
- 1000 messages per day per user
- 10 clan creations per day per user

---

## Webhooks / Real-time

**Not implemented in MVP**

Future WebSocket events:
- `message.new` - New message in subscribed thread
- `thread.updated` - Thread metadata changed
- `presence.changed` - User presence changed
- `typing.started` - User started typing
- `typing.stopped` - User stopped typing
