package handlers

import (
	"encoding/json"
	"fmt"
	"html"
	"math/rand"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"forum/internal/auth"
	"forum/internal/database"
	"forum/internal/models"
	"forum/internal/websocket"
)

// Security and validation constants
const (
	MaxMessageLength = 1000
	MaxSearchLength  = 100
)

// sanitizeInput sanitizes user input to prevent XSS and other attacks
func sanitizeInput(input string) string {
	// Remove HTML tags and escape HTML entities
	input = html.EscapeString(input)

	// Remove potentially dangerous characters
	dangerousChars := regexp.MustCompile(`[<>\"'&]`)
	input = dangerousChars.ReplaceAllString(input, "")

	// Trim whitespace
	input = strings.TrimSpace(input)

	return input
}

// validateMessageContent validates message content
func validateMessageContent(content string) error {
	if len(content) == 0 {
		return fmt.Errorf("message content cannot be empty")
	}

	if len(content) > MaxMessageLength {
		return fmt.Errorf("message content too long (max %d characters)", MaxMessageLength)
	}

	// Check for suspicious patterns
	suspiciousPatterns := []string{
		"<script",
		"javascript:",
		"onload=",
		"onerror=",
		"onclick=",
	}

	lowerContent := strings.ToLower(content)
	for _, pattern := range suspiciousPatterns {
		if strings.Contains(lowerContent, pattern) {
			return fmt.Errorf("message content contains suspicious patterns")
		}
	}

	return nil
}

// MessagesHandler handles messages listing and creation
func MessagesHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		getConversationsHandler(w, r)
	case http.MethodPost:
		createMessageHandler(w, r)
	default:
		RenderError(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// MessageHandler handles individual message operations
func MessageHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RenderError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user := auth.GetUserFromSession(r)
	if user == nil {
		RenderError(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	// Extract user ID from URL path
	path := strings.TrimPrefix(r.URL.Path, "/api/messages/")
	otherUserID := path

	if otherUserID == "" {
		RenderError(w, "User ID is required", http.StatusBadRequest)
		return
	}

	// Get messages between current user and other user
	messages, err := getMessagesBetweenUsers(user.ID, otherUserID)
	if err != nil {
		RenderError(w, "Failed to fetch messages", http.StatusInternalServerError)
		return
	}

	// Mark messages as read
	err = markMessagesAsRead(user.ID, otherUserID)
	if err != nil {
		// Log error but don't fail the request
		// log.Printf("Failed to mark messages as read: %v", err)
	}

	RenderSuccess(w, "Messages retrieved successfully", messages)
}

// getConversationsHandler gets all conversations for the current user
func getConversationsHandler(w http.ResponseWriter, r *http.Request) {
	user := auth.GetUserFromSession(r)
	if user == nil {
		RenderError(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	conversations, err := getUserConversations(user.ID)
	if err != nil {
		RenderError(w, "Failed to fetch conversations", http.StatusInternalServerError)
		return
	}

	RenderSuccess(w, "Conversations retrieved successfully", conversations)
}

// createMessageHandler handles message creation
func createMessageHandler(w http.ResponseWriter, r *http.Request) {
	user := auth.GetUserFromSession(r)
	if user == nil {
		RenderError(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	var req models.MessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RenderError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate and sanitize input
	if req.ReceiverID == "" || req.Content == "" {
		RenderError(w, "Receiver ID and content are required", http.StatusBadRequest)
		return
	}

	// Validate message content
	if err := validateMessageContent(req.Content); err != nil {
		RenderError(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Sanitize content to prevent XSS
	req.Content = sanitizeInput(req.Content)

	// Validate receiver ID format (should be UUID-like)
	if len(req.ReceiverID) == 0 || len(req.ReceiverID) > 100 {
		RenderError(w, "Invalid receiver ID format", http.StatusBadRequest)
		return
	}

	// Prevent self-messaging
	if req.ReceiverID == user.ID {
		RenderError(w, "Cannot send message to yourself", http.StatusBadRequest)
		return
	}

	// Check if receiver exists
	receiver, err := auth.GetUserByID(req.ReceiverID)
	if err != nil || receiver == nil {
		RenderError(w, "Receiver not found", http.StatusNotFound)
		return
	}

	// Generate message ID
	messageID := generateMessageID()

	// Insert message into messages table (as per requirements)
	_, err = database.DB.Exec(`
		INSERT INTO messages (id, sender_id, receiver_id, content, timestamp)
		VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
	`, messageID, user.ID, req.ReceiverID, req.Content)

	if err != nil {
		RenderError(w, "Failed to create message", http.StatusInternalServerError)
		return
	}

	// Get the created message
	message, err := getMessageByID(messageID)
	if err != nil {
		RenderError(w, "Failed to retrieve created message", http.StatusInternalServerError)
		return
	}

	// Send message via WebSocket to receiver
	websocket.SendPrivateMessage(req.ReceiverID, message)

	RenderSuccess(w, "Message sent successfully", message)
}

// ChatHistoryHandler handles chat history requests with pagination
func ChatHistoryHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RenderError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Require authentication
	user := auth.GetUserFromSession(r)
	if user == nil {
		RenderError(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	// Get query parameters
	withUserID := r.URL.Query().Get("with")
	pageStr := r.URL.Query().Get("page")

	if withUserID == "" {
		RenderError(w, "Missing 'with' parameter", http.StatusBadRequest)
		return
	}

	// Parse page number (default to 0)
	page := 0
	if pageStr != "" {
		if parsedPage, err := strconv.Atoi(pageStr); err == nil && parsedPage >= 0 {
			page = parsedPage
		}
	}

	// Get paginated messages
	messages, err := getChatHistory(user.ID, withUserID, page)
	if err != nil {
		RenderError(w, "Failed to retrieve chat history", http.StatusInternalServerError)
		return
	}

	RenderSuccess(w, "Chat history retrieved successfully", messages)
}

// Helper functions for message handlers

// getUserConversations gets all conversations for a user
func getUserConversations(userID string) ([]models.Conversation, error) {
	// Get conversations ordered by last message timestamp, then alphabetically
	rows, err := database.DB.Query(`
		SELECT DISTINCT
			CASE 
				WHEN m.sender_id = ? THEN m.receiver_id 
				ELSE m.sender_id 
			END as user_id,
			u.nickname,
			u.first_name,
			u.last_name,
			u.avatar_url,
			COALESCE(last_msg.content, '') as last_message,
			COALESCE(last_msg.created_at, '1970-01-01 00:00:00') as last_message_time,
			COALESCE(unread.unread_count, 0) as unread_count
		FROM messages m
		JOIN users u ON (
			CASE 
				WHEN m.sender_id = ? THEN m.receiver_id = u.id
				ELSE m.sender_id = u.id
			END
		)
		LEFT JOIN (
			SELECT 
				CASE 
					WHEN sender_id = ? THEN receiver_id 
					ELSE sender_id 
				END as other_user_id,
				content,
				created_at,
				ROW_NUMBER() OVER (
					PARTITION BY CASE 
						WHEN sender_id = ? THEN receiver_id 
						ELSE sender_id 
					END 
					ORDER BY created_at DESC
				) as rn
			FROM messages
			WHERE sender_id = ? OR receiver_id = ?
		) last_msg ON last_msg.other_user_id = u.id AND last_msg.rn = 1
		LEFT JOIN (
			SELECT receiver_id, COUNT(*) as unread_count
			FROM messages
			WHERE sender_id != ? AND receiver_id = ? AND read_at IS NULL
			GROUP BY receiver_id
		) unread ON unread.receiver_id = ?
		WHERE m.sender_id = ? OR m.receiver_id = ?
		ORDER BY 
			CASE WHEN last_msg.created_at IS NULL THEN 1 ELSE 0 END,
			last_msg.created_at DESC,
			u.nickname ASC
	`, userID, userID, userID, userID, userID, userID, userID, userID, userID, userID, userID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var conversations []models.Conversation
	for rows.Next() {
		var conv models.Conversation
		err := rows.Scan(
			&conv.UserID,
			&conv.Nickname,
			&conv.FirstName,
			&conv.LastName,
			&conv.AvatarURL,
			&conv.LastMessage,
			&conv.LastMessageTime,
			&conv.UnreadCount,
		)
		if err != nil {
			return nil, err
		}
		conversations = append(conversations, conv)
	}

	return conversations, nil
}

// getMessagesBetweenUsers gets messages between two users
func getMessagesBetweenUsers(userID1, userID2 string) ([]models.Message, error) {
	// Get last 10 messages by default, ordered by creation time (most recent first, then reverse)
	rows, err := database.DB.Query(`
		SELECT m.id, m.sender_id, m.receiver_id, m.content, m.timestamp,
		       sender.nickname as sender_nickname,
		       receiver.nickname as receiver_nickname
		FROM messages m
		JOIN users sender ON m.sender_id = sender.id
		JOIN users receiver ON m.receiver_id = receiver.id
		WHERE (m.sender_id = ? AND m.receiver_id = ?)
		   OR (m.sender_id = ? AND m.receiver_id = ?)
		ORDER BY m.timestamp DESC
		LIMIT 10
	`, userID1, userID2, userID2, userID1)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []models.Message
	for rows.Next() {
		var message models.Message
		var timestampStr string

		err := rows.Scan(
			&message.ID,
			&message.SenderID,
			&message.ReceiverID,
			&message.Content,
			&timestampStr,
			&message.SenderName,
			&message.ReceiverName,
		)
		if err != nil {
			return nil, err
		}

		// Parse timestamp
		if timestampStr != "" {
			parsedTime, err := time.Parse("2006-01-02T15:04:05Z", timestampStr)
			if err != nil {
				parsedTime, err = time.Parse("2006-01-02 15:04:05", timestampStr)
				if err != nil {
					parsedTime = time.Now()
				}
			}
			message.Timestamp = parsedTime
			message.CreatedAt = parsedTime // For compatibility
		}

		messages = append(messages, message)
	}

	// Reverse the slice to get chronological order
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	return messages, nil
}

// getMessageByID gets a message by ID
func getMessageByID(messageID string) (*models.Message, error) {
	var message models.Message
	var timestampStr string

	err := database.DB.QueryRow(`
		SELECT m.id, m.sender_id, m.receiver_id, m.content, m.timestamp,
		       sender.nickname as sender_nickname,
		       receiver.nickname as receiver_nickname
		FROM messages m
		JOIN users sender ON m.sender_id = sender.id
		JOIN users receiver ON m.receiver_id = receiver.id
		WHERE m.id = ?
	`, messageID).Scan(
		&message.ID,
		&message.SenderID,
		&message.ReceiverID,
		&message.Content,
		&timestampStr,
		&message.SenderName,
		&message.ReceiverName,
	)

	if err != nil {
		return nil, err
	}

	// Parse timestamp
	if timestampStr != "" {
		parsedTime, err := time.Parse("2006-01-02T15:04:05Z", timestampStr)
		if err != nil {
			parsedTime, err = time.Parse("2006-01-02 15:04:05", timestampStr)
			if err != nil {
				parsedTime = time.Now()
			}
		}
		message.Timestamp = parsedTime
		message.CreatedAt = parsedTime // For compatibility
	}

	return &message, nil
}

// getChatHistory gets paginated chat history between two users
func getChatHistory(userID1, userID2 string, page int) ([]models.Message, error) {
	// Calculate offset for pagination (10 messages per page)
	offset := page * 10

	// Get messages ordered by timestamp in ascending order (as per requirements)
	rows, err := database.DB.Query(`
		SELECT m.id, m.sender_id, m.receiver_id, m.content, m.timestamp,
		       sender.nickname as sender_nickname,
		       receiver.nickname as receiver_nickname
		FROM messages m
		JOIN users sender ON m.sender_id = sender.id
		JOIN users receiver ON m.receiver_id = receiver.id
		WHERE (m.sender_id = ? AND m.receiver_id = ?)
		   OR (m.sender_id = ? AND m.receiver_id = ?)
		ORDER BY m.timestamp ASC
		LIMIT 10 OFFSET ?
	`, userID1, userID2, userID2, userID1, offset)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []models.Message
	for rows.Next() {
		var message models.Message
		var timestampStr string

		err := rows.Scan(
			&message.ID,
			&message.SenderID,
			&message.ReceiverID,
			&message.Content,
			&timestampStr,
			&message.SenderName,
			&message.ReceiverName,
		)
		if err != nil {
			return nil, err
		}

		// Parse timestamp
		if timestampStr != "" {
			parsedTime, err := time.Parse("2006-01-02T15:04:05Z", timestampStr)
			if err != nil {
				parsedTime, err = time.Parse("2006-01-02 15:04:05", timestampStr)
				if err != nil {
					parsedTime = time.Now()
				}
			}
			message.Timestamp = parsedTime
			message.CreatedAt = parsedTime // For compatibility
		}

		messages = append(messages, message)
	}

	return messages, nil
}

// markMessagesAsRead marks messages as read
func markMessagesAsRead(receiverID, senderID string) error {
	_, err := database.DB.Exec(`
		UPDATE private_messages
		SET read_at = CURRENT_TIMESTAMP
		WHERE receiver_id = ? AND sender_id = ? AND read_at IS NULL
	`, receiverID, senderID)

	return err
}

// UsersHandler handles user listing for messaging and friends
func UsersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RenderError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user := auth.GetUserFromSession(r)
	if user == nil {
		RenderError(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	// Get and validate query parameters
	search := r.URL.Query().Get("search")
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	// Sanitize search input
	if search != "" {
		if len(search) > MaxSearchLength {
			RenderError(w, "Search query too long", http.StatusBadRequest)
			return
		}
		search = sanitizeInput(search)
	}

	// Set defaults
	limit := 20
	offset := 0

	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	if offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	// Get users with online status and latest message preview
	users, err := getUsersWithStatus(user.ID, search, limit, offset)
	if err != nil {
		RenderError(w, "Failed to fetch users", http.StatusInternalServerError)
		return
	}

	RenderSuccess(w, "Users retrieved successfully", users)
}

// getUsersWithStatus gets users with online status and latest message preview
func getUsersWithStatus(currentUserID, search string, limit, offset int) ([]models.UserWithStatus, error) {
	// Complex query to get users with online status and latest message preview
	query := `
		SELECT DISTINCT
			u.id,
			u.nickname,
			u.first_name,
			u.last_name,
			u.avatar_url,
			u.created_at,
			CASE
				WHEN ou.user_id IS NOT NULL AND ou.last_seen > datetime('now', '-5 minutes')
				THEN 1
				ELSE 0
			END as is_online,
			COALESCE(latest_msg.content, '') as last_message_preview,
			latest_msg.timestamp as last_message_time
		FROM users u
		LEFT JOIN online_users ou ON u.id = ou.user_id
		LEFT JOIN (
			SELECT
				CASE
					WHEN sender_id = ? THEN receiver_id
					ELSE sender_id
				END as other_user_id,
				content,
				timestamp,
				ROW_NUMBER() OVER (
					PARTITION BY CASE
						WHEN sender_id = ? THEN receiver_id
						ELSE sender_id
					END
					ORDER BY timestamp DESC
				) as rn
			FROM messages
			WHERE sender_id = ? OR receiver_id = ?
		) latest_msg ON latest_msg.other_user_id = u.id AND latest_msg.rn = 1
		WHERE u.id != ?
	`

	args := []interface{}{currentUserID, currentUserID, currentUserID, currentUserID, currentUserID}

	// Add search condition
	if search != "" {
		query += ` AND (
			u.nickname LIKE ? OR
			u.first_name LIKE ? OR
			u.last_name LIKE ?
		)`
		searchPattern := "%" + search + "%"
		args = append(args, searchPattern, searchPattern, searchPattern)
	}

	// Sort by: 1. Most recently messaged, 2. Alphabetical (as per requirements)
	query += `
		ORDER BY
			CASE WHEN latest_msg.timestamp IS NOT NULL THEN 0 ELSE 1 END,
			latest_msg.timestamp DESC,
			u.nickname ASC
		LIMIT ? OFFSET ?
	`
	args = append(args, limit, offset)

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.UserWithStatus
	for rows.Next() {
		var user models.UserWithStatus
		var isOnlineInt int
		var lastMessageTimeStr *string

		err := rows.Scan(
			&user.ID,
			&user.Nickname,
			&user.FirstName,
			&user.LastName,
			&user.AvatarURL,
			&user.CreatedAt,
			&isOnlineInt,
			&user.LastMessagePreview,
			&lastMessageTimeStr,
		)
		if err != nil {
			return nil, err
		}

		user.IsOnline = isOnlineInt == 1

		// Parse last message time if present
		if lastMessageTimeStr != nil && *lastMessageTimeStr != "" {
			if parsedTime, err := time.Parse("2006-01-02T15:04:05Z", *lastMessageTimeStr); err == nil {
				user.LastMessageTime = &parsedTime
			} else if parsedTime, err := time.Parse("2006-01-02 15:04:05", *lastMessageTimeStr); err == nil {
				user.LastMessageTime = &parsedTime
			}
		}

		// Truncate message preview to 50 characters
		if len(user.LastMessagePreview) > 50 {
			user.LastMessagePreview = user.LastMessagePreview[:50] + "..."
		}

		users = append(users, user)
	}

	if users == nil {
		users = []models.UserWithStatus{}
	}

	return users, nil
}

// generateMessageID generates a unique message ID
func generateMessageID() string {
	return fmt.Sprintf("msg_%d_%d", time.Now().UnixNano(), rand.Intn(10000))
}
