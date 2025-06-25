package handlers

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"forum/internal/auth"
	"forum/internal/database"
	"forum/internal/models"
)

// ProfileHandler handles profile operations
func ProfileHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		getProfileHandler(w, r)
	case http.MethodPut:
		updateProfileHandler(w, r)
	default:
		RenderError(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// getProfileHandler gets user profile
func getProfileHandler(w http.ResponseWriter, r *http.Request) {
	user := auth.GetUserFromSession(r)
	if user == nil {
		RenderError(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	RenderSuccess(w, "Profile retrieved successfully", user)
}

// updateProfileHandler updates user profile
func updateProfileHandler(w http.ResponseWriter, r *http.Request) {
	user := auth.GetUserFromSession(r)
	if user == nil {
		RenderError(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	var req struct {
		FirstName string `json:"firstName"`
		LastName  string `json:"lastName"`
		Age       int    `json:"age"`
		Gender    string `json:"gender"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RenderError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate input
	if req.FirstName == "" || req.LastName == "" {
		RenderError(w, "First name and last name are required", http.StatusBadRequest)
		return
	}

	if req.Age < 13 {
		RenderError(w, "Age must be at least 13", http.StatusBadRequest)
		return
	}

	if req.Gender != "male" && req.Gender != "female" {
		RenderError(w, "Gender must be 'male' or 'female'", http.StatusBadRequest)
		return
	}

	// Update user profile
	_, err := database.DB.Exec(`
		UPDATE users
		SET first_name = ?, last_name = ?, age = ?, gender = ?, updated_at = ?
		WHERE id = ?
	`, req.FirstName, req.LastName, req.Age, req.Gender, time.Now(), user.ID)

	if err != nil {
		RenderError(w, "Failed to update profile", http.StatusInternalServerError)
		return
	}

	// Get updated user data
	updatedUser, err := auth.GetUserByID(user.ID)
	if err != nil {
		RenderError(w, "Failed to retrieve updated profile", http.StatusInternalServerError)
		return
	}

	RenderSuccess(w, "Profile updated successfully", updatedUser)
}

// FriendsHandler handles friend operations
func FriendsHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		getFriendsHandler(w, r)
	case http.MethodPost:
		sendFriendRequestHandler(w, r)
	case http.MethodPut:
		updateFriendRequestHandler(w, r)
	default:
		RenderError(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// getFriendsHandler gets user's friends and friend requests
func getFriendsHandler(w http.ResponseWriter, r *http.Request) {
	user := auth.GetUserFromSession(r)
	if user == nil {
		RenderError(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	// Get friends (accepted requests)
	friends, err := getUserFriends(user.ID)
	if err != nil {
		RenderError(w, "Failed to fetch friends", http.StatusInternalServerError)
		return
	}

	// Get pending friend requests (received)
	pendingRequests, err := getPendingFriendRequests(user.ID)
	if err != nil {
		RenderError(w, "Failed to fetch friend requests", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"friends":         friends,
		"pendingRequests": pendingRequests,
	}

	RenderSuccess(w, "Friends data retrieved successfully", response)
}

// sendFriendRequestHandler sends a friend request
func sendFriendRequestHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("👥 Friend request received")

	user := auth.GetUserFromSession(r)
	if user == nil {
		log.Printf("❌ Friend request failed - Authentication required")
		RenderError(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	log.Printf("✅ User authenticated: %s (%s)", user.Nickname, user.ID)

	var req models.FriendRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("❌ Friend request failed - Invalid request body: %v", err)
		RenderError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	log.Printf("📋 Friend request data - From: %s, To: %s", user.ID, req.AddresseeID)

	// Validate input
	if req.AddresseeID == "" {
		log.Printf("❌ Friend request failed - Missing addressee ID")
		RenderError(w, "Addressee ID is required", http.StatusBadRequest)
		return
	}

	if req.AddresseeID == user.ID {
		log.Printf("❌ Friend request failed - Cannot send to self")
		RenderError(w, "Cannot send friend request to yourself", http.StatusBadRequest)
		return
	}

	// Check if addressee exists
	addressee, err := auth.GetUserByID(req.AddresseeID)
	if err != nil || addressee == nil {
		log.Printf("❌ Friend request failed - User not found: %s", req.AddresseeID)
		RenderError(w, "User not found", http.StatusNotFound)
		return
	}

	log.Printf("✅ Addressee found: %s (%s)", addressee.Nickname, addressee.ID)

	// Check if friendship already exists
	exists, err := friendshipExists(user.ID, req.AddresseeID)
	if err != nil {
		log.Printf("❌ Friend request failed - Error checking existing friendship: %v", err)
		RenderError(w, "Failed to check existing friendship", http.StatusInternalServerError)
		return
	}

	if exists {
		log.Printf("❌ Friend request failed - Friendship already exists")
		RenderError(w, "Friendship already exists or request already sent", http.StatusConflict)
		return
	}

	log.Printf("🔄 Creating friend request in database...")

	// Create friend request
	_, err = database.DB.Exec(`
		INSERT INTO friends (requester_id, addressee_id, status, created_at, updated_at)
		VALUES (?, ?, 'pending', ?, ?)
	`, user.ID, req.AddresseeID, time.Now(), time.Now())

	if err != nil {
		log.Printf("❌ Friend request failed - Database error: %v", err)
		RenderError(w, "Failed to send friend request", http.StatusInternalServerError)
		return
	}

	log.Printf("🎉 Friend request sent successfully from %s to %s", user.Nickname, addressee.Nickname)
	RenderSuccess(w, "Friend request sent successfully", nil)
}

// updateFriendRequestHandler accepts or declines a friend request
func updateFriendRequestHandler(w http.ResponseWriter, r *http.Request) {
	user := auth.GetUserFromSession(r)
	if user == nil {
		RenderError(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	var req struct {
		RequesterID string `json:"requesterId"`
		Action      string `json:"action"` // "accept" or "decline"
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RenderError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate input
	if req.RequesterID == "" || (req.Action != "accept" && req.Action != "decline") {
		RenderError(w, "Requester ID and valid action (accept/decline) are required", http.StatusBadRequest)
		return
	}

	// Update friend request status
	status := "declined"
	if req.Action == "accept" {
		status = "accepted"
	}

	result, err := database.DB.Exec(`
		UPDATE friends
		SET status = ?, updated_at = ?
		WHERE requester_id = ? AND addressee_id = ? AND status = 'pending'
	`, status, time.Now(), req.RequesterID, user.ID)

	if err != nil {
		RenderError(w, "Failed to update friend request", http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		RenderError(w, "Friend request not found or already processed", http.StatusNotFound)
		return
	}

	RenderSuccess(w, "Friend request "+req.Action+"ed successfully", nil)
}

// OnlineUsersHandler handles online users listing
func OnlineUsersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RenderError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user := auth.GetUserFromSession(r)
	if user == nil {
		RenderError(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	onlineUsers, err := getOnlineUsers()
	if err != nil {
		log.Printf("❌ OnlineUsersHandler: Error fetching online users: %v", err)
		RenderError(w, "Failed to fetch online users", http.StatusInternalServerError)
		return
	}

	log.Printf("👥 OnlineUsersHandler: Found %d online users for %s", len(onlineUsers), user.Nickname)

	RenderSuccess(w, "Online users retrieved successfully", onlineUsers)
}

// Helper functions for user handlers

// getUserFriends gets all friends for a user
func getUserFriends(userID string) ([]models.Friend, error) {
	rows, err := database.DB.Query(`
		SELECT f.id, f.requester_id, f.addressee_id, f.status, f.created_at, f.updated_at,
		       CASE 
		           WHEN f.requester_id = ? THEN f.addressee_id 
		           ELSE f.requester_id 
		       END as user_id,
		       u.nickname, u.first_name, u.last_name, u.avatar_url
		FROM friends f
		JOIN users u ON (
		    CASE 
		        WHEN f.requester_id = ? THEN f.addressee_id = u.id
		        ELSE f.requester_id = u.id
		    END
		)
		WHERE (f.requester_id = ? OR f.addressee_id = ?) AND f.status = 'accepted'
		ORDER BY u.nickname ASC
	`, userID, userID, userID, userID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var friends []models.Friend
	for rows.Next() {
		var friend models.Friend
		err := rows.Scan(
			&friend.ID, &friend.RequesterID, &friend.AddresseeID, &friend.Status, &friend.CreatedAt, &friend.UpdatedAt,
			&friend.UserID, &friend.Nickname, &friend.FirstName, &friend.LastName, &friend.AvatarURL,
		)
		if err != nil {
			return nil, err
		}
		friends = append(friends, friend)
	}

	return friends, nil
}

// getPendingFriendRequests gets pending friend requests for a user
func getPendingFriendRequests(userID string) ([]models.Friend, error) {
	rows, err := database.DB.Query(`
		SELECT f.id, f.requester_id, f.addressee_id, f.status, f.created_at, f.updated_at,
		       f.requester_id as user_id,
		       u.nickname, u.first_name, u.last_name, u.avatar_url
		FROM friends f
		JOIN users u ON f.requester_id = u.id
		WHERE f.addressee_id = ? AND f.status = 'pending'
		ORDER BY f.created_at DESC
	`, userID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []models.Friend
	for rows.Next() {
		var request models.Friend
		err := rows.Scan(
			&request.ID, &request.RequesterID, &request.AddresseeID, &request.Status, &request.CreatedAt, &request.UpdatedAt,
			&request.UserID, &request.Nickname, &request.FirstName, &request.LastName, &request.AvatarURL,
		)
		if err != nil {
			return nil, err
		}
		requests = append(requests, request)
	}

	return requests, nil
}

// friendshipExists checks if a friendship already exists between two users
func friendshipExists(userID1, userID2 string) (bool, error) {
	var count int
	err := database.DB.QueryRow(`
		SELECT COUNT(*)
		FROM friends
		WHERE (requester_id = ? AND addressee_id = ?) 
		   OR (requester_id = ? AND addressee_id = ?)
	`, userID1, userID2, userID2, userID1).Scan(&count)

	if err != nil {
		return false, err
	}

	return count > 0, nil
}

// getOnlineUsers gets all currently online users
func getOnlineUsers() ([]models.OnlineUser, error) {
	// Get users from the database who have been active recently (group by user_id to avoid duplicates)
	rows, err := database.DB.Query(`
		SELECT ou.user_id, u.nickname, u.first_name, u.last_name, u.avatar_url, MAX(ou.last_seen) as last_seen
		FROM online_users ou
		JOIN users u ON ou.user_id = u.id
		WHERE ou.last_seen > datetime('now', '-5 minutes')
		GROUP BY ou.user_id, u.nickname, u.first_name, u.last_name, u.avatar_url
		ORDER BY u.nickname ASC
	`)

	if err != nil {
		log.Printf("❌ getOnlineUsers: Database query error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var onlineUsers []models.OnlineUser
	for rows.Next() {
		var user models.OnlineUser
		var lastSeenStr string

		err := rows.Scan(
			&user.UserID, &user.Nickname, &user.FirstName, &user.LastName, &user.AvatarURL, &lastSeenStr,
		)
		if err != nil {
			log.Printf("❌ getOnlineUsers: Row scan error: %v", err)
			return nil, err
		}

		// Parse the timestamp string into time.Time
		if lastSeenStr != "" {
			parsedTime, err := time.Parse("2006-01-02T15:04:05Z", lastSeenStr)
			if err != nil {
				// Try alternative format
				parsedTime, err = time.Parse("2006-01-02 15:04:05", lastSeenStr)
				if err != nil {
					log.Printf("⚠️ getOnlineUsers: Could not parse timestamp %s: %v", lastSeenStr, err)
					parsedTime = time.Now() // Use current time as fallback
				}
			}
			user.LastSeen = parsedTime
		} else {
			user.LastSeen = time.Now()
		}

		onlineUsers = append(onlineUsers, user)
	}

	return onlineUsers, nil
}

// AvatarUploadHandler handles avatar file uploads
func AvatarUploadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		RenderError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user := auth.GetUserFromSession(r)
	if user == nil {
		RenderError(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	// Parse multipart form
	err := r.ParseMultipartForm(5 << 20) // 5MB limit
	if err != nil {
		RenderError(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("avatar")
	if err != nil {
		RenderError(w, "No file uploaded", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Validate file type
	contentType := header.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "image/") {
		RenderError(w, "File must be an image", http.StatusBadRequest)
		return
	}

	// Validate file size (5MB limit)
	if header.Size > 5<<20 {
		RenderError(w, "File size must be less than 5MB", http.StatusBadRequest)
		return
	}

	// Get current working directory for debugging
	wd, _ := os.Getwd()
	log.Printf("📂 Current working directory: %s", wd)

	// Create uploads directory if it doesn't exist
	uploadsDir := "frontend/static/uploads/avatars"
	log.Printf("📁 Creating uploads directory: %s", uploadsDir)
	if err := os.MkdirAll(uploadsDir, 0755); err != nil {
		log.Printf("❌ Failed to create upload directory: %v", err)
		RenderError(w, "Failed to create upload directory", http.StatusInternalServerError)
		return
	}

	// Generate unique filename
	ext := filepath.Ext(header.Filename)
	filename := user.ID + "_" + time.Now().Format("20060102_150405") + ext
	filePath := filepath.Join(uploadsDir, filename)
	log.Printf("📄 Saving file to: %s", filePath)

	// Save file
	dst, err := os.Create(filePath)
	if err != nil {
		log.Printf("❌ Failed to create file: %v", err)
		RenderError(w, "Failed to create file", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	_, err = io.Copy(dst, file)
	if err != nil {
		log.Printf("❌ Failed to copy file: %v", err)
		RenderError(w, "Failed to save file", http.StatusInternalServerError)
		return
	}

	// Verify file was created
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		log.Printf("❌ File was not created: %s", filePath)
		RenderError(w, "File was not saved properly", http.StatusInternalServerError)
		return
	}
	log.Printf("✅ File created successfully: %s", filePath)

	// Update user avatar URL in database (use forward slashes for web URLs)
	avatarURL := "/static/uploads/avatars/" + filename
	log.Printf("🔗 Avatar URL: %s", avatarURL)
	_, err = database.DB.Exec(`
		UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?
	`, avatarURL, time.Now(), user.ID)

	if err != nil {
		log.Printf("❌ Failed to update database: %v", err)
		RenderError(w, "Failed to update avatar", http.StatusInternalServerError)
		return
	}

	// Test if file is accessible (optional debug step)
	if _, err := os.Stat(filePath); err == nil {
		log.Printf("✅ File exists and is accessible: %s", filePath)
	} else {
		log.Printf("⚠️ File may not be accessible: %v", err)
	}

	log.Printf("✅ Avatar uploaded successfully for user %s: %s", user.ID, avatarURL)
	RenderSuccess(w, "Avatar uploaded successfully", map[string]string{
		"avatarURL": avatarURL,
	})
}

// AvatarUpdateHandler handles avatar URL updates (for default avatars)
func AvatarUpdateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		RenderError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user := auth.GetUserFromSession(r)
	if user == nil {
		RenderError(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	var req struct {
		AvatarURL string `json:"avatarUrl"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RenderError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate avatar URL (must be a default avatar or uploaded file)
	if req.AvatarURL == "" {
		RenderError(w, "Avatar URL is required", http.StatusBadRequest)
		return
	}

	// Update user avatar URL in database
	_, err := database.DB.Exec(`
		UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?
	`, req.AvatarURL, time.Now(), user.ID)

	if err != nil {
		RenderError(w, "Failed to update avatar", http.StatusInternalServerError)
		return
	}

	// Get updated user data
	updatedUser, err := auth.GetUserByID(user.ID)
	if err != nil {
		RenderError(w, "Failed to retrieve updated user", http.StatusInternalServerError)
		return
	}

	RenderSuccess(w, "Avatar updated successfully", updatedUser)
}
