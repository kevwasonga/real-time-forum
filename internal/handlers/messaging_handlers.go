package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"forum/internal/auth"
	"forum/internal/database"
	"forum/internal/models"
)

// ConversationsHandler handles conversation listing
func ConversationsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RenderError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user := auth.GetUserFromSession(r)
	if user == nil {
		RenderError(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	conversations, err := getConversations(user.ID)
	if err != nil {
		log.Printf("Error getting conversations: %v", err)
		RenderError(w, "Failed to get conversations", http.StatusInternalServerError)
		return
	}

	response := models.ConversationResponse{
		Conversations: conversations,
		TotalCount:    len(conversations),
	}

	RenderSuccess(w, "Conversations retrieved successfully", response)
}

// MessagesHandler handles message operations
func MessagesHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		getMessagesHandler(w, r)
	case http.MethodPost:
		sendMessageHandler(w, r)
	default:
		RenderError(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// getMessagesHandler gets messages for a conversation
func getMessagesHandler(w http.ResponseWriter, r *http.Request) {
	user := auth.GetUserFromSession(r)
	if user == nil {
		RenderError(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	// Extract conversation ID from URL path
	path := strings.TrimPrefix(r.URL.Path, "/api/messages/")
	conversationID := strings.Split(path, "/")[0]

	if conversationID == "" {
		RenderError(w, "Conversation ID required", http.StatusBadRequest)
		return
	}

	// Parse pagination parameters
	page := 1
	limit := 50
	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	// Verify user is part of the conversation
	if !isUserInConversation(user.ID, conversationID) {
		RenderError(w, "Access denied", http.StatusForbidden)
		return
	}

	messages, totalCount, err := getMessages(conversationID, page, limit)
	if err != nil {
		log.Printf("Error getting messages: %v", err)
		RenderError(w, "Failed to get messages", http.StatusInternalServerError)
		return
	}

	// Mark messages as read
	go markMessagesAsRead(conversationID, user.ID)

	response := models.MessagesResponse{
		Messages:   messages,
		TotalCount: totalCount,
		HasMore:    (page * limit) < totalCount,
	}

	RenderSuccess(w, "Messages retrieved successfully", response)
}

// sendMessageHandler sends a new message
func sendMessageHandler(w http.ResponseWriter, r *http.Request) {
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

	if req.Content == "" {
		RenderError(w, "Message content is required", http.StatusBadRequest)
		return
	}

	if req.RecipientID == "" {
		RenderError(w, "Recipient ID is required", http.StatusBadRequest)
		return
	}

	if req.RecipientID == user.ID {
		RenderError(w, "Cannot send message to yourself", http.StatusBadRequest)
		return
	}

	// Verify recipient exists
	if !userExists(req.RecipientID) {
		RenderError(w, "Recipient not found", http.StatusNotFound)
		return
	}

	// Get or create conversation
	conversationID, err := getOrCreateConversation(user.ID, req.RecipientID)
	if err != nil {
		log.Printf("Error getting/creating conversation: %v", err)
		RenderError(w, "Failed to create conversation", http.StatusInternalServerError)
		return
	}

	// Create message
	messageType := req.MessageType
	if messageType == "" {
		messageType = "text"
	}

	message, err := createMessage(conversationID, user.ID, req.Content, messageType)
	if err != nil {
		log.Printf("Error creating message: %v", err)
		RenderError(w, "Failed to send message", http.StatusInternalServerError)
		return
	}

	// Send real-time notification
	go sendMessageNotification(req.RecipientID, conversationID, message)

	RenderSuccess(w, "Message sent successfully", message)
}

// UserSearchHandler handles user search for messaging
func UserSearchHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RenderError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user := auth.GetUserFromSession(r)
	if user == nil {
		RenderError(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	query := r.URL.Query().Get("q")
	if query == "" {
		RenderError(w, "Search query is required", http.StatusBadRequest)
		return
	}

	users, err := searchUsers(query, user.ID)
	if err != nil {
		log.Printf("Error searching users: %v", err)
		RenderError(w, "Failed to search users", http.StatusInternalServerError)
		return
	}

	response := models.UserSearchResponse{
		Users: users,
		Total: len(users),
	}

	RenderSuccess(w, "Users found", response)
}

// MarkAsReadHandler marks messages as read
func MarkAsReadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		RenderError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user := auth.GetUserFromSession(r)
	if user == nil {
		RenderError(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	// Extract conversation ID from URL
	path := strings.TrimPrefix(r.URL.Path, "/api/messages/")
	conversationID := strings.TrimSuffix(path, "/read")

	if conversationID == "" {
		RenderError(w, "Conversation ID required", http.StatusBadRequest)
		return
	}

	if !isUserInConversation(user.ID, conversationID) {
		RenderError(w, "Access denied", http.StatusForbidden)
		return
	}

	err := markMessagesAsRead(conversationID, user.ID)
	if err != nil {
		log.Printf("Error marking messages as read: %v", err)
		RenderError(w, "Failed to mark messages as read", http.StatusInternalServerError)
		return
	}

	RenderSuccess(w, "Messages marked as read", nil)
}

// Helper function to generate unique IDs
func generateID(prefix string) string {
	return fmt.Sprintf("%s_%d", prefix, time.Now().UnixNano())
}

// Database helper functions

// getConversations gets all conversations for a user
func getConversations(userID string) ([]models.Conversation, error) {
	query := `
		SELECT DISTINCT
			c.id,
			c.participant1_id,
			c.participant2_id,
			c.created_at,
			c.updated_at,
			CASE
				WHEN c.participant1_id = ? THEN u2.id
				ELSE u1.id
			END as other_user_id,
			CASE
				WHEN c.participant1_id = ? THEN u2.nickname
				ELSE u1.nickname
			END as other_user_nickname,
			CASE
				WHEN c.participant1_id = ? THEN u2.first_name
				ELSE u1.first_name
			END as other_user_first_name,
			CASE
				WHEN c.participant1_id = ? THEN u2.last_name
				ELSE u1.last_name
			END as other_user_last_name,
			CASE
				WHEN c.participant1_id = ? THEN u2.avatar_url
				ELSE u1.avatar_url
			END as other_user_avatar,
			m.content as last_message_content,
			m.created_at as last_message_time,
			(SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != ? AND is_read = FALSE) as unread_count
		FROM conversations c
		LEFT JOIN users u1 ON c.participant1_id = u1.id
		LEFT JOIN users u2 ON c.participant2_id = u2.id
		LEFT JOIN messages m ON m.id = (
			SELECT id FROM messages
			WHERE conversation_id = c.id
			ORDER BY created_at DESC
			LIMIT 1
		)
		WHERE c.participant1_id = ? OR c.participant2_id = ?
		ORDER BY COALESCE(m.created_at, c.created_at) DESC
	`

	rows, err := database.DB.Query(query, userID, userID, userID, userID, userID, userID, userID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var conversations []models.Conversation
	for rows.Next() {
		var conv models.Conversation
		var otherUser models.User
		var lastMessageContent, lastMessageTime interface{}

		err := rows.Scan(
			&conv.ID,
			&conv.Participant1ID,
			&conv.Participant2ID,
			&conv.CreatedAt,
			&conv.UpdatedAt,
			&otherUser.ID,
			&otherUser.Nickname,
			&otherUser.FirstName,
			&otherUser.LastName,
			&otherUser.AvatarURL,
			&lastMessageContent,
			&lastMessageTime,
			&conv.UnreadCount,
		)
		if err != nil {
			return nil, err
		}

		conv.OtherUser = &otherUser

		// Add last message if exists
		if lastMessageContent != nil {
			lastMsg := &models.Message{
				Content: lastMessageContent.(string),
			}
			if lastMessageTime != nil {
				if timeStr, ok := lastMessageTime.(string); ok {
					if parsedTime, err := time.Parse("2006-01-02 15:04:05", timeStr); err == nil {
						lastMsg.CreatedAt = parsedTime
					}
				}
			}
			conv.LastMessage = lastMsg
		}

		conversations = append(conversations, conv)
	}

	return conversations, nil
}

// getMessages gets messages for a conversation with pagination
func getMessages(conversationID string, page, limit int) ([]models.Message, int, error) {
	// Get total count
	var totalCount int
	err := database.DB.QueryRow("SELECT COUNT(*) FROM messages WHERE conversation_id = ?", conversationID).Scan(&totalCount)
	if err != nil {
		return nil, 0, err
	}

	// Get messages with pagination
	offset := (page - 1) * limit
	query := `
		SELECT
			m.id,
			m.conversation_id,
			m.sender_id,
			m.content,
			m.message_type,
			m.is_read,
			m.created_at,
			u.nickname,
			u.first_name,
			u.last_name,
			u.avatar_url
		FROM messages m
		LEFT JOIN users u ON m.sender_id = u.id
		WHERE m.conversation_id = ?
		ORDER BY m.created_at DESC
		LIMIT ? OFFSET ?
	`

	rows, err := database.DB.Query(query, conversationID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var messages []models.Message
	for rows.Next() {
		var msg models.Message
		var sender models.User

		err := rows.Scan(
			&msg.ID,
			&msg.ConversationID,
			&msg.SenderID,
			&msg.Content,
			&msg.MessageType,
			&msg.IsRead,
			&msg.CreatedAt,
			&sender.Nickname,
			&sender.FirstName,
			&sender.LastName,
			&sender.AvatarURL,
		)
		if err != nil {
			return nil, 0, err
		}

		sender.ID = msg.SenderID
		msg.Sender = &sender
		messages = append(messages, msg)
	}

	// Reverse to get chronological order
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	return messages, totalCount, nil
}

// getOrCreateConversation gets existing conversation or creates a new one
func getOrCreateConversation(userID1, userID2 string) (string, error) {
	// Check if conversation already exists
	var conversationID string
	query := `
		SELECT id FROM conversations
		WHERE (participant1_id = ? AND participant2_id = ?)
		   OR (participant1_id = ? AND participant2_id = ?)
	`
	err := database.DB.QueryRow(query, userID1, userID2, userID2, userID1).Scan(&conversationID)
	if err == nil {
		return conversationID, nil
	}

	// Create new conversation
	conversationID = generateID("conv")
	_, err = database.DB.Exec(`
		INSERT INTO conversations (id, participant1_id, participant2_id, created_at, updated_at)
		VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
	`, conversationID, userID1, userID2)

	return conversationID, err
}

// createMessage creates a new message
func createMessage(conversationID, senderID, content, messageType string) (*models.Message, error) {
	messageID := generateID("msg")

	_, err := database.DB.Exec(`
		INSERT INTO messages (id, conversation_id, sender_id, content, message_type, created_at)
		VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
	`, messageID, conversationID, senderID, content, messageType)
	if err != nil {
		return nil, err
	}

	// Update conversation timestamp
	_, err = database.DB.Exec(`
		UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?
	`, conversationID)
	if err != nil {
		log.Printf("Warning: Failed to update conversation timestamp: %v", err)
	}

	// Get the created message with sender info
	message := &models.Message{
		ID:             messageID,
		ConversationID: conversationID,
		SenderID:       senderID,
		Content:        content,
		MessageType:    messageType,
		IsRead:         false,
		CreatedAt:      time.Now(),
	}

	// Get sender info
	var sender models.User
	err = database.DB.QueryRow(`
		SELECT id, nickname, first_name, last_name, avatar_url
		FROM users WHERE id = ?
	`, senderID).Scan(&sender.ID, &sender.Nickname, &sender.FirstName, &sender.LastName, &sender.AvatarURL)
	if err == nil {
		message.Sender = &sender
	}

	return message, nil
}

// isUserInConversation checks if user is part of conversation
func isUserInConversation(userID, conversationID string) bool {
	var count int
	err := database.DB.QueryRow(`
		SELECT COUNT(*) FROM conversations
		WHERE id = ? AND (participant1_id = ? OR participant2_id = ?)
	`, conversationID, userID, userID).Scan(&count)
	return err == nil && count > 0
}

// markMessagesAsRead marks all unread messages in conversation as read for user
func markMessagesAsRead(conversationID, userID string) error {
	_, err := database.DB.Exec(`
		UPDATE messages
		SET is_read = TRUE
		WHERE conversation_id = ? AND sender_id != ? AND is_read = FALSE
	`, conversationID, userID)
	return err
}

// userExists checks if a user exists
func userExists(userID string) bool {
	var count int
	err := database.DB.QueryRow("SELECT COUNT(*) FROM users WHERE id = ?", userID).Scan(&count)
	return err == nil && count > 0
}

// searchUsers searches for users by nickname or name
func searchUsers(query, excludeUserID string) ([]models.User, error) {
	searchQuery := `
		SELECT id, nickname, first_name, last_name, avatar_url
		FROM users
		WHERE id != ? AND (
			nickname LIKE ? OR
			first_name LIKE ? OR
			last_name LIKE ?
		)
		ORDER BY nickname
		LIMIT 20
	`

	searchTerm := "%" + query + "%"
	rows, err := database.DB.Query(searchQuery, excludeUserID, searchTerm, searchTerm, searchTerm)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var user models.User
		err := rows.Scan(&user.ID, &user.Nickname, &user.FirstName, &user.LastName, &user.AvatarURL)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}

	return users, nil
}

// sendMessageNotification sends real-time notification
func sendMessageNotification(recipientID, conversationID string, message *models.Message) {
	notification := models.MessageNotification{
		Type:           "new_message",
		ConversationID: conversationID,
		Message:        *message,
		Timestamp:      time.Now(),
	}

	// Send via WebSocket (implement this when WebSocket is ready)
	log.Printf("📨 New message notification for user %s in conversation %s", recipientID, conversationID)
	_ = notification // Prevent unused variable error
}
