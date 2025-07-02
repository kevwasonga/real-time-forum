package models

import "time"

// Conversation represents a conversation between two users
type Conversation struct {
	ID            string    `json:"id" db:"id"`
	Participant1ID string   `json:"participant1Id" db:"participant1_id"`
	Participant2ID string   `json:"participant2Id" db:"participant2_id"`
	CreatedAt     time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt     time.Time `json:"updatedAt" db:"updated_at"`
	
	// Additional fields for UI display
	OtherUser     *User     `json:"otherUser,omitempty"`
	LastMessage   *Message  `json:"lastMessage,omitempty"`
	UnreadCount   int       `json:"unreadCount"`
}

// Message represents a message in a conversation
type Message struct {
	ID             string    `json:"id" db:"id"`
	ConversationID string    `json:"conversationId" db:"conversation_id"`
	SenderID       string    `json:"senderId" db:"sender_id"`
	Content        string    `json:"content" db:"content"`
	MessageType    string    `json:"messageType" db:"message_type"`
	IsRead         bool      `json:"isRead" db:"is_read"`
	CreatedAt      time.Time `json:"createdAt" db:"created_at"`
	
	// Additional fields for UI display
	Sender         *User     `json:"sender,omitempty"`
}

// MessageRequest represents a request to send a message
type MessageRequest struct {
	RecipientID string `json:"recipientId" binding:"required"`
	Content     string `json:"content" binding:"required"`
	MessageType string `json:"messageType,omitempty"`
}

// ConversationResponse represents the response for conversation list
type ConversationResponse struct {
	Conversations []Conversation `json:"conversations"`
	TotalCount    int            `json:"totalCount"`
}

// MessagesResponse represents the response for messages in a conversation
type MessagesResponse struct {
	Messages   []Message `json:"messages"`
	TotalCount int       `json:"totalCount"`
	HasMore    bool      `json:"hasMore"`
}

// UserSearchResponse represents the response for user search
type UserSearchResponse struct {
	Users []User `json:"users"`
	Total int    `json:"total"`
}

// MessageNotification represents a real-time message notification
type MessageNotification struct {
	Type           string      `json:"type"`
	ConversationID string      `json:"conversationId"`
	Message        Message     `json:"message"`
	Timestamp      time.Time   `json:"timestamp"`
}

// TypingIndicator represents typing status
type TypingIndicator struct {
	ConversationID string `json:"conversationId"`
	UserID         string `json:"userId"`
	IsTyping       bool   `json:"isTyping"`
}
