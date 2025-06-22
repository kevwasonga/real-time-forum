package websocket

import (
	"encoding/json"
	"log"
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

	// User ID to client mapping for direct messaging
	userClients map[string]*Client

	// Mutex for thread-safe operations
	mutex sync.RWMutex
}

// NewHub creates a new Hub
func NewHub() *Hub {
	return &Hub{
		broadcast:   make(chan []byte),
		register:    make(chan *Client),
		unregister:  make(chan *Client),
		clients:     make(map[*Client]bool),
		userClients: make(map[string]*Client),
	}
}

// Run starts the hub
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			h.clients[client] = true
			h.userClients[client.UserID] = client
			h.mutex.Unlock()

			log.Printf("Client %s (User: %s) connected", client.ID, client.UserID)

			// Update database with user online status
			h.updateUserOnlineStatus(client.UserID, true)

			// Broadcast user online status
			h.broadcastUserStatus(client.UserID, "online")

		case client := <-h.unregister:
			h.mutex.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				delete(h.userClients, client.UserID)
				close(client.Send)
			}
			h.mutex.Unlock()

			log.Printf("Client %s (User: %s) disconnected", client.ID, client.UserID)

			// Update database with user offline status
			h.updateUserOnlineStatus(client.UserID, false)

			// Broadcast user offline status
			h.broadcastUserStatus(client.UserID, "offline")

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

// SendToUser sends a message to a specific user
func (h *Hub) SendToUser(userID string, message []byte) {
	h.mutex.RLock()
	client, exists := h.userClients[userID]
	h.mutex.RUnlock()

	if exists {
		select {
		case client.Send <- message:
		default:
			h.mutex.Lock()
			close(client.Send)
			delete(h.clients, client)
			delete(h.userClients, client.UserID)
			h.mutex.Unlock()
		}
	}
}

// BroadcastMessage broadcasts a message to all connected clients
func (h *Hub) BroadcastMessage(message []byte) {
	h.broadcast <- message
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

// IsUserOnline checks if a user is online
func (h *Hub) IsUserOnline(userID string) bool {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	_, exists := h.userClients[userID]
	return exists
}

// updateUserOnlineStatus updates the user's online status in the database
func (h *Hub) updateUserOnlineStatus(userID string, isOnline bool) {
	if isOnline {
		// Insert or update user as online
		_, err := database.DB.Exec(`
			INSERT OR REPLACE INTO online_users (user_id, last_seen)
			VALUES (?, CURRENT_TIMESTAMP)
		`, userID)
		if err != nil {
			log.Printf("Error updating user online status: %v", err)
		} else {
			log.Printf("User %s marked as online in database", userID)
		}
	} else {
		// Remove user from online users table
		_, err := database.DB.Exec(`
			DELETE FROM online_users WHERE user_id = ?
		`, userID)
		if err != nil {
			log.Printf("Error removing user from online status: %v", err)
		} else {
			log.Printf("User %s removed from online users in database", userID)
		}
	}
}

// broadcastUserStatus broadcasts user online/offline status
func (h *Hub) broadcastUserStatus(userID, status string) {
	message := models.WebSocketMessage{
		Type: "user_status",
		Data: models.UserStatusData{
			UserID: userID,
			Status: status,
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
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	// Upgrade connection to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
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
	// Implementation for private messaging
	log.Printf("Private message from user %s: %v", c.UserID, data)
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
