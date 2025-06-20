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

### 💬 Real-time Communication
- **Private Messaging** - Instant messaging between users
- **Live Notifications** - Real-time notifications for messages, friend requests, and interactions
- **User Presence** - See who's online in real-time
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

## 📋 Prerequisites

- **Go 1.21 or higher**
- **Modern web browser** with JavaScript enabled
- **SQLite3** (included with Go)

## 🚀 Quick Start

### 1. Clone and Setup
```bash
git clone <repository-url>
cd forum
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