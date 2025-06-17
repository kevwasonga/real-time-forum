package backend

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

func getCurrentUserID(r *http.Request) (string, error) {
	// Get the session ID from the cookie
	cookie, err := r.Cookie("session_id")
	if err != nil {
		return "", err // Return an error if the cookie is missing
	}

	sessionID := cookie.Value

	// Query the database to get the user ID associated with the session ID
	var userID string
	err = GetDB().QueryRow(`
        SELECT user_id 
        FROM sessions 
        WHERE id = ?`, sessionID).Scan(&userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", http.ErrNoCookie // Return an error if the session is not found
		}
		return "", err // Return any other database error
	}

	return userID, nil
}

// FetchMessagesHandler retrieves messages between the logged-in user and the specified user
func FetchMessagesHandler(w http.ResponseWriter, r *http.Request, userId string) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	messages, err := FetchMessages(r, userId)
	if err != nil {
		http.Error(w, "Failed to fetch messages", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(messages)

}

// FetchMessages retrieves messages between the logged-in user and the specified user from the database
func FetchMessages(r *http.Request, userId string) ([]Message, error) {
	currentUserID, err := getCurrentUserID(r)
	if err != nil {
		return nil, err
	}

	rows, err := GetDatabaseConnection().Query(`SELECT id, sender_id, receiver_id, content, created_at FROM messages
	WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
	ORDER BY created_at ASC`, currentUserID, userId, userId, currentUserID)
	if err != nil {
		fmt.Println("Error fetching messages:", err)
		return nil, err
	}
	defer rows.Close()

	var messages []Message
	for rows.Next() {
		var message Message
		if err := rows.Scan(&message.ID, &message.SenderID, &message.ReceiverID, &message.Content, &message.Timestamp); err != nil {
			fmt.Println("Error scanning message:", err)
			return nil, err
		}
		message.CurrentUserId, _ = getCurrentUserID(r)
		// message.ReadStatus = 1
		messages = append(messages, message)
	}

	return messages, nil
}

func SendMessageHandler(w http.ResponseWriter, r *http.Request, recipientID string) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Content string `json:"content"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Content == "" {
		http.Error(w, "Message content cannot be empty", http.StatusBadRequest)
		return
	}

	// Get the sender ID from the session
	senderID, err := getCurrentUserID(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Insert the message into the database
	result, err := GetDatabaseConnection().Exec(
		`INSERT INTO messages (sender_id, receiver_id, content, created_at) VALUES (?, ?, ?, ?)`,
		senderID, recipientID, req.Content, time.Now(),
	)
	if err != nil {
		http.Error(w, "Failed to store message", http.StatusInternalServerError)
		return
	}

	messageID, err := result.LastInsertId()
	if err != nil {
		http.Error(w, "Failed to retrieve message ID", http.StatusInternalServerError)
		return
	}

	// Create the message object to return
	message := Message{
		ID:         int(messageID),
		SenderID:   senderID,
		ReceiverID: recipientID,
		Content:    req.Content,
		Timestamp:  time.Now(),
	}

	// Return the message as JSON
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(message)
}
