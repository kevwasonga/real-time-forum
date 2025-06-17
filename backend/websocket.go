package backend

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// Enhanced WebSocket configuration
var (
	nexusWebSocketUpgrader = websocket.Upgrader{
		ReadBufferSize:  2048,
		WriteBufferSize: 2048,
		CheckOrigin: func(r *http.Request) bool {
			// In production, implement proper origin checking
			return true
		},
		EnableCompression: true,
	}

	// Global connection management
	activeConnections = make(map[string]*NexusConnection)
	connectionsMutex  = sync.RWMutex{}
	broadcastChannel  = make(chan *BroadcastMessage, 256)
	connectionHub     *NexusHub
)

// Enhanced connection structure
type NexusConnection struct {
	ID           string
	UserID       string
	Connection   *websocket.Conn
	SendChannel  chan []byte
	IsActive     bool
	LastActivity time.Time
	UserAgent    string
	IPAddress    string
}

// Message types for different real-time events
type NexusWebSocketMessage struct {
	Type      string          `json:"type"`
	Data      json.RawMessage `json:"data"`
	Timestamp time.Time       `json:"timestamp"`
	UserID    string          `json:"userId,omitempty"`
}

// Broadcast message structure
type BroadcastMessage struct {
	Type        string
	Data        interface{}
	TargetUser  string // Empty for broadcast to all
	ExcludeUser string // User to exclude from broadcast
}

// Connection hub for managing all connections
type NexusHub struct {
	connections map[string]*NexusConnection
	mutex       sync.RWMutex
	register    chan *NexusConnection
	unregister  chan *NexusConnection
	broadcast   chan *BroadcastMessage
}

// Initialize WebSocket hub
func InitializeWebSocketHub() {
	connectionHub = &NexusHub{
		connections: make(map[string]*NexusConnection),
		register:    make(chan *NexusConnection),
		unregister:  make(chan *NexusConnection),
		broadcast:   make(chan *BroadcastMessage),
	}

	go connectionHub.run()
	log.Println("🔌 WebSocket hub initialized")
}

// Hub management methods
func (h *NexusHub) run() {
	for {
		select {
		case connection := <-h.register:
			h.registerConnection(connection)

		case connection := <-h.unregister:
			h.unregisterConnection(connection)

		case message := <-h.broadcast:
			h.broadcastMessage(message)
		}
	}
}

func (h *NexusHub) registerConnection(conn *NexusConnection) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	// Close existing connection for the same user
	if existingConn, exists := h.connections[conn.UserID]; exists {
		existingConn.IsActive = false
		close(existingConn.SendChannel)
		existingConn.Connection.Close()
	}

	h.connections[conn.UserID] = conn
	log.Printf("👤 User %s connected via WebSocket", conn.UserID)

	// Broadcast user online status
	h.broadcastUserStatus(conn.UserID, "online")
}

func (h *NexusHub) unregisterConnection(conn *NexusConnection) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	if _, exists := h.connections[conn.UserID]; exists {
		delete(h.connections, conn.UserID)
		close(conn.SendChannel)
		conn.Connection.Close()
		log.Printf("👋 User %s disconnected from WebSocket", conn.UserID)

		// Broadcast user offline status
		h.broadcastUserStatus(conn.UserID, "offline")
	}
}

func (h *NexusHub) broadcastMessage(msg *BroadcastMessage) {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	messageData, err := json.Marshal(NexusWebSocketMessage{
		Type:      msg.Type,
		Data:      json.RawMessage(mustMarshal(msg.Data)),
		Timestamp: time.Now(),
	})
	if err != nil {
		log.Printf("Error marshaling broadcast message: %v", err)
		return
	}

	for userID, conn := range h.connections {
		// Skip if targeting specific user and this isn't the target
		if msg.TargetUser != "" && userID != msg.TargetUser {
			continue
		}

		// Skip if excluding specific user and this is the excluded user
		if msg.ExcludeUser != "" && userID == msg.ExcludeUser {
			continue
		}

		if conn.IsActive {
			select {
			case conn.SendChannel <- messageData:
			default:
				// Channel is full, close connection
				conn.IsActive = false
				close(conn.SendChannel)
				delete(h.connections, userID)
			}
		}
	}
}

func (h *NexusHub) broadcastUserStatus(userID, status string) {
	statusData := map[string]interface{}{
		"userId":    userID,
		"status":    status,
		"timestamp": time.Now(),
	}

	h.broadcast <- &BroadcastMessage{
		Type:        "user_status",
		Data:        statusData,
		ExcludeUser: userID, // Don't send to the user themselves
	}
}

// Enhanced WebSocket handler
func EstablishWebSocketConnection(w http.ResponseWriter, r *http.Request) {
	// Upgrade HTTP connection to WebSocket
	conn, err := nexusWebSocketUpgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	// Get user ID from session or query parameter
	userID := r.URL.Query().Get("userID")
	if userID == "" {
		// Try to get from session
		if sessionUser := getUserFromSession(r); sessionUser != nil {
			userID = sessionUser.ID
		} else {
			log.Println("No user ID found for WebSocket connection")
			conn.Close()
			return
		}
	}

	// Create new connection instance
	nexusConn := &NexusConnection{
		ID:           generateConnectionID(),
		UserID:       userID,
		Connection:   conn,
		SendChannel:  make(chan []byte, 256),
		IsActive:     true,
		LastActivity: time.Now(),
		UserAgent:    r.Header.Get("User-Agent"),
		IPAddress:    getClientIP(r),
	}

	// Register connection with hub
	connectionHub.register <- nexusConn

	// Start connection handlers
	go nexusConn.handleIncomingMessages()
	go nexusConn.handleOutgoingMessages()
}

// Connection message handlers
func (conn *NexusConnection) handleIncomingMessages() {
	defer func() {
		conn.IsActive = false
		connectionHub.unregister <- conn
	}()

	// Set read deadline and pong handler for connection health
	conn.Connection.SetReadDeadline(time.Now().Add(60 * time.Second))
	conn.Connection.SetPongHandler(func(string) error {
		conn.Connection.SetReadDeadline(time.Now().Add(60 * time.Second))
		conn.LastActivity = time.Now()
		return nil
	})

	for {
		var wsMessage NexusWebSocketMessage
		err := conn.Connection.ReadJSON(&wsMessage)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error for user %s: %v", conn.UserID, err)
			}
			break
		}

		conn.LastActivity = time.Now()

		// Process different message types
		switch wsMessage.Type {
		case "private_message":
			conn.handlePrivateMessage(wsMessage.Data)
		case "discussion_update":
			conn.handleDiscussionUpdate(wsMessage.Data)
		case "typing_indicator":
			conn.handleTypingIndicator(wsMessage.Data)
		case "ping":
			conn.handlePing()
		default:
			log.Printf("Unknown message type: %s from user %s", wsMessage.Type, conn.UserID)
		}
	}
}

func (conn *NexusConnection) handleOutgoingMessages() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		conn.Connection.Close()
	}()

	for {
		select {
		case message, ok := <-conn.SendChannel:
			conn.Connection.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				conn.Connection.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := conn.Connection.WriteMessage(websocket.TextMessage, message); err != nil {
				log.Printf("Write error for user %s: %v", conn.UserID, err)
				return
			}

		case <-ticker.C:
			conn.Connection.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := conn.Connection.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// Message type handlers
func (conn *NexusConnection) handlePrivateMessage(data json.RawMessage) {
	var msgData struct {
		RecipientID string `json:"recipientId"`
		Content     string `json:"content"`
	}

	if err := json.Unmarshal(data, &msgData); err != nil {
		log.Printf("Invalid private message format from user %s: %v", conn.UserID, err)
		return
	}

	// Store message in database
	_, err := GetDatabaseConnection().Exec(
		`INSERT INTO messages (sender_id, receiver_id, content, created_at) VALUES (?, ?, ?, ?)`,
		conn.UserID, msgData.RecipientID, msgData.Content, time.Now(),
	)
	if err != nil {
		log.Printf("Failed to store private message: %v", err)
		return
	}

	// Send to recipient if online
	responseData := map[string]interface{}{
		"senderId":  conn.UserID,
		"content":   msgData.Content,
		"timestamp": time.Now(),
	}

	connectionHub.broadcast <- &BroadcastMessage{
		Type:       "private_message",
		Data:       responseData,
		TargetUser: msgData.RecipientID,
	}
}

func (conn *NexusConnection) handleDiscussionUpdate(data json.RawMessage) {
	// Broadcast discussion updates to all connected users
	connectionHub.broadcast <- &BroadcastMessage{
		Type:        "discussion_update",
		Data:        data,
		ExcludeUser: conn.UserID,
	}
}

func (conn *NexusConnection) handleTypingIndicator(data json.RawMessage) {
	var typingData struct {
		RecipientID string `json:"recipientId"`
		IsTyping    bool   `json:"isTyping"`
	}

	if err := json.Unmarshal(data, &typingData); err != nil {
		return
	}

	responseData := map[string]interface{}{
		"senderId": conn.UserID,
		"isTyping": typingData.IsTyping,
	}

	connectionHub.broadcast <- &BroadcastMessage{
		Type:       "typing_indicator",
		Data:       responseData,
		TargetUser: typingData.RecipientID,
	}
}

func (conn *NexusConnection) handlePing() {
	pongData := map[string]interface{}{
		"timestamp": time.Now(),
	}

	responseMessage := NexusWebSocketMessage{
		Type:      "pong",
		Data:      json.RawMessage(mustMarshal(pongData)),
		Timestamp: time.Now(),
	}

	if messageBytes, err := json.Marshal(responseMessage); err == nil {
		select {
		case conn.SendChannel <- messageBytes:
		default:
			// Channel full, ignore
		}
	}
}

// Utility functions
func mustMarshal(v interface{}) []byte {
	data, err := json.Marshal(v)
	if err != nil {
		log.Printf("Marshal error: %v", err)
		return []byte("{}")
	}
	return data
}

func generateConnectionID() string {
	return "conn_" + time.Now().Format("20060102150405") + "_" + randomString(8)
}

func randomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	result := make([]byte, length)
	for i := range result {
		result[i] = charset[time.Now().UnixNano()%int64(len(charset))]
	}
	return string(result)
}

func getClientIP(r *http.Request) string {
	// Check for X-Forwarded-For header
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		return xff
	}

	// Check for X-Real-IP header
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}

	// Fall back to RemoteAddr
	return r.RemoteAddr
}

func getUserFromSession(r *http.Request) *UserProfile {
	cookie, err := r.Cookie("session_id")
	if err != nil {
		return nil
	}

	var session UserSession
	err = GetDatabaseConnection().QueryRow("SELECT id, user_id, created_at, expires_at FROM sessions WHERE id = ?", cookie.Value).
		Scan(&session.ID, &session.UserID, &session.CreatedAt, &session.ExpiresAt)
	if err != nil {
		return nil
	}

	if time.Now().After(session.ExpiresAt) {
		return nil
	}

	var user UserProfile
	err = GetDatabaseConnection().QueryRow("SELECT id, username, nickname, first_name, last_name, age, gender, email FROM users WHERE id = ?", session.UserID).
		Scan(&user.ID, &user.Username, &user.Nickname, &user.FirstName, &user.LastName, &user.Age, &user.Gender, &user.Email)
	if err != nil {
		return nil
	}

	return &user
}

// Public API functions for broadcasting messages
func BroadcastDiscussionUpdate(discussionID int, updateType string, data interface{}) {
	if connectionHub == nil {
		return
	}

	broadcastData := map[string]interface{}{
		"discussionId": discussionID,
		"updateType":   updateType,
		"data":         data,
		"timestamp":    time.Now(),
	}

	connectionHub.broadcast <- &BroadcastMessage{
		Type: "discussion_update",
		Data: broadcastData,
	}
}

func BroadcastNewComment(discussionID int, comment interface{}) {
	BroadcastDiscussionUpdate(discussionID, "new_comment", comment)
}

func BroadcastLikeUpdate(discussionID int, likes int, userID string) {
	updateData := map[string]interface{}{
		"likes":  likes,
		"userId": userID,
	}
	BroadcastDiscussionUpdate(discussionID, "like_update", updateData)
}

func NotifyUser(userID string, notificationType string, data interface{}) {
	if connectionHub == nil {
		return
	}

	notificationData := map[string]interface{}{
		"type":      notificationType,
		"data":      data,
		"timestamp": time.Now(),
	}

	connectionHub.broadcast <- &BroadcastMessage{
		Type:       "notification",
		Data:       notificationData,
		TargetUser: userID,
	}
}

func GetOnlineUsers() []string {
	if connectionHub == nil {
		return []string{}
	}

	connectionHub.mutex.RLock()
	defer connectionHub.mutex.RUnlock()

	users := make([]string, 0, len(connectionHub.connections))
	for userID := range connectionHub.connections {
		users = append(users, userID)
	}

	return users
}

func IsUserOnline(userID string) bool {
	if connectionHub == nil {
		return false
	}

	connectionHub.mutex.RLock()
	defer connectionHub.mutex.RUnlock()

	_, exists := connectionHub.connections[userID]
	return exists
}

// Legacy function aliases for backward compatibility
var WebSocketHandler = EstablishWebSocketConnection
