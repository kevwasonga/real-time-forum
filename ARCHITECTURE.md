# Community Nexus - Architecture Documentation

## Overview

Community Nexus is a modern, real-time forum application built with Go and enhanced frontend technologies. This document provides a comprehensive overview of the system architecture, design decisions, and implementation details.

## System Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Browser)     │◄──►│   (Go Server)   │◄──►│   (SQLite)      │
│                 │    │                 │    │                 │
│ • HTML/CSS/JS   │    │ • HTTP Handlers │    │ • User Data     │
│ • Tailwind CSS  │    │ • WebSocket     │    │ • Posts/Comments│
│ • Modern UI     │    │ • Authentication│    │ • Sessions      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack

#### Backend
- **Language**: Go 1.24+
- **Database**: SQLite3 with enhanced schema
- **WebSocket**: Gorilla WebSocket for real-time features
- **Authentication**: bcrypt for password hashing
- **Session Management**: UUID-based sessions with expiration

#### Frontend
- **Framework**: Vanilla JavaScript with modern ES6+ features
- **Styling**: Tailwind CSS with custom component system
- **Icons**: Font Awesome 6
- **Typography**: Inter font family
- **Architecture**: Component-based modular design

## Backend Architecture

### Package Structure

```
backend/
├── auth.go          # Authentication and session management
├── db.go            # Database initialization and management
├── models.go        # Data structures and types
├── posts.go         # Discussion/post management
├── comments.go      # Comment system
├── replies.go       # Reply functionality
├── messages.go      # Private messaging
├── friendship.go    # Friend system
├── websocket.go     # Real-time WebSocket handling
├── home.go          # Home page handlers
└── user_posts.go    # User-specific post operations
```

### Core Components

#### 1. Database Layer (`db.go`)
- **Connection Management**: Centralized database connection handling
- **Schema Management**: Automated table creation with proper relationships
- **Triggers**: Database triggers for automatic count updates
- **Migration Support**: Schema versioning and updates

#### 2. Authentication System (`auth.go`)
- **Registration**: Comprehensive user registration with validation
- **Login**: Secure authentication with bcrypt password verification
- **Session Management**: UUID-based sessions with expiration
- **Security**: Protection against timing attacks and session hijacking

#### 3. Discussion Management (`posts.go`)
- **CRUD Operations**: Create, read, update, delete discussions
- **Category Filtering**: Organized content by categories
- **Engagement System**: Like/unlike functionality with toggle behavior
- **Real-time Updates**: WebSocket integration for live updates

#### 4. Real-time Features (`websocket.go`)
- **Connection Management**: Hub-based connection handling
- **Message Broadcasting**: Efficient message distribution
- **User Presence**: Online/offline status tracking
- **Heartbeat System**: Connection health monitoring

### Database Schema

#### Core Tables

**Users Table**
```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    nickname TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
);
```

**Posts Table**
```sql
CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    created_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Sessions Table**
```sql
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### Relationship Tables

**Posts Likes**
```sql
CREATE TABLE posts_likes (
    post_id INTEGER,
    user_id TEXT,
    PRIMARY KEY (post_id, user_id),
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Comments System**
```sql
CREATE TABLE comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    created_at DATETIME NOT NULL,
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Database Triggers

The system uses database triggers for automatic count maintenance:

1. **Post Like Triggers**: Automatically update like counts when users like/unlike posts
2. **Comment Count Triggers**: Update comment counts when comments are added/removed
3. **Reply Count Triggers**: Maintain reply counts for comments

## Frontend Architecture

### Component System

The frontend follows a modular component-based architecture:

```
frontend/static/js/
├── core/
│   └── nexus-core.js       # Core application framework
├── components/
│   ├── nexus-auth.js       # Authentication components
│   ├── nexus-navigation.js # Navigation and routing
│   ├── nexus-discussions.js# Discussion management
│   ├── nexus-messaging.js  # Private messaging
│   ├── nexus-profile.js    # User profile management
│   └── nexus-realtime.js   # WebSocket handling
└── nexus-app.js            # Main application controller
```

### Design System

#### CSS Architecture
- **Base Styles**: `nexus-theme.css` - Core design tokens and variables
- **Components**: `components.css` - Reusable UI components
- **Animations**: `animations.css` - Smooth transitions and effects

#### Design Tokens
```css
:root {
  --nexus-primary: #0ea5e9;
  --nexus-primary-dark: #0284c7;
  --nexus-gradient-primary: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
  --nexus-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --nexus-radius-md: 0.5rem;
}
```

### State Management

The application uses a centralized event system for state management:

```javascript
// Core event system
nexusCore.emit('user:authenticated', userData);
nexusCore.on('page:change', handlePageChange);
nexusCore.on('websocket:message', handleMessage);
```

## Security Considerations

### Authentication Security
- **Password Hashing**: bcrypt with appropriate cost factor
- **Session Management**: Secure UUID-based sessions
- **Cookie Security**: HttpOnly cookies to prevent XSS
- **Session Expiration**: Automatic cleanup of expired sessions

### Input Validation
- **Server-side Validation**: All inputs validated on the backend
- **SQL Injection Prevention**: Parameterized queries throughout
- **XSS Prevention**: Input sanitization and output encoding
- **CSRF Protection**: State-changing operations require authentication

### WebSocket Security
- **Authentication**: WebSocket connections require valid sessions
- **Message Validation**: All incoming messages are validated
- **Rate Limiting**: Connection and message rate limiting
- **Graceful Degradation**: Fallback for connection failures

## Performance Optimizations

### Database Optimizations
- **Indexing**: Strategic indexes on frequently queried columns
- **Triggers**: Automatic count maintenance reduces query complexity
- **Connection Pooling**: Efficient database connection management

### Frontend Optimizations
- **Lazy Loading**: Components load on demand
- **Efficient Animations**: Hardware-accelerated CSS transitions
- **Minimal Bundle**: Modular JavaScript architecture
- **Caching**: Strategic caching of static assets

### Real-time Optimizations
- **Connection Pooling**: Efficient WebSocket connection management
- **Message Queuing**: Reliable message delivery
- **Heartbeat System**: Connection health monitoring
- **Graceful Reconnection**: Automatic reconnection with exponential backoff

## Development Guidelines

### Code Style
- **Go**: Follow standard Go conventions and best practices
- **JavaScript**: ES6+ features with consistent naming conventions
- **CSS**: BEM-inspired naming with utility-first approach
- **Comments**: Comprehensive documentation for all functions

### Testing Strategy
- **Unit Tests**: Individual function testing
- **Integration Tests**: API endpoint testing
- **Frontend Tests**: Component and user interaction testing
- **Performance Tests**: Load testing for WebSocket connections

### Deployment
- **Environment Variables**: Configuration through environment variables
- **Database Migration**: Automated schema updates
- **Static Assets**: Optimized asset delivery
- **Monitoring**: Application health monitoring and logging

## Future Enhancements

### Planned Features
- **Advanced Search**: Full-text search across discussions
- **File Uploads**: Image and file sharing capabilities
- **Moderation Tools**: Content moderation and user management
- **Mobile App**: Native mobile application
- **API Documentation**: Comprehensive API documentation

### Scalability Considerations
- **Database Migration**: PostgreSQL for larger deployments
- **Caching Layer**: Redis for session and data caching
- **Load Balancing**: Horizontal scaling support
- **CDN Integration**: Global content delivery

---

**Developed by Kevin Wasonga and Rabin Otieno**  
*Community Nexus - Where conversations come alive!*
