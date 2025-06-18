package handlers

import (
	"encoding/json"
	"net/http"
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
	user := auth.GetUserFromSession(r)
	if user == nil {
		RenderError(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	var req models.FriendRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RenderError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate input
	if req.AddresseeID == "" {
		RenderError(w, "Addressee ID is required", http.StatusBadRequest)
		return
	}

	if req.AddresseeID == user.ID {
		RenderError(w, "Cannot send friend request to yourself", http.StatusBadRequest)
		return
	}

	// Check if addressee exists
	addressee, err := auth.GetUserByID(req.AddresseeID)
	if err != nil || addressee == nil {
		RenderError(w, "User not found", http.StatusNotFound)
		return
	}

	// Check if friendship already exists
	exists, err := friendshipExists(user.ID, req.AddresseeID)
	if err != nil {
		RenderError(w, "Failed to check existing friendship", http.StatusInternalServerError)
		return
	}

	if exists {
		RenderError(w, "Friendship already exists or request already sent", http.StatusConflict)
		return
	}

	// Create friend request
	_, err = database.DB.Exec(`
		INSERT INTO friends (requester_id, addressee_id, status, created_at, updated_at)
		VALUES (?, ?, 'pending', ?, ?)
	`, user.ID, req.AddresseeID, time.Now(), time.Now())

	if err != nil {
		RenderError(w, "Failed to send friend request", http.StatusInternalServerError)
		return
	}

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
		RenderError(w, "Failed to fetch online users", http.StatusInternalServerError)
		return
	}

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
	// This would typically integrate with the WebSocket hub
	// For now, return users who have been active recently
	rows, err := database.DB.Query(`
		SELECT ou.user_id, u.nickname, u.first_name, u.last_name, u.avatar_url, ou.last_seen
		FROM online_users ou
		JOIN users u ON ou.user_id = u.id
		WHERE ou.last_seen > datetime('now', '-5 minutes')
		ORDER BY u.nickname ASC
	`)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var onlineUsers []models.OnlineUser
	for rows.Next() {
		var user models.OnlineUser
		err := rows.Scan(
			&user.UserID, &user.Nickname, &user.FirstName, &user.LastName, &user.AvatarURL, &user.LastSeen,
		)
		if err != nil {
			return nil, err
		}
		onlineUsers = append(onlineUsers, user)
	}

	return onlineUsers, nil
}
