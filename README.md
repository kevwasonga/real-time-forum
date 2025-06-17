# Forum - Real-time Discussion Platform

A modern, feature-complete real-time forum application built with Go backend and vanilla JavaScript frontend. Experience seamless discussions with real-time messaging, notifications, and a beautiful responsive interface.

## ✨ Features

### 🔐 Complete Authentication System
- **User Registration** - Full registration with nickname, age, gender, first name, last name, email, and password
- **Secure Login** - Login with nickname/email and password
- **Session Management** - Secure cookie-based sessions with automatic logout
- **Profile Management** - View and edit user profiles

### 💬 Discussion System
- **Create Posts** - Start discussions with title, content, and categories
- **Comment System** - Add comments to posts with real-time updates
- **Reply Feature** - Reply to comments with nested conversations
- **Like/Unlike** - Interactive like system for posts and comments
- **Categories** - Organize discussions by topics (general, technology, lifestyle, etc.)

### 📨 Private Messaging
- **Real-time Chat** - Send and receive private messages instantly
- **Online Status** - See who's online and available to chat
- **Message History** - View conversation history with timestamps
- **User List** - Browse all forum members and start conversations

### 🔔 Notifications & Real-time Features
- **Live Notifications** - Get notified of likes, comments, and messages
- **WebSocket Integration** - Real-time updates without page refresh
- **User Status** - Live online/offline status indicators
- **Search Functionality** - Search discussions and content

### 🎨 Modern User Interface
- **Responsive Design** - Works perfectly on desktop, tablet, and mobile
- **Professional Styling** - Clean, modern interface with smooth animations
- **Dark/Light Theme** - Beautiful gradient themes
- **Accessibility** - Keyboard navigation and screen reader support

## 🛠️ Technology Stack

### Backend (Go)
- **Go 1.24+** - High-performance HTTP server
- **SQLite3** - Embedded database with optimized schema
- **Gorilla WebSocket** - Real-time communication
- **bcrypt** - Secure password hashing
- **UUID** - Unique identifier generation

### Frontend (Vanilla JavaScript)
- **Pure JavaScript (ES6+)** - No frameworks, component-based architecture
- **Modern CSS** - Custom styling with animations and transitions
- **WebSocket Client** - Real-time communication
- **Responsive Design** - Mobile-first approach

### Allowed Packages (Project Requirements)
- ✅ **Gorilla WebSocket** - For real-time features
- ✅ **sqlite3** - Database operations
- ✅ **bcrypt** - Password security
- ✅ **uuid** - Unique identifiers
- ✅ **No frontend frameworks** - Pure JavaScript implementation

## 📋 Prerequisites

- **Go 1.21 or higher**
- **Modern web browser** with JavaScript enabled
- **SQLite3** (included with Go)

## 🚀 Quick Start

### 1. Clone and Setup
```bash
git clone <repository-url>
cd real-time-forum-main
```

### 2. Install Dependencies
```bash
go mod tidy
```

### 3. Start the Application
```bash
# Default port (8084)
go run .

# Or specify custom port
PORT=8081 go run .
```

### 4. Access the Application
Open your browser and navigate to:
```
http://localhost:8084
```
(or your custom port if specified)

The application will automatically:
- Create the SQLite database (`community_forum.db`)
- Initialize all required tables
- Set up WebSocket connections
- Serve the frontend interface

## 📁 Project Structure

```
real-time-forum-main/
├── main.go                          # Application entry point & routing
├── go.mod                          # Go module dependencies
├── community_forum.db              # SQLite database (auto-created)
│
├── backend/                        # Backend Go modules
│   ├── auth.go                     # User authentication & sessions
│   ├── comments.go                 # Comment system & replies
│   ├── db.go                       # Database connection & schema
│   ├── friendship.go               # Friend system (future feature)
│   ├── messages.go                 # Private messaging system
│   ├── models.go                   # Data structures & types
│   ├── posts.go                    # Discussion posts & likes
│   ├── profile.go                  # User profile management
│   ├── replies.go                  # Comment replies system
│   ├── users.go                    # User management utilities
│   └── websocket.go                # Real-time WebSocket handling
│
├── frontend/                       # Frontend application
│   ├── templates/
│   │   └── index.html              # Single-page application template
│   │
│   └── static/                     # Static assets
│       ├── css/                    # Stylesheets
│       │   ├── nexus-theme.css     # Core theme & variables
│       │   ├── components.css      # UI component styles
│       │   └── animations.css      # Animations & transitions
│       │
│       ├── js/                     # JavaScript modules
│       │   ├── core/
│       │   │   └── nexus-core.js   # Core utilities & API client
│       │   │
│       │   ├── components/         # Feature components
│       │   │   ├── nexus-auth.js           # Authentication UI
│       │   │   ├── nexus-discussions.js    # Posts & comments
│       │   │   ├── nexus-messaging.js      # Private messaging
│       │   │   ├── nexus-navigation.js     # Navigation & search
│       │   │   ├── nexus-profile.js        # User profiles
│       │   │   └── nexus-realtime.js       # WebSocket client
│       │   │
│       │   └── nexus-app.js        # Main application controller
│       │
│       └── img/                    # Images & assets
│           ├── default-avatar.png  # Default user avatar
│           └── favicon.svg         # Site favicon
│
└── README.md                       # This documentation
```

## 🔗 API Endpoints

### Authentication
- `POST /api/register` - User registration with full profile data
- `POST /api/login` - User authentication (nickname/email + password)
- `POST /api/logout` - Session termination and cleanup
- `GET /api/check-session` - Validate current session

### Discussions & Posts
- `GET /api/discussions` - Get all discussions (with optional category filter)
- `POST /api/discussions` - Create new discussion post
- `GET /api/discussions/{id}` - Get specific discussion details
- `POST /api/discussions/{id}/engage` - Like/unlike discussion
- `GET /api/discussions/{id}/comments` - Get comments for discussion
- `POST /api/discussions/{id}/comments` - Add comment to discussion

### Comments & Replies
- `POST /api/comments/{id}/engage` - Like/unlike comment
- `POST /api/comments/{id}/replies` - Reply to comment

### Private Messaging
- `GET /api/communications/{userId}` - Get message history with user
- `POST /api/communications/dispatch/{userId}` - Send private message

### User Management
- `GET /api/community/active-members` - Get list of online users
- `GET /api/profile/manage` - Get current user profile
- `PUT /api/profile/manage` - Update user profile
- `DELETE /api/profile/manage` - Delete user account

### WebSocket Events
- **Connection**: `/ws` - Real-time communication endpoint
- **Events**: `private_message`, `user_status`, `discussion_update`, `notification`

## 📖 How to Use the Application

### 1. Registration & Login
1. **Visit the homepage** - Navigate to `http://localhost:8084`
2. **Register a new account**:
   - Click "Get Started" or "Register"
   - Fill in all required fields:
     - Nickname (unique username)
     - Age (must be a valid number)
     - Gender (Male/Female)
     - First Name and Last Name
     - Email (valid email address)
     - Password (minimum 6 characters)
   - Click "Create Account"
3. **Login to existing account**:
   - Click "Login"
   - Enter nickname/email and password
   - Click "Sign In"

### 2. Creating and Viewing Discussions
1. **Create a new discussion**:
   - Click the "+" button or "Start Discussion"
   - Enter a title (max 200 characters)
   - Select a category (general, technology, lifestyle, etc.)
   - Write your content (max 5000 characters)
   - Click "Post Discussion"
2. **Browse discussions**:
   - View all discussions on the main page
   - Filter by category using the category buttons
   - Click on any discussion to view details
   - Like discussions by clicking the heart icon

### 3. Comments and Replies
1. **Add comments**:
   - Open any discussion
   - Scroll to the comments section
   - Write your comment (max 1000 characters)
   - Click "Post Comment"
2. **Reply to comments**:
   - Click "Reply" on any comment
   - Write your reply (max 500 characters)
   - Click "Reply" to submit
3. **Like comments**:
   - Click the heart icon on any comment
   - Toggle between liked/unliked states

### 4. Private Messaging
1. **Start a conversation**:
   - Go to the "Messages" page
   - Click "Start New Conversation"
   - Select a user from the dropdown
   - Type your message and click "Send"
2. **Continue conversations**:
   - Click on any existing conversation
   - Type messages in the chat input
   - Press Enter or click Send
3. **View online status**:
   - Green dot = user is online
   - Gray dot = user is offline

### 5. Search and Navigation
1. **Search content**:
   - Press `Ctrl+K` or click the search icon
   - Type your search query
   - Click on results to navigate
2. **Use notifications**:
   - Click the bell icon to view notifications
   - See likes, comments, and messages
   - Mark all as read when done

### 6. Profile Management
1. **View your profile**:
   - Click your name in the navigation
   - View your information and activity
2. **Edit profile**:
   - Click "Edit Profile"
   - Update your information
   - Click "Save Changes"
3. **Export data**:
   - Click "Export Data" to download your profile data
4. **Change avatar**:
   - Click "Change Avatar" to upload a new profile picture

## 🔧 Technical Features

### Database Schema
- **Users** - Complete user profiles with authentication
- **Posts** - Discussion posts with categories and likes
- **Comments** - Threaded comment system with replies
- **Messages** - Private messaging between users
- **Sessions** - Secure session management
- **Likes** - Like tracking for posts and comments

### Real-time Features
- **WebSocket Connection** - Persistent connection for real-time updates
- **Live Messaging** - Instant private message delivery
- **User Status** - Real-time online/offline status
- **Notifications** - Live notification system
- **Discussion Updates** - Real-time post and comment updates

### Security Features
- **Password Hashing** - bcrypt encryption for passwords
- **Session Management** - Secure cookie-based sessions
- **Input Validation** - Server-side validation for all inputs
- **SQL Injection Protection** - Prepared statements for database queries
- **XSS Prevention** - Content sanitization and escaping

## 🚀 Performance & Optimization

### Backend Optimization
- **Efficient Queries** - Optimized SQL queries with proper indexing
- **Connection Pooling** - SQLite connection management
- **Error Handling** - Comprehensive error handling and logging
- **Resource Management** - Proper cleanup of resources

### Frontend Optimization
- **Component Architecture** - Modular JavaScript components
- **Event Delegation** - Efficient event handling
- **Lazy Loading** - Load components as needed
- **Caching** - Smart caching of API responses

## 👥 Development Team

**Developers:**
- **Kevin Wasonga** - Backend development, database design, WebSocket implementation
- **Rabin Otieno** - Frontend development, UI/UX design, component architecture

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**:
   ```bash
   # Use a different port
   PORT=8085 go run .
   ```

2. **Database permission errors**:
   ```bash
   # Ensure write permissions in the project directory
   chmod 755 .
   ```

3. **WebSocket connection fails**:
   - Check if port is accessible
   - Ensure no firewall blocking
   - Verify browser supports WebSockets

4. **Module not found errors**:
   ```bash
   # Reinitialize Go modules
   go mod tidy
   go clean -modcache
   go mod download
   ```

### Development Mode
```bash
# Run with verbose logging
go run . -v

# Run with custom database path
DB_PATH=./custom.db go run .
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with Go and vanilla JavaScript
- Follows modern web development best practices
- Implements real-time communication patterns
- Designed for scalability and maintainability

---

**Forum** - Real-time Discussion Platform 🚀