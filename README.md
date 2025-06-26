# Forum - Real-time Discussion Platform

A modern, feature-complete real-time forum application that combines the best architectural approaches from multiple implementations. Built with Go backend and vanilla JavaScript frontend, featuring seamless real-time communication, modern dark UI, and comprehensive social features.

## ✨ Unique Hybrid Architecture

This implementation merges the best features from two different approaches:

### **From Sample Branch:**
- 🔐 **OAuth Integration** (Google & GitHub)
- 📝 **Comprehensive User Profiles** with detailed fields
- 🖼️ **Image Upload Support** for posts
- 🎯 **Simple, Clean Routing** with SPA functionality
- 📱 **Straightforward WebSocket** implementation

### **From Forum Branch:**
- 🏗️ **Modular Backend Architecture** with organized packages
- 🌐 **Advanced WebSocket Hub System** with connection management
- 🎨 **Modern Dark-Themed UI** with responsive design
- ⚡ **Enhanced Real-time Features** (typing indicators, user presence)
- 🔄 **Comprehensive API Structure** with RESTful endpoints
- 👥 **Friend System** and enhanced messaging

### **Unique Enhancements:**
- 🚀 **Hybrid WebSocket System** combining hub-based and direct messaging
- 🎭 **Adaptive Authentication** supporting both OAuth and traditional login
- 📊 **Real-time Analytics** with online user tracking
- 🔔 **Advanced Notification System** with multiple types
- 🎪 **Component-Based Frontend** with modular JavaScript architecture

## 🚀 Features

### 🔐 Complete Authentication System
- **Traditional Registration** - Full registration with nickname, age, gender, first name, last name, email, and password
- **OAuth Integration** - Login with Google and GitHub accounts
- **Secure Sessions** - Cookie-based sessions with automatic logout
- **Profile Management** - View and edit user profiles with avatar support

### 💬 Real-time Private Messaging System
- **User List with Online Status** - View all users with real-time online/offline indicators
- **Message Preview** - See latest message preview and timestamp for each user
- **Instant Messaging** - Real-time message delivery using WebSockets
- **Message History** - Paginated chat history with lazy loading (10 messages per page)
- **Scroll-based Loading** - Load older messages by scrolling to top
- **Message Formatting** - Proper timestamp display (HH:MM format) and sender identification
- **Conversation Management** - Switch between conversations and users seamlessly
- **Live Notifications** - Real-time notifications for new messages
- **Typing Indicators** - Know when someone is typing
- **WebSocket Hub** - Advanced connection management with heartbeat monitoring

### 📝 Discussion Features
- **Post Creation** - Create posts with titles, content, categories, and images
- **Threaded Comments** - Reply to posts and comments with nested threading
- **Like/Dislike System** - Express opinions on posts and comments
- **Category Filtering** - Organize and filter content by categories
- **Real-time Updates** - See new posts and comments instantly

### 👥 Social Features
- **Friend System** - Send, accept, and manage friend requests
- **User Profiles** - Detailed user profiles with avatars and information
- **Online Status** - Real-time online/offline status tracking
- **User Discovery** - Find and connect with other users

### 🎨 Modern Interface
- **Dark Theme** - Beautiful dark-themed UI with modern design
- **Responsive Design** - Works perfectly on desktop and mobile
- **SPA Experience** - Single-page application with smooth navigation
- **Component Architecture** - Modular frontend with reusable components
- **Real-time UI Updates** - Interface updates automatically with new data

## 🏗️ Architecture

### Backend Structure
```
internal/
├── auth/           # Authentication and OAuth
├── database/       # Database connection and schema
├── handlers/       # HTTP request handlers
├── models/         # Data structures and types
└── websocket/      # Real-time WebSocket handling
```

### Frontend Structure
```
frontend/static/
├── css/           # Stylesheets
├── js/
│   ├── components/    # UI components
│   ├── pages/         # Page controllers
│   ├── api.js         # API client
│   ├── router.js      # SPA routing
│   ├── utils.js       # Utility functions
│   └── main.js        # Application initialization
└── index.html     # Single-page application
```

## 📬 Private Messaging Implementation

### Database Schema
The private messaging system uses a dedicated `messages` table with UUID primary keys:
```sql
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### API Endpoints
- **`GET /api/users`** - Get all users with online status and message preview
- **`GET /api/chat/history?with={user_id}&page={n}`** - Get paginated chat history (10 messages per page)
- **`POST /api/messages`** - Send a new message
- **`GET /api/messages`** - Get conversation list
- **`GET /api/messages/{user_id}`** - Get messages with specific user

### WebSocket Events
- **`private_message`** - Send/receive real-time messages
- **`user_status`** - Online/offline status updates
- **`typing_indicator`** - Typing status notifications

### Security Features
- **Input Sanitization** - All user input is sanitized to prevent XSS attacks
- **Content Validation** - Message length limits and suspicious pattern detection
- **Authentication Required** - All endpoints require valid session authentication
- **Message Spoofing Prevention** - Server-side user identity validation

## 📋 Prerequisites

- **Go 1.21 or higher**
- **Modern web browser** with JavaScript enabled
- **SQLite3** (included with Go)

## 🚀 Quick Start

### 1. Clone and Setup
```bash
git clone https://github.com/kevwasonga/real-time-forum.git
cd real-time-forum
```

### 2. Install Dependencies
```bash
go mod tidy
```

### 3. Configure OAuth (Optional)
Set environment variables for OAuth providers:
```bash
export GOOGLE_CLIENT_ID="your-google-client-id"
export GOOGLE_CLIENT_SECRET="your-google-client-secret"
export GITHUB_CLIENT_ID="your-github-client-id"
export GITHUB_CLIENT_SECRET="your-github-client-secret"
```

### 4. Start the Application
```bash
# Default port (8080)
go run .

# Or specify custom port
PORT=8081 go run .
```

### 5. Open in Browser
Navigate to `http://localhost:8080` (or your custom port)

## 🛠️ Technology Stack

- **Backend:** Go (Golang) with modular architecture
- **Database:** SQLite3 with comprehensive schema
- **Frontend:** Vanilla HTML, CSS, JavaScript (no frameworks)
- **Real-Time:** WebSocket with advanced hub system
- **Authentication:** Session-based + OAuth (Google, GitHub)
- **Styling:** Modern CSS with dark theme and responsive design

## 📖 Comprehensive Usage Guide

### 🚀 Getting Started

#### User Registration & Authentication
1. **Registration Options**:
   - **Traditional**: Fill out the registration form with nickname, email, password, first name, last name, age (13+), and gender
   - **OAuth**: Quick registration/login using Google or GitHub accounts

2. **Login Process**:
   - Use either nickname or email with password
   - OAuth users can login directly with their connected accounts
   - Sessions are automatically managed with secure cookies

### 💬 Private Messaging System - Complete Guide

#### Accessing the Messaging Interface
1. **Navigation**: Click "Messages" in the main navigation bar
2. **Interface Layout**:
   - **Left Sidebar**: Two tabs - "Conversations" and "Users"
   - **Main Area**: Chat window for active conversations
   - **Real-time Indicators**: Online status and typing indicators

#### Using the User List
1. **Viewing All Users**:
   - Click the "Users" tab in the sidebar
   - See all registered users with real-time online/offline status
   - Green dot = online, gray dot = offline
   - View latest message preview and timestamp

2. **User List Features**:
   - **Smart Sorting**: Most recently messaged users first, then alphabetical
   - **Search Functionality**: Find users by nickname, first name, or last name
   - **Real-time Updates**: Status and message previews update instantly
   - **Message Previews**: See the last message (up to 50 characters) with each user

#### Starting and Managing Conversations
1. **Initiating Chats**:
   - Click on any user in the user list to start messaging
   - Search for specific users using the search box
   - Switch between conversations using the "Conversations" tab

2. **Conversation Management**:
   - **Active Conversations**: Listed in the "Conversations" tab
   - **Message Previews**: See latest message and timestamp
   - **Unread Indicators**: Visual indicators for new messages
   - **Quick Switching**: Click between conversations seamlessly

#### Messaging Features
1. **Sending Messages**:
   - Type in the message input box at the bottom
   - Press Enter or click "Send" button
   - **Character Limit**: 1000 characters per message
   - **Real-time Delivery**: Messages appear instantly via WebSocket

2. **Message Display**:
   - **Your Messages**: Right-aligned with blue styling
   - **Received Messages**: Left-aligned with gray styling
   - **Timestamps**: Displayed in HH:MM format (local time)
   - **Sender Identification**: Clear display of sender names

3. **Message History & Pagination**:
   - **Initial Load**: Latest 10 messages when opening a conversation
   - **Lazy Loading**: Scroll to the top to load 10 older messages
   - **Smooth Experience**: Scroll position maintained when loading history
   - **Chronological Order**: Messages sorted by timestamp (oldest to newest)

#### Real-time Features
1. **Instant Communication**:
   - **WebSocket Delivery**: Messages appear immediately for both users
   - **Connection Management**: Automatic reconnection if connection drops
   - **Message Confirmation**: Visual feedback when messages are sent

2. **Presence Indicators**:
   - **Online Status**: Real-time online/offline indicators
   - **Typing Indicators**: See when someone is typing a message
   - **Last Seen**: Information for offline users

3. **Live Updates**:
   - **User List Updates**: Online status changes in real-time
   - **Message Previews**: Latest messages update automatically
   - **Conversation Sorting**: List reorders based on recent activity

### 🔒 Security & Privacy

#### Built-in Security Features
1. **Input Validation**:
   - All messages validated for length and content
   - XSS prevention with input sanitization
   - Suspicious pattern detection and blocking

2. **Authentication Security**:
   - All messaging endpoints require valid authentication
   - Server-side user identity validation
   - Message spoofing prevention

3. **Content Protection**:
   - HTML escaping to prevent code injection
   - Safe handling of user-generated content
   - Secure session management

### 🛠️ Troubleshooting

#### Common Issues & Solutions
1. **Messages Not Appearing**:
   - **Check Connection**: Ensure stable internet connection
   - **Refresh Page**: Reload to reconnect WebSocket
   - **Login Status**: Verify you're logged in with valid session

2. **Online Status Issues**:
   - **WebSocket Connection**: May need page refresh to reconnect
   - **Browser Console**: Check for connection errors
   - **Cache Issues**: Clear browser cache if problems persist

3. **Message History Problems**:
   - **Scroll Position**: Scroll to the very top of chat window
   - **Loading Delay**: Wait a moment for lazy loading to trigger
   - **No More Messages**: Check if there are actually older messages

#### Browser Requirements
- **Supported Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **Required Features**: JavaScript enabled, WebSocket support
- **Mobile Compatibility**: Responsive design works on mobile browsers
- **Performance**: Best experience with modern browsers

### 📱 Mobile Usage
- **Responsive Design**: Optimized for mobile devices
- **Touch-Friendly**: Large touch targets for mobile interaction
- **Adaptive Layout**: Interface adjusts to screen size
- **Mobile WebSocket**: Full real-time functionality on mobile

### 🎯 Tips for Best Experience
1. **Keep Browser Updated**: Use latest browser versions for best performance
2. **Stable Connection**: Ensure reliable internet for real-time features
3. **Enable Notifications**: Allow browser notifications for message alerts
4. **Regular Refresh**: Refresh page if experiencing connection issues

## 🔧 Technical Implementation Details

### API Endpoints Reference

#### Private Messaging Endpoints
```bash
# Get all users with online status and message preview
GET /api/users
Headers: Cookie: session_token=<token>
Response: {
  "success": true,
  "data": [
    {
      "id": "user_uuid",
      "nickname": "username",
      "firstName": "First",
      "lastName": "Last",
      "isOnline": true,
      "lastMessagePreview": "Hello there...",
      "lastMessageTime": "2024-01-01T12:00:00Z"
    }
  ]
}

# Get paginated chat history
GET /api/chat/history?with={user_id}&page={page_number}
Headers: Cookie: session_token=<token>
Response: {
  "success": true,
  "data": [
    {
      "id": "msg_uuid",
      "senderID": "sender_uuid",
      "receiverID": "receiver_uuid",
      "content": "Message content",
      "timestamp": "2024-01-01T12:00:00Z",
      "senderName": "Sender Name"
    }
  ]
}

# Send a new message
POST /api/messages
Headers: Cookie: session_token=<token>
Body: {
  "receiverId": "receiver_uuid",
  "content": "Message content"
}
Response: {
  "success": true,
  "data": {
    "id": "msg_uuid",
    "senderID": "sender_uuid",
    "receiverID": "receiver_uuid",
    "content": "Message content",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

#### WebSocket Events
```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:8080/api/ws');

// Send private message
ws.send(JSON.stringify({
  type: 'private_message',
  data: {
    receiverId: 'user_uuid',
    content: 'Message content'
  }
}));

// Receive message events
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  switch(message.type) {
    case 'private_message':
      // Handle incoming message
      break;
    case 'user_status':
      // Handle online/offline status change
      break;
    case 'typing_indicator':
      // Handle typing indicator
      break;
  }
};
```

### Database Schema Details
```sql
-- Users table (existing)
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    nickname TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages table (private messaging)
CREATE TABLE messages (
    id TEXT PRIMARY KEY,                    -- UUID format
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Online users tracking
CREATE TABLE online_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    session_id TEXT NOT NULL UNIQUE,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Performance indexes
CREATE INDEX idx_messages_sender_receiver ON messages(sender_id, receiver_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX idx_online_users_last_seen ON online_users(last_seen DESC);
```

### Security Implementation
```go
// Input validation and sanitization
func validateMessageContent(content string) error {
    if len(content) == 0 {
        return fmt.Errorf("message content cannot be empty")
    }
    if len(content) > MaxMessageLength {
        return fmt.Errorf("message content too long")
    }
    // XSS pattern detection
    suspiciousPatterns := []string{"<script", "javascript:", "onload="}
    // ... validation logic
}

// Content sanitization
func sanitizeInput(input string) string {
    input = html.EscapeString(input)
    dangerousChars := regexp.MustCompile(`[<>"'&]`)
    input = dangerousChars.ReplaceAllString(input, "")
    return strings.TrimSpace(input)
}
```

## 📚 Additional Resources

### Documentation Files
- **PRIVATE_MESSAGING.md**: Detailed technical documentation for the messaging system
- **API Documentation**: Complete endpoint reference with examples
- **Security Guide**: Comprehensive security implementation details

### Development Guidelines
- **Code Structure**: Modular Go backend with clean separation of concerns
- **Frontend Architecture**: Component-based vanilla JavaScript
- **Database Design**: Normalized schema with proper indexing
- **WebSocket Management**: Hub-based connection handling with cleanup

### Contributing
1. **Fork the Repository**: Create your own fork for development
2. **Feature Branches**: Create branches for new features
3. **Testing**: Ensure all features are thoroughly tested
4. **Documentation**: Update documentation for new features
5. **Pull Requests**: Submit PRs with detailed descriptions

### Support
- **Issues**: Report bugs and feature requests on GitHub
- **Documentation**: Refer to PRIVATE_MESSAGING.md for technical details
- **Community**: Join discussions and share feedback