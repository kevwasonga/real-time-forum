package websocket

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"sync"
	"time"

	"forum/internal/auth"
	"forum/internal/database"
	"forum/internal/models"

	"github.com/gorilla/websocket"
)

var (
	upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true // Allow all origins in development
		},
	}
	hub *Hub
)

// Client represents a WebSocket client
type Client struct {
	ID     string
	UserID string
	Conn   *websocket.Conn
	Send   chan []byte
	Hub    *Hub
}

// Hub maintains the set of active clients and broadcasts messages to the clients
type Hub struct {
	// Registered clients
	clients map[*Client]bool

	// Inbound messages from the clients
	broadcast chan []byte

	// Register requests from the clients
	register chan *Client

	// Unregister requests from clients
	unregister chan *Client

	// User ID to multiple clients mapping (supports multiple sessions per user)
	userClients map[string][]*Client

	// Mutex for thread-safe operations
	mutex sync.RWMutex
}

// NewHub creates a new Hub
func NewHub() *Hub {
	return &Hub{
		broadcast:   make(chan []byte, 256),
		register:    make(chan *Client, 256),
		unregister:  make(chan *Client, 256),
		clients:     make(map[*Client]bool),
		userClients: make(map[string][]*Client),
	}
}

// Run starts the hub
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()

			// Add client to general clients map
			h.clients[client] = true

			// Add client to user-specific clients list (supports multiple sessions per user)
			if _, exists := h.userClients[client.UserID]; !exists {
				h.userClients[client.UserID] = []*Client{}
			}
			h.userClients[client.UserID] = append(h.userClients[client.UserID], client)

			totalClients := len(h.clients)
			totalUsers := len(h.userClients)
			userSessions := len(h.userClients[client.UserID])
			h.mutex.Unlock()

			log.Printf("✅ Client %s (User: %s) connected. Total clients: %d, Total unique users: %d, User sessions: %d",
				client.ID, client.UserID, totalClients, totalUsers, userSessions)

			// Update database with user online status (using client ID as session ID)
			h.updateUserOnlineStatus(client.UserID, client.ID, true)

			// Only broadcast user online status if this is their first session
			if userSessions == 1 {
				h.broadcastUserStatus(client.UserID, "online")
			}

		case client := <-h.unregister:
			h.mutex.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.Send)

				// Remove client from user's client list
				if userClients, exists := h.userClients[client.UserID]; exists {
					// Find and remove this specific client
					for i, c := range userClients {
						if c == client {
							h.userClients[client.UserID] = append(userClients[:i], userClients[i+1:]...)
							break
						}
					}
					// If no more clients for this user, remove the user entry
					if len(h.userClients[client.UserID]) == 0 {
						delete(h.userClients, client.UserID)
					}
				}
			}

			totalClients := len(h.clients)
			totalUsers := len(h.userClients)
			userSessions := 0
			if userClients, exists := h.userClients[client.UserID]; exists {
				userSessions = len(userClients)
			}
			h.mutex.Unlock()

			log.Printf("❌ Client %s (User: %s) disconnected. Total clients: %d, Total unique users: %d, Remaining user sessions: %d",
				client.ID, client.UserID, totalClients, totalUsers, userSessions)

			// Update database with user offline status (remove this specific session)
			h.updateUserOnlineStatus(client.UserID, client.ID, false)

			// Only broadcast user offline status if this was their last session
			if userSessions == 0 {
				h.broadcastUserStatus(client.UserID, "offline")
			}

		case message := <-h.broadcast:
			h.mutex.RLock()
			for client := range h.clients {
				select {
				case client.Send <- message:
				default:
					close(client.Send)
					delete(h.clients, client)
					delete(h.userClients, client.UserID)
				}
			}
			h.mutex.RUnlock()
		}
	}
}

// SendToUser sends a message to all sessions of a specific user
func (h *Hub) SendToUser(userID string, message []byte) {
	h.mutex.RLock()
	clients, exists := h.userClients[userID]
	h.mutex.RUnlock()

	if exists {
		for _, client := range clients {
			select {
			case client.Send <- message:
			default:
				// Client's send channel is full, remove this client
				h.mutex.Lock()
				close(client.Send)
				delete(h.clients, client)

				// Remove from user's client list
				if userClients, userExists := h.userClients[userID]; userExists {
					for i, c := range userClients {
						if c == client {
							h.userClients[userID] = append(userClients[:i], userClients[i+1:]...)
							break
						}
					}
					// If no more clients for this user, remove the user entry
					if len(h.userClients[userID]) == 0 {
						delete(h.userClients, userID)
					}
				}
				h.mutex.Unlock()
			}
		}
	}
}

// BroadcastMessage broadcasts a message to all connected clients
func (h *Hub) BroadcastMessage(message []byte) {
	h.broadcast <- message
}

// SendPrivateMessage sends a private message to a specific user
func (h *Hub) SendPrivateMessage(userID string, message map[string]interface{}) {
	// Create WebSocket message
	wsMessage := models.WebSocketMessage{
		Type:      "private_message_received",
		Data:      message,
		Timestamp: time.Now(),
	}

	data, err := json.Marshal(wsMessage)
	if err != nil {
		log.Printf("❌ Error marshaling private message: %v", err)
		return
	}

	// Send to all sessions of the target user
	h.SendToUser(userID, data)

	log.Printf("📨 Private message delivered to user %s", userID)
}

// GetOnlineUsers returns a list of online user IDs
func (h *Hub) GetOnlineUsers() []string {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	users := make([]string, 0, len(h.userClients))
	for userID := range h.userClients {
		users = append(users, userID)
	}
	return users
}

// IsUserOnline checks if a user is online (has at least one active session)
func (h *Hub) IsUserOnline(userID string) bool {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	clients, exists := h.userClients[userID]
	return exists && len(clients) > 0
}

// updateUserOnlineStatus updates the user's online status in the database
func (h *Hub) updateUserOnlineStatus(userID, sessionID string, isOnline bool) {
	log.Printf("👥 updateUserOnlineStatus: User %s, Session %s, isOnline: %v", userID, sessionID, isOnline)

	if isOnline {
		// Insert session for user
		result, err := database.DB.Exec(`
			INSERT OR REPLACE INTO online_users (user_id, session_id, last_seen)
			VALUES (?, ?, CURRENT_TIMESTAMP)
		`, userID, sessionID)
		if err != nil {
			log.Printf("❌ Error updating user online status: %v", err)
		} else {
			rowsAffected, _ := result.RowsAffected()
			log.Printf("✅ User %s session %s marked as online in database (rows affected: %d)", userID, sessionID, rowsAffected)

			// Debug: Check current online users in database
			h.debugOnlineUsersTable()
		}
	} else {
		// Remove specific session from online users table
		result, err := database.DB.Exec(`
			DELETE FROM online_users WHERE user_id = ? AND session_id = ?
		`, userID, sessionID)
		if err != nil {
			log.Printf("❌ Error removing user session from online status: %v", err)
		} else {
			rowsAffected, _ := result.RowsAffected()
			log.Printf("✅ User %s session %s removed from online users in database (rows affected: %d)", userID, sessionID, rowsAffected)

			// Debug: Check current online users in database
			h.debugOnlineUsersTable()
		}
	}
}

// debugOnlineUsersTable prints current online users in database for debugging
func (h *Hub) debugOnlineUsersTable() {
	rows, err := database.DB.Query(`
		SELECT ou.user_id, u.nickname, ou.session_id, ou.last_seen
		FROM online_users ou
		JOIN users u ON ou.user_id = u.id
		ORDER BY ou.last_seen DESC
	`)
	if err != nil {
		log.Printf("❌ Debug query error: %v", err)
		return
	}
	defer rows.Close()

	log.Printf("🔍 Current online_users table contents:")
	count := 0
	for rows.Next() {
		var userID, nickname, sessionID, lastSeen string
		if err := rows.Scan(&userID, &nickname, &sessionID, &lastSeen); err != nil {
			log.Printf("❌ Debug scan error: %v", err)
			continue
		}
		count++
		log.Printf("   %d. User: %s (ID: %s) Session: %s - Last seen: %s", count, nickname, userID, sessionID, lastSeen)
	}
	if count == 0 {
		log.Printf("   (No sessions in online_users table)")
	}
}

// broadcastUserStatus broadcasts user online/offline status
func (h *Hub) broadcastUserStatus(userID, status string) {
	// Get user nickname from database
	var nickname string
	err := database.DB.QueryRow("SELECT nickname FROM users WHERE id = ?", userID).Scan(&nickname)
	if err != nil {
		log.Printf("Error getting user nickname for broadcast: %v", err)
		nickname = "Unknown User"
	}

	message := models.WebSocketMessage{
		Type: "user_status",
		Data: models.UserStatusData{
			UserID:   userID,
			Nickname: nickname,
			Status:   status,
		},
		Timestamp: time.Now(),
	}

	data, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling user status message: %v", err)
		return
	}

	h.BroadcastMessage(data)
}

// InitializeHub initializes the global hub
func InitializeHub() {
	hub = NewHub()
	go hub.Run()
	log.Println("✅ WebSocket hub initialized")
}

// HandleWebSocket handles WebSocket connections
func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	// Get user from session
	user := auth.GetUserFromSession(r)
	if user == nil {
		log.Printf("❌ WebSocket: No user in session")
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	log.Printf("🔌 WebSocket: User %s (%s) connecting", user.Nickname, user.ID)

	// Upgrade connection to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("❌ WebSocket upgrade error: %v", err)
		return
	}

	// Create client
	client := &Client{
		ID:     user.ID + "_" + time.Now().Format("20060102150405"),
		UserID: user.ID,
		Conn:   conn,
		Send:   make(chan []byte, 256),
		Hub:    hub,
	}

	// Register client
	client.Hub.register <- client

	// Start goroutines for reading and writing
	go client.writePump()
	go client.readPump()
}

// readPump pumps messages from the websocket connection to the hub
func (c *Client) readPump() {
	defer func() {
		c.Hub.unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(512)
	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		// Handle incoming message
		c.handleMessage(message)
	}
}

// writePump pumps messages from the hub to the websocket connection
func (c *Client) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued chat messages to the current websocket message
			n := len(c.Send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// handleMessage handles incoming WebSocket messages
func (c *Client) handleMessage(message []byte) {
	var wsMessage models.WebSocketMessage
	if err := json.Unmarshal(message, &wsMessage); err != nil {
		log.Printf("Error unmarshaling WebSocket message: %v", err)
		return
	}

	switch wsMessage.Type {
	case "private_message":
		c.handlePrivateMessage(wsMessage.Data)
	case "typing_indicator":
		c.handleTypingIndicator(wsMessage.Data)
	case "ping":
		c.handlePing()
	default:
		log.Printf("Unknown WebSocket message type: %s", wsMessage.Type)
	}
}

// handlePrivateMessage handles private message sending
func (c *Client) handlePrivateMessage(data interface{}) {
	log.Printf("📨 Private message from user %s: %v", c.UserID, data)

	// Parse the message data
	messageData, ok := data.(map[string]interface{})
	if !ok {
		log.Printf("❌ Invalid private message data format")
		return
	}

	receiverID, ok := messageData["receiverId"].(string)
	if !ok || receiverID == "" {
		log.Printf("❌ Missing or invalid receiver ID")
		return
	}

	content, ok := messageData["content"].(string)
	if !ok || content == "" {
		log.Printf("❌ Missing or invalid message content")
		return
	}

	// Don't allow sending messages to self
	if receiverID == c.UserID {
		log.Printf("❌ User %s attempted to send message to self", c.UserID)
		return
	}

	log.Printf("📨 Processing private message: %s -> %s: %s", c.UserID, receiverID, content)

	// Store message in database
	messageID, err := c.storePrivateMessage(receiverID, content)
	if err != nil {
		log.Printf("❌ Failed to store private message: %v", err)
		c.sendErrorMessage("Failed to send message")
		return
	}

	// Create message object for real-time delivery
	message := map[string]interface{}{
		"id":         messageID,
		"senderId":   c.UserID,
		"receiverId": receiverID,
		"content":    content,
		"timestamp":  time.Now().Format(time.RFC3339),
		"type":       "private_message",
	}

	// Send to receiver via WebSocket
	c.Hub.SendPrivateMessage(receiverID, message)

	// Send confirmation back to sender
	c.sendMessageConfirmation(message)

	log.Printf("✅ Private message sent successfully: %s -> %s", c.UserID, receiverID)
}

// storePrivateMessage stores a private message in the database
func (c *Client) storePrivateMessage(receiverID, content string) (string, error) {
	messageID := generateMessageID()

	_, err := database.DB.Exec(`
		INSERT INTO messages (id, sender_id, receiver_id, content, timestamp)
		VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
	`, messageID, c.UserID, receiverID, content)

	if err != nil {
		return "", err
	}

	return messageID, nil
}

// sendErrorMessage sends an error message back to the client
func (c *Client) sendErrorMessage(errorMsg string) {
	errorResponse := models.WebSocketMessage{
		Type: "error",
		Data: map[string]interface{}{
			"message": errorMsg,
		},
		Timestamp: time.Now(),
	}

	data, err := json.Marshal(errorResponse)
	if err != nil {
		log.Printf("❌ Error marshaling error message: %v", err)
		return
	}

	select {
	case c.Send <- data:
	default:
		log.Printf("❌ Client send channel full, could not send error message")
	}
}

// sendMessageConfirmation sends a confirmation back to the sender
func (c *Client) sendMessageConfirmation(message map[string]interface{}) {
	confirmation := models.WebSocketMessage{
		Type:      "message_sent",
		Data:      message,
		Timestamp: time.Now(),
	}

	data, err := json.Marshal(confirmation)
	if err != nil {
		log.Printf("❌ Error marshaling message confirmation: %v", err)
		return
	}

	select {
	case c.Send <- data:
	default:
		log.Printf("❌ Client send channel full, could not send confirmation")
	}
}

// generateMessageID generates a unique message ID
func generateMessageID() string {
	return fmt.Sprintf("msg_%d_%d", time.Now().UnixNano(), rand.Intn(10000))
}

// handleTypingIndicator handles typing indicators
func (c *Client) handleTypingIndicator(data interface{}) {
	// Implementation for typing indicators
	log.Printf("Typing indicator from user %s: %v", c.UserID, data)
}

// handlePing handles ping messages
func (c *Client) handlePing() {
	response := models.WebSocketMessage{
		Type:      "pong",
		Data:      map[string]interface{}{"timestamp": time.Now()},
		Timestamp: time.Now(),
	}

	data, err := json.Marshal(response)
	if err != nil {
		log.Printf("Error marshaling pong response: %v", err)
		return
	}

	select {
	case c.Send <- data:
	default:
		close(c.Send)
	}
}

// BroadcastNewPost broadcasts a new post to all connected clients
func BroadcastNewPost(post *models.Post) {
	if hub == nil {
		return
	}

	message := models.WebSocketMessage{
		Type:      "new_post",
		Data:      post,
		Timestamp: time.Now(),
	}

	data, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling new post message: %v", err)
		return
	}

	hub.BroadcastMessage(data)
}

// SendPrivateMessage sends a private message to a specific user
func SendPrivateMessage(receiverID string, message *models.Message) {
	if hub == nil {
		return
	}

	wsMessage := models.WebSocketMessage{
		Type:      "private_message",
		Data:      message,
		Timestamp: time.Now(),
	}

	data, err := json.Marshal(wsMessage)
	if err != nil {
		log.Printf("Error marshaling private message: %v", err)
		return
	}

	hub.SendToUser(receiverID, data)
}
