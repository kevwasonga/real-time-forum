package backend

import (
	"encoding/json"
	"time"

	"github.com/gorilla/websocket"
)

// UserRegistrationRequest represents the data structure for new user registration
type UserRegistrationRequest struct {
	Username  string `json:"username"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Age       int    `json:"age"`
	Gender    string `json:"gender"`
	Email     string `json:"email"`
	Password  string `json:"password"`
}

// UserProfile represents a complete user profile with all personal information
type UserProfile struct {
	ID        string `json:"id"`
	Username  string `json:"username"`
	Nickname  string `json:"nickname"` // Legacy field for backward compatibility
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Age       int    `json:"age"`
	Gender    string `json:"gender"`
	Email     string `json:"email"`
	Password  string `json:"-"`
}

// UserSession represents an active user session with authentication details
type UserSession struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	CreatedAt time.Time `json:"createdAt"`
	ExpiresAt time.Time `json:"expiresAt"`
}

// ForumPost represents a discussion post with comprehensive metadata
type ForumPost struct {
	ID              int       `json:"id"`
	UserID          string    `json:"userId"`
	Title           string    `json:"title"`
	Content         string    `json:"content"`
	Likes           int       `json:"likes"`
	Category        string    `json:"category"`
	CommentCount    int       `json:"commentCount"`
	CreatedAt       time.Time `json:"createdAt"`
	AuthorUsername  string    `json:"authorUsername"`
	AuthorNickname  string    `json:"authorNickname"` // Legacy field for backward compatibility
	AuthorFirstName string    `json:"authorFirstName"`
	AuthorLastName  string    `json:"authorLastName"`
	AuthorGender    string    `json:"authorGender"`
}

// Legacy type aliases for backward compatibility
type Post = ForumPost
type User = UserProfile
type Session = UserSession

type Comment struct {
	ID              int       `json:"id"`
	PostID          int       `json:"postId"`
	UserID          string    `json:"userId"`
	Content         string    `json:"content"`
	Likes           int       `json:"likes"`
	CreatedAt       time.Time `json:"createdAt"`
	ReplyCount      int       `json:"replyCount"`
	AuthorNickname  string    `json:"authorNickname"`
	AuthorFirstName string    `json:"authorFirstName"`
	AuthorLastName  string    `json:"authorLastName"`
	AuthorGender    string    `json:"authorGender"`
}

type Reply struct {
	ID              int       `json:"id"`
	CommentID       int       `json:"commentId"`
	UserID          string    `json:"userId"`
	Content         string    `json:"content"`
	Likes           int       `json:"likes"`
	CreatedAt       time.Time `json:"createdAt"`
	AuthorNickname  string    `json:"authorNickname"`
	AuthorFirstName string    `json:"authorFirstName"`
	AuthorLastName  string    `json:"authorLastName"`
	AuthorGender    string    `json:"authorGender"`
}

type Client struct {
	ID     string
	Conn   *websocket.Conn
	SendCh chan []byte
}

type Friendship struct {
	RequesterID int       `json:"requester_id"`
	AddresseeID int       `json:"addressee_id"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}

type Message struct {
	ID            int       `json:"id"`
	SenderID      string    `json:"senderId"`
	ReceiverID    string    `json:"receiverId"`
	Content       string    `json:"content"`
	Timestamp     time.Time `json:"timestamp"`
	CurrentUserId string    `json:"currentUserId"`
	ReadStatus    int       `json:"readstatus"`
}

type WSMessage struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}
