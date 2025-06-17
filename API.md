# Community Nexus - API Documentation

## Overview

The Community Nexus API provides a comprehensive set of endpoints for managing user authentication, discussions, messaging, and real-time features. All endpoints follow RESTful conventions and return JSON responses.

## Base URL

```
http://localhost:8080/api
```

## Authentication

Most endpoints require authentication via session cookies. Users must log in to receive a session cookie that will be automatically included in subsequent requests.

### Session Cookie
- **Name**: `session_id`
- **Type**: HttpOnly cookie
- **Expiration**: 24 hours
- **Path**: `/`

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "data": {...},
  "status": "success"
}
```

### Error Response
```json
{
  "error": "Error message",
  "status": "error"
}
```

## Authentication Endpoints

### Register User
Create a new user account.

**Endpoint**: `POST /api/register`

**Request Body**:
```json
{
  "username": "johndoe",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "age": 25,
  "gender": "male",
  "password": "securepassword123"
}
```

**Response**: `201 Created`
```json
{
  "message": "User registered successfully"
}
```

**Validation Rules**:
- Username: 3-30 characters, alphanumeric and underscores only
- Email: Valid email format, unique
- Age: Minimum 13 years old
- Password: Minimum 8 characters
- All fields are required

### Login User
Authenticate user and create session.

**Endpoint**: `POST /api/login`

**Request Body**:
```json
{
  "identifier": "johndoe", // Username or email
  "password": "securepassword123"
}
```

**Response**: `200 OK`
```json
{
  "id": "uuid-string",
  "username": "johndoe",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "age": 25,
  "gender": "male"
}
```

### Logout User
Terminate user session.

**Endpoint**: `POST /api/logout`

**Authentication**: Required

**Response**: `200 OK`

### Check Session
Validate current session and get user info.

**Endpoint**: `GET /api/check-session`

**Authentication**: Required

**Response**: `200 OK`
```json
{
  "id": "uuid-string",
  "username": "johndoe",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "age": 25,
  "gender": "male"
}
```

## Discussion Endpoints

### Get Discussions
Retrieve forum discussions with optional category filtering.

**Endpoint**: `GET /api/discussions`

**Query Parameters**:
- `category` (optional): Filter by category (general, technology, lifestyle, entertainment)

**Authentication**: Required

**Response**: `200 OK`
```json
[
  {
    "id": 1,
    "title": "Welcome to Community Nexus",
    "content": "This is our first discussion...",
    "category": "general",
    "likes": 15,
    "commentCount": 8,
    "createdAt": "2024-01-15T10:30:00Z",
    "userId": "uuid-string",
    "authorNickname": "johndoe",
    "authorFirstName": "John",
    "authorLastName": "Doe",
    "authorGender": "male"
  }
]
```

### Create Discussion
Create a new forum discussion.

**Endpoint**: `POST /api/discussions`

**Authentication**: Required

**Request Body**:
```json
{
  "title": "My New Discussion",
  "content": "This is the content of my discussion...",
  "category": "technology"
}
```

**Response**: `201 Created`
```json
{
  "id": 1,
  "title": "My New Discussion",
  "content": "This is the content of my discussion...",
  "category": "technology",
  "likes": 0,
  "commentCount": 0,
  "createdAt": "2024-01-15T10:30:00Z",
  "userId": "uuid-string",
  "authorNickname": "johndoe",
  "authorFirstName": "John",
  "authorLastName": "Doe",
  "authorGender": "male"
}
```

### Toggle Discussion Like
Like or unlike a discussion.

**Endpoint**: `POST /api/discussions/{id}/engage`

**Authentication**: Required

**Response**: `200 OK`
```json
{
  "postId": 1,
  "likes": 16
}
```

## Comment Endpoints

### Get Comments
Retrieve comments for a specific discussion.

**Endpoint**: `GET /api/interactions/{discussionId}/comments`

**Authentication**: Required

**Response**: `200 OK`
```json
[
  {
    "id": 1,
    "postId": 1,
    "userId": "uuid-string",
    "content": "Great discussion!",
    "likes": 3,
    "replyCount": 2,
    "createdAt": "2024-01-15T11:00:00Z",
    "authorNickname": "janedoe",
    "authorFirstName": "Jane",
    "authorLastName": "Doe",
    "authorGender": "female"
  }
]
```

### Create Comment
Add a comment to a discussion.

**Endpoint**: `POST /api/interactions/{discussionId}/comments`

**Authentication**: Required

**Request Body**:
```json
{
  "content": "This is my comment on the discussion."
}
```

**Response**: `201 Created`
```json
{
  "id": 1,
  "postId": 1,
  "userId": "uuid-string",
  "content": "This is my comment on the discussion.",
  "likes": 0,
  "replyCount": 0,
  "createdAt": "2024-01-15T11:00:00Z",
  "authorNickname": "johndoe",
  "authorFirstName": "John",
  "authorLastName": "Doe",
  "authorGender": "male"
}
```

### Toggle Comment Like
Like or unlike a comment.

**Endpoint**: `POST /api/interactions/{commentId}/engage`

**Authentication**: Required

**Response**: `200 OK`
```json
{
  "commentId": 1,
  "likes": 4
}
```

## Messaging Endpoints

### Get Conversations
Retrieve user's message conversations.

**Endpoint**: `GET /api/communications`

**Authentication**: Required

**Response**: `200 OK`
```json
[
  {
    "userId": "uuid-string",
    "firstName": "Jane",
    "lastName": "Doe",
    "lastMessage": "Hey, how are you?",
    "lastMessageTime": "2024-01-15T14:30:00Z",
    "unreadCount": 2
  }
]
```

### Get Messages
Retrieve messages with a specific user.

**Endpoint**: `GET /api/communications/{userId}`

**Authentication**: Required

**Response**: `200 OK`
```json
[
  {
    "id": 1,
    "senderId": "uuid-string",
    "receiverId": "uuid-string",
    "content": "Hello there!",
    "createdAt": "2024-01-15T14:00:00Z"
  }
]
```

### Send Message
Send a private message to another user.

**Endpoint**: `POST /api/communications/dispatch/{userId}`

**Authentication**: Required

**Request Body**:
```json
{
  "content": "Hello! How are you doing?"
}
```

**Response**: `201 Created`
```json
{
  "id": 1,
  "senderId": "uuid-string",
  "receiverId": "uuid-string",
  "content": "Hello! How are you doing?",
  "createdAt": "2024-01-15T14:30:00Z"
}
```

## Community Endpoints

### Get Active Members
Retrieve list of currently online users.

**Endpoint**: `GET /api/community/active-members`

**Authentication**: Required

**Response**: `200 OK`
```json
[
  {
    "id": "uuid-string",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "isOnline": true
  }
]
```

### Get Member Profile
Retrieve public profile information for a user.

**Endpoint**: `GET /api/members/{userId}`

**Authentication**: Required

**Response**: `200 OK`
```json
{
  "id": "uuid-string",
  "username": "johndoe",
  "firstName": "John",
  "lastName": "Doe",
  "age": 25,
  "gender": "male",
  "joinedAt": "2024-01-01T00:00:00Z"
}
```

## Profile Management Endpoints

### Get User Profile
Retrieve current user's profile information.

**Endpoint**: `GET /api/profile/manage`

**Authentication**: Required

**Response**: `200 OK`
```json
{
  "id": "uuid-string",
  "username": "johndoe",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "age": 25,
  "gender": "male"
}
```

### Update User Profile
Update current user's profile information.

**Endpoint**: `PUT /api/profile/manage`

**Authentication**: Required

**Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "newemail@example.com",
  "age": 26
}
```

**Response**: `200 OK`
```json
{
  "id": "uuid-string",
  "username": "johndoe",
  "firstName": "John",
  "lastName": "Doe",
  "email": "newemail@example.com",
  "age": 26,
  "gender": "male"
}
```

### Delete User Account
Permanently delete user account and all associated data.

**Endpoint**: `DELETE /api/profile/manage`

**Authentication**: Required

**Response**: `200 OK`
```json
{
  "message": "Account deleted successfully"
}
```

## WebSocket API

### Connection
Connect to real-time features via WebSocket.

**Endpoint**: `ws://localhost:8080/api/ws`

**Authentication**: Session cookie required

### Message Types

#### Private Message
```json
{
  "type": "private_message",
  "data": {
    "recipientId": "uuid-string",
    "content": "Hello!"
  }
}
```

#### Discussion Update
```json
{
  "type": "discussion_update",
  "data": {
    "discussionId": 1,
    "updateType": "new_comment",
    "data": {...}
  }
}
```

#### Typing Indicator
```json
{
  "type": "typing_indicator",
  "data": {
    "recipientId": "uuid-string",
    "isTyping": true
  }
}
```

#### User Status
```json
{
  "type": "user_status",
  "data": {
    "userId": "uuid-string",
    "status": "online"
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Access denied |
| 404 | Not Found - Resource not found |
| 405 | Method Not Allowed - HTTP method not supported |
| 409 | Conflict - Resource already exists |
| 500 | Internal Server Error - Server error |

## Rate Limiting

- **Authentication endpoints**: 5 requests per minute per IP
- **API endpoints**: 100 requests per minute per user
- **WebSocket messages**: 50 messages per minute per connection

---

**Developed by Kevin Wasonga and Rabin Otieno**  
*Community Nexus - Where conversations come alive!*
