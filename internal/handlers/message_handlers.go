package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"forum/internal/auth"
	"forum/internal/database"
	"forum/internal/models"
	"forum/internal/websocket"
)

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

	// Validate input
	if req.ReceiverID == "" || req.Content == "" {
		RenderError(w, "Receiver ID and content are required", http.StatusBadRequest)
		return
	}

	// Check if receiver exists
	receiver, err := auth.GetUserByID(req.ReceiverID)
	if err != nil || receiver == nil {
		RenderError(w, "Receiver not found", http.StatusNotFound)
		return
	}

	// Insert message
	result, err := database.DB.Exec(`
		INSERT INTO messages (sender_id, receiver_id, content, created_at)
		VALUES (?, ?, ?, ?)
	`, user.ID, req.ReceiverID, req.Content, time.Now())

	if err != nil {
		RenderError(w, "Failed to create message", http.StatusInternalServerError)
		return
	}

	messageID, _ := result.LastInsertId()

	// Get the created message
	message, err := getMessageByID(int(messageID))
	if err != nil {
		RenderError(w, "Failed to retrieve created message", http.StatusInternalServerError)
		return
	}

	// Send message via WebSocket to receiver
	websocket.SendPrivateMessage(req.ReceiverID, message)

	RenderSuccess(w, "Message sent successfully", message)
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
	// Get last 10 messages by default, ordered by creation time
	rows, err := database.DB.Query(`
		SELECT m.id, m.sender_id, m.receiver_id, m.content, m.created_at, m.read_at,
		       sender.nickname as sender_nickname,
		       receiver.nickname as receiver_nickname
		FROM messages m
		JOIN users sender ON m.sender_id = sender.id
		JOIN users receiver ON m.receiver_id = receiver.id
		WHERE (m.sender_id = ? AND m.receiver_id = ?) 
		   OR (m.sender_id = ? AND m.receiver_id = ?)
		ORDER BY m.created_at DESC
		LIMIT 10
	`, userID1, userID2, userID2, userID1)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []models.Message
	for rows.Next() {
		var message models.Message
		err := rows.Scan(
			&message.ID,
			&message.SenderID,
			&message.ReceiverID,
			&message.Content,
			&message.CreatedAt,
			&message.ReadAt,
			&message.SenderName,
			&message.ReceiverName,
		)
		if err != nil {
			return nil, err
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
func getMessageByID(messageID int) (*models.Message, error) {
	var message models.Message
	err := database.DB.QueryRow(`
		SELECT m.id, m.sender_id, m.receiver_id, m.content, m.created_at, m.read_at,
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
		&message.CreatedAt,
		&message.ReadAt,
		&message.SenderName,
		&message.ReceiverName,
	)

	if err != nil {
		return nil, err
	}

	return &message, nil
}

// markMessagesAsRead marks messages as read
func markMessagesAsRead(receiverID, senderID string) error {
	_, err := database.DB.Exec(`
		UPDATE messages 
		SET read_at = ? 
		WHERE receiver_id = ? AND sender_id = ? AND read_at IS NULL
	`, time.Now(), receiverID, senderID)

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

	// Get query parameters
	search := r.URL.Query().Get("search")
	sortBy := r.URL.Query().Get("sort")
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

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

	var query string
	var args []interface{}

	// Base query
	baseQuery := `
		SELECT id, nickname, first_name, last_name, avatar_url, created_at
		FROM users
		WHERE id != ?
	`

	// Add search condition
	if search != "" {
		baseQuery += ` AND (
			nickname LIKE ? OR
			first_name LIKE ? OR
			last_name LIKE ?
		)`
	}

	// Add ordering
	switch sortBy {
	case "newest":
		baseQuery += ` ORDER BY created_at DESC`
	case "oldest":
		baseQuery += ` ORDER BY created_at ASC`
	case "alphabetical":
		baseQuery += ` ORDER BY nickname ASC`
	case "active":
		// Order by users who have been active recently
		baseQuery += ` ORDER BY (
			SELECT MAX(last_seen) FROM online_users WHERE user_id = users.id
		) DESC NULLS LAST, created_at DESC`
	case "random":
		baseQuery += ` ORDER BY RANDOM()`
	case "recent":
		baseQuery += ` ORDER BY created_at DESC`
	default:
		baseQuery += ` ORDER BY nickname ASC`
	}

	// Add limit and offset
	baseQuery += ` LIMIT ? OFFSET ?`

	// Prepare arguments
	args = []interface{}{user.ID}

	if search != "" {
		searchPattern := "%" + search + "%"
		args = append(args, searchPattern, searchPattern, searchPattern)
	}

	args = append(args, limit, offset)

	query = baseQuery

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		RenderError(w, "Failed to fetch users", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		err := rows.Scan(&u.ID, &u.Nickname, &u.FirstName, &u.LastName, &u.AvatarURL, &u.CreatedAt)
		if err != nil {
			RenderError(w, "Failed to scan user", http.StatusInternalServerError)
			return
		}
		users = append(users, u)
	}

	if users == nil {
		users = []models.User{}
	}

	RenderSuccess(w, "Users retrieved successfully", users)
}
