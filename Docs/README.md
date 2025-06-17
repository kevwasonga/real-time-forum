# A Real-time Forum: Make your Social Network come alive

## Introduction

_A modern real-time forum application built with Go and WebSocket technology. This project aims to create a dynamic and engaging social networking platform where users can interact in real time. With features like user authentication, real-time messaging, post creation, and a sleek dark-themed UI, the application offers a seamless and immersive user experience._

_The project leverages WebSocket technology to enable real-time updates, ensuring that users stay connected and engaged. Whether you're sharing stories, sending friend requests, or participating in discussions, this forum brings your social network to life._

## 📚 Table of Contents

- [A Real-time Forum: Make your Social Network come alive](#a-real-time-forum-make-your-social-network-come-alive)
  - [Introduction](#introduction)
  - [📚 Table of Contents](#-table-of-contents)
  - [Features](#features)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Project Structure](#project-structure)
  - [API Endpoints](#api-endpoints)
  - [WebSocket Events](#websocket-events)
  - [Usage](#usage)
    - [Creating a Post](#creating-a-post)
    - [Real-Time Messaging](#real-time-messaging)
    - [Friend Requests](#friend-requests)
    - [Notifications](#notifications)
  - [🛠️ Technology Stack](#️-technology-stack)
  - [Contributing](#contributing)
  - [License](#license)
  - [Testing](#testing)
  - [Contributions 🤝](#contributions-)
    - [How to Contribute](#how-to-contribute)

## Features

- **User Registration and Authentication:** Secure user accounts with robust authentication mechanisms.
- **Post Creation and Interaction:** Create posts, comment, and engage with other users in real time.
- **Story Sharing:** Share your stories and experiences with the community.
- **Friend Requests:** Connect with other users by sending and accepting friend requests.
- **Real-Time Messaging:** Chat with friends and receive instant updates using WebSocket technology.
- **Modern Dark-Themed UI:** Enjoy a visually appealing and user-friendly interface.
- **WebSocket-Based Real-Time Updates:** Stay connected with live notifications for posts, chats, and user statuses.

## Prerequisites

- Go 1.21 or higher
- SQLite3

## Installation

1. Clone the repository:

```sh
git clone https://learn.zone01kisumu.ke/git/weakinyi/real-time-forum.git forum
cd forum
```

1. Start the server:

```bash
go run .
```

2. Open your browser and navigate to:

```
http://localhost:8080
```

## Project Structure

```sh
.
├── backend/
│       ├── auth.go
│       ├── db.go
│       ├── getposts.go
│       ├── home.go
│       ├── models.go
│       ├── profile.go
│       └── websockete.go
├── Docs/
│       ├── CODE_OF_CONDUCT.md
│       ├── CONTRIBUTING.md
│       ├── INSTRUCTIONS.md
│       ├── LICENSE.md
│       └── README.md
│
├── frontend/
│   ├── static/
│   │   ├── css/
│   │   │    ├── create-post.css
│   │   │    └── main.css
│   │   ├── img/
│   │   │    ├── avatar.jpeg
│   │   │    ├── forum.png
│   │   │    └── maleavatar.jpeg
│   │   └── js/
│   │        ├── components/
│   │        │         ├── app.js
│   │        │         ├── messages.js
│   │        │         ├── posts.js
│   │        │         ├── templates.js
│   │        │         ├── userprofile.js
│   │        │         └── websocket.js
│   │        └── main.js
│   └── templates/
│            └── index.html
├── gitignore
├── forum.db
├── go.mod
├── go.sum
└── main.go
```

## API Endpoints

- `POST /api/register` - User registration
- `POST /api/login` - User login
- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create a new post
- `WS /ws` - WebSocket endpoint for real-time communication

## WebSocket Events

- `chat` - Real-time chat messages
- `post` - New post notifications
- `status` - User online/offline status updates

## Usage

### Creating a Post

- Navigate to the "Create Post" section.
- Enter a title, select categories, and write your content.
- Click "Post" to share it with the community.

### Real-Time Messaging

- Open the chat window to send messages to your friends.
- Messages are delivered instantly using WebSocket technology.

### Friend Requests

- View incoming friend requests in the "Friend Requests" section.
- Accept or decline requests to manage your connections.

### Notifications

- Receive real-time notifications for new posts, messages, and friend requests.

## 🛠️ Technology Stack

- **Backend:** Go (Golang)
- **Database:** SQLite3
- **Frontend:** HTML, CSS, JavaScript
- **Real-Time Communication:** WebSocket
- **Tools and Libraries:** Git, Go Modules

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Testing

To ensure the application works as expected, you can run the following tests:

1. **Unit Tests:**
   Run unit tests for the backend using the command:

```sh
go test ./...
```

## Contributions 🤝

We welcome contributions from the community! Whether it's fixing bugs, adding new features, improving documentation, or sharing ideas, your input is highly valued.

### How to Contribute

1. Fork the repository 🍴.
2. Create a new branch for your feature or fix (`git checkout -b feature-name`) 🌱.
3. Commit your changes (`git commit -m "Add a meaningful message"`) 💬.
4. Push your branch (`git push origin feature-name`) 🚀.
5. Open a pull request and describe your changes 📝.

Please ensure your contributions align with the project's goals and coding standards. For more details, refer to the [CONTRIBUTING](CONTRIBUTING.md)
