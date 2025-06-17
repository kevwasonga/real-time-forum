package backend

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"
)

// UserProfileHandler handles requests to get the current user's profile
func UserProfileHandler(w http.ResponseWriter, r *http.Request) {
	// Check for session cookie
	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "Not authenticated", http.StatusUnauthorized)
		return
	}

	// Verify session exists in database
	var session Session
	err = GetDB().QueryRow("SELECT id, user_id, created_at, expires_at FROM sessions WHERE id = ?", cookie.Value).
		Scan(&session.ID, &session.UserID, &session.CreatedAt, &session.ExpiresAt)
	if err != nil {
		http.Error(w, "Invalid session", http.StatusUnauthorized)
		return
	}

	// Check if session is expired
	if time.Now().After(session.ExpiresAt) {
		http.Error(w, "Session expired", http.StatusUnauthorized)
		return
	}

	// Get user data from database
	var user User
	err = GetDB().QueryRow("SELECT id, nickname, first_name, last_name, age, gender, email FROM users WHERE id = ?", session.UserID).
		Scan(&user.ID, &user.Nickname, &user.FirstName, &user.LastName, &user.Age, &user.Gender, &user.Email)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Return user data as JSON
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

// UpdateUserProfileHandler handles requests to update the current user's profile
func UpdateUserProfileHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Check for session cookie
	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "Not authenticated", http.StatusUnauthorized)
		return
	}

	// Verify session exists in database
	var session Session
	err = GetDB().QueryRow("SELECT id, user_id, created_at, expires_at FROM sessions WHERE id = ?", cookie.Value).
		Scan(&session.ID, &session.UserID, &session.CreatedAt, &session.ExpiresAt)
	if err != nil {
		http.Error(w, "Invalid session", http.StatusUnauthorized)
		return
	}

	// Check if session is expired
	if time.Now().After(session.ExpiresAt) {
		http.Error(w, "Session expired", http.StatusUnauthorized)
		return
	}

	// Parse request body
	var req struct {
		Nickname  *string `json:"nickname"`
		FirstName *string `json:"firstName"`
		LastName  *string `json:"lastName"`
		Age       *int    `json:"age"`
		Gender    *string `json:"gender"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request format: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Get current user data
	var currentUser User
	err = GetDB().QueryRow("SELECT nickname, first_name, last_name, age, gender FROM users WHERE id = ?", session.UserID).
		Scan(&currentUser.Nickname, &currentUser.FirstName, &currentUser.LastName, &currentUser.Age, &currentUser.Gender)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Prepare update query
	query := "UPDATE users SET "
	var args []interface{}
	var updates []string

	if req.Nickname != nil {
		updates = append(updates, "nickname = ?")
		args = append(args, *req.Nickname)
	}
	if req.FirstName != nil {
		updates = append(updates, "first_name = ?")
		args = append(args, *req.FirstName)
	}
	if req.LastName != nil {
		updates = append(updates, "last_name = ?")
		args = append(args, *req.LastName)
	}
	if req.Age != nil {
		if *req.Age < 13 {
			http.Error(w, "Age must be at least 13", http.StatusBadRequest)
			return
		}
		updates = append(updates, "age = ?")
		args = append(args, *req.Age)
	}
	if req.Gender != nil {
		updates = append(updates, "gender = ?")
		args = append(args, *req.Gender)
	}

	// If no fields to update, return early
	if len(updates) == 0 {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "No fields to update"})
		return
	}

	// Add WHERE clause
	query += strings.Join(updates, ", ") + " WHERE id = ?"
	args = append(args, session.UserID)

	// Execute update
	_, err = GetDB().Exec(query, args...)
	if err != nil {
		log.Printf("Error updating user profile: %v", err)
		http.Error(w, "Error updating user profile: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Profile updated successfully"})
}

// DeleteUserAccountHandler handles requests to delete the current user's account
func DeleteUserAccountHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Check for session cookie
	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "Not authenticated", http.StatusUnauthorized)
		return
	}

	// Verify session exists in database
	var session Session
	err = GetDB().QueryRow("SELECT id, user_id, created_at, expires_at FROM sessions WHERE id = ?", cookie.Value).
		Scan(&session.ID, &session.UserID, &session.CreatedAt, &session.ExpiresAt)
	if err != nil {
		http.Error(w, "Invalid session", http.StatusUnauthorized)
		return
	}

	// Check if session is expired
	if time.Now().After(session.ExpiresAt) {
		http.Error(w, "Session expired", http.StatusUnauthorized)
		return
	}

	// Begin transaction
	tx, err := GetDB().Begin()
	if err != nil {
		http.Error(w, "Error starting transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Delete user's posts
	_, err = tx.Exec("DELETE FROM posts WHERE user_id = ?", session.UserID)
	if err != nil {
		http.Error(w, "Error deleting user's posts", http.StatusInternalServerError)
		return
	}

	// Delete user's comments
	_, err = tx.Exec("DELETE FROM comments WHERE user_id = ?", session.UserID)
	if err != nil {
		http.Error(w, "Error deleting user's comments", http.StatusInternalServerError)
		return
	}

	// Delete user's sessions
	_, err = tx.Exec("DELETE FROM sessions WHERE user_id = ?", session.UserID)
	if err != nil {
		http.Error(w, "Error deleting user's sessions", http.StatusInternalServerError)
		return
	}

	// Delete user's account
	_, err = tx.Exec("DELETE FROM users WHERE id = ?", session.UserID)
	if err != nil {
		http.Error(w, "Error deleting user account", http.StatusInternalServerError)
		return
	}

	// Commit transaction
	err = tx.Commit()
	if err != nil {
		http.Error(w, "Error committing transaction", http.StatusInternalServerError)
		return
	}

	// Clear session cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		Path:     "/",
		HttpOnly: true,
	})

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Account deleted successfully"})
}
