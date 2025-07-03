package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

// CreateChatHandler handles creating new chats between users
func CreateChatHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Parse request body
		var requestData struct {
			User1 string `json:"user1"`
			User2 string `json:"user2"`
		}

		if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}

		// Check if chat already exists (in either direction)
		var exists bool
		err := db.QueryRow(`
			SELECT EXISTS(
				SELECT 1 FROM chats
				WHERE (user1 = ? AND user2 = ?) OR (user1 = ? AND user2 = ?)
			)`, requestData.User1, requestData.User2, requestData.User2, requestData.User1).Scan(&exists)

		if err != nil {
			log.Printf("Error checking chat existence: %v", err)
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}

		if !exists {
			// Create new chat
			_, err = db.Exec("INSERT INTO chats (user1, user2) VALUES (?, ?)",
				requestData.User1, requestData.User2)
			if err != nil {
				log.Printf("Error creating chat: %v", err)
				http.Error(w, "Failed to create chat", http.StatusInternalServerError)
				return
			}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": "Chat created successfully",
		})
	}
}

// GetChatsHandler returns all chats for the current user
func GetChatsHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Get current user from session
		username := getCurrentUser(r, db)
		if username == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Get all chats involving this user
		rows, err := db.Query(`
			SELECT user1, user2 FROM chats
			WHERE user1 = ? OR user2 = ?
		`, username, username)

		if err != nil {
			log.Printf("Error fetching chats: %v", err)
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var chats []map[string]string
		for rows.Next() {
			var user1, user2 string
			if err := rows.Scan(&user1, &user2); err != nil {
				log.Printf("Error scanning chat: %v", err)
				continue
			}
			chats = append(chats, map[string]string{
				"user1": user1,
				"user2": user2,
			})
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(chats)
	}
}

// GetMessagesHandler returns messages for a specific chat
func GetMessagesHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Get current user from session
		username := getCurrentUser(r, db)
		if username == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Get other user from query params
		otherUser := r.URL.Query().Get("user")
		if otherUser == "" {
			http.Error(w, "Missing user parameter", http.StatusBadRequest)
			return
		}

		// Get user IDs from nicknames
		var userID, otherUserID string
		err := db.QueryRow("SELECT id FROM users WHERE nickname = ?", username).Scan(&userID)
		if err != nil {
			log.Printf("Error finding user ID: %v", err)
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}

		err = db.QueryRow("SELECT id FROM users WHERE nickname = ?", otherUser).Scan(&otherUserID)
		if err != nil {
			log.Printf("Error finding other user ID: %v", err)
			http.Error(w, "Other user not found", http.StatusNotFound)
			return
		}

		// Get messages between these two users
		rows, err := db.Query(`
			SELECT m.content, u1.nickname as sender, u2.nickname as receiver, m.created_at,
			       CASE WHEN m.is_read THEN 'read' ELSE 'unread' END as status
			FROM messages m
			JOIN conversations c ON m.conversation_id = c.id
			JOIN users u1 ON m.sender_id = u1.id
			JOIN users u2 ON (c.participant1_id = u2.id AND c.participant2_id = u1.id)
			          OR (c.participant2_id = u2.id AND c.participant1_id = u1.id)
			WHERE ((c.participant1_id = ? AND c.participant2_id = ?)
			    OR (c.participant1_id = ? AND c.participant2_id = ?))
			  AND u2.id != u1.id
			ORDER BY m.created_at ASC
		`, userID, otherUserID, otherUserID, userID)

		if err != nil {
			log.Printf("Error fetching messages: %v", err)
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var messages []map[string]interface{}
		for rows.Next() {
			var content, sender, receiver, createdAt, status string
			if err := rows.Scan(&content, &sender, &receiver, &createdAt, &status); err != nil {
				log.Printf("Error scanning message: %v", err)
				continue
			}
			messages = append(messages, map[string]interface{}{
				"sender":   sender,
				"receiver": receiver,
				"message":  content,
				"time":     createdAt,
				"status":   status,
			})
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(messages)
	}
}

// GetOnlineUsersHandler returns list of online users
func GetOnlineUsersHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Get all active online users
		rows, err := db.Query(`
			SELECT DISTINCT u.nickname
			FROM online_users ou
			JOIN users u ON ou.user_id = u.id
			WHERE ou.last_seen > datetime('now', '-5 minutes')
		`)
		if err != nil {
			log.Printf("Error fetching online users: %v", err)
			// Return empty array instead of error for now
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode([]map[string]interface{}{})
			return
		}
		defer rows.Close()

		var users []map[string]interface{}
		for rows.Next() {
			var username string
			if err := rows.Scan(&username); err != nil {
				log.Printf("Error scanning online user: %v", err)
				continue
			}
			users = append(users, map[string]interface{}{
				"username": username,
				"online":   true,
			})
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(users)
	}
}

// GetAllUsersHandler returns all users for chat selection
func GetAllUsersHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Get current user (skip auth for testing)
		currentUser := getCurrentUser(r, db)
		if currentUser == "" {
			// For testing, continue without auth
			currentUser = "anonymous"
		}

		// Get all users except current user
		rows, err := db.Query("SELECT nickname FROM users WHERE nickname != ?", currentUser)
		if err != nil {
			log.Printf("Error fetching users: %v", err)
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		// Get online users
		onlineRows, err := db.Query(`
			SELECT DISTINCT u.nickname
			FROM online_users ou
			JOIN users u ON ou.user_id = u.id
			WHERE ou.last_seen > datetime('now', '-5 minutes')
		`)
		onlineUsers := make(map[string]bool)
		if err != nil {
			log.Printf("Error fetching online users: %v", err)
			// Continue without online status for now
		} else {
			defer onlineRows.Close()
			for onlineRows.Next() {
				var username string
				if err := onlineRows.Scan(&username); err != nil {
					continue
				}
				onlineUsers[username] = true
			}
		}

		var users []map[string]interface{}
		for rows.Next() {
			var username string
			if err := rows.Scan(&username); err != nil {
				log.Printf("Error scanning user: %v", err)
				continue
			}
			users = append(users, map[string]interface{}{
				"username": username,
				"online":   onlineUsers[username],
			})
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(users)
	}
}

// Helper function to get current user from session
func getCurrentUser(r *http.Request, db *sql.DB) string {
	// Get session cookie
	cookie, err := r.Cookie("session")
	if err != nil {
		return ""
	}

	// Look up session in database
	var username string
	err = db.QueryRow(`
		SELECT u.nickname
		FROM sessions s
		JOIN users u ON s.user_id = u.id
		WHERE s.id = ? AND s.expires_at > datetime('now')
	`, cookie.Value).Scan(&username)
	if err != nil {
		return ""
	}

	return username
}

// Generic API handler for compatibility with existing frontend
func APIHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Parse the path to determine what data is requested
		path := strings.TrimPrefix(r.URL.Path, "/api/")

		switch path {
		case "chats":
			GetChatsHandler(db)(w, r)
		case "sessions":
			GetOnlineUsersHandler(db)(w, r)
		case "messages":
			GetMessagesHandler(db)(w, r)
		case "users":
			GetAllUsersHandler(db)(w, r)
		default:
			http.Error(w, "Not found", http.StatusNotFound)
		}
	}
}

// WebSocket upgrader
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

// ChatWebSocketHandler handles WebSocket connections for real-time chat
func ChatWebSocketHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Extract chat room from URL path
		path := strings.TrimPrefix(r.URL.Path, "/chat/")
		if path == "" {
			http.Error(w, "Chat room required", http.StatusBadRequest)
			return
		}

		log.Printf("🔌 WebSocket connection request for room: %s", path)

		// Upgrade HTTP connection to WebSocket
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("❌ WebSocket upgrade failed: %v", err)
			return
		}
		defer conn.Close()

		log.Printf("✅ WebSocket connection established for room: %s", path)

		// Handle messages
		for {
			var message struct {
				Message  string `json:"message"`
				Sender   string `json:"sender"`
				Receiver string `json:"receiver"`
				Status   string `json:"status"`
			}

			// Read message from WebSocket
			err := conn.ReadJSON(&message)
			if err != nil {
				log.Printf("❌ Error reading WebSocket message: %v", err)
				break
			}

			log.Printf("📨 Received message: %+v", message)

			// Get sender and receiver user IDs from nicknames
			var senderID, receiverID string
			err = db.QueryRow("SELECT id FROM users WHERE nickname = ?", message.Sender).Scan(&senderID)
			if err != nil {
				log.Printf("❌ Error finding sender user ID: %v", err)
				continue
			}

			err = db.QueryRow("SELECT id FROM users WHERE nickname = ?", message.Receiver).Scan(&receiverID)
			if err != nil {
				log.Printf("❌ Error finding receiver user ID: %v", err)
				continue
			}

			// Find or create conversation
			var conversationID string
			err = db.QueryRow(`
				SELECT id FROM conversations
				WHERE (participant1_id = ? AND participant2_id = ?)
				   OR (participant1_id = ? AND participant2_id = ?)
			`, senderID, receiverID, receiverID, senderID).Scan(&conversationID)

			if err != nil {
				// Create new conversation
				conversationID = generateUUID()
				_, err = db.Exec(`
					INSERT INTO conversations (id, participant1_id, participant2_id, created_at, updated_at)
					VALUES (?, ?, ?, ?, ?)
				`, conversationID, senderID, receiverID, time.Now(), time.Now())

				if err != nil {
					log.Printf("❌ Error creating conversation: %v", err)
					continue
				}
				log.Printf("✅ Created new conversation: %s", conversationID)
			}

			// Save message to database
			messageID := generateUUID()
			_, err = db.Exec(`
				INSERT INTO messages (id, conversation_id, sender_id, content, message_type, is_read, created_at)
				VALUES (?, ?, ?, ?, ?, ?, ?)
			`, messageID, conversationID, senderID, message.Message, "text", false, time.Now())

			if err != nil {
				log.Printf("❌ Error saving message to database: %v", err)
				continue
			}

			// Add timestamp for response
			response := struct {
				Message  string `json:"message"`
				Sender   string `json:"sender"`
				Receiver string `json:"receiver"`
				Time     string `json:"time"`
				Status   string `json:"status"`
			}{
				Message:  message.Message,
				Sender:   message.Sender,
				Receiver: message.Receiver,
				Time:     time.Now().Format("15:04:05"),
				Status:   "sent",
			}

			// Echo message back to sender (for confirmation)
			err = conn.WriteJSON(response)
			if err != nil {
				log.Printf("❌ Error sending WebSocket response: %v", err)
				break
			}

			log.Printf("✅ Message saved and echoed back")
		}

		log.Printf("🔌 WebSocket connection closed for room: %s", path)
	}
}

// generateUUID generates a new UUID string
func generateUUID() string {
	return strings.ReplaceAll(uuid.New().String(), "-", "")
}
