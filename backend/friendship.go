package backend

import (
	"encoding/json"
	"fmt"
	"net/http"
)

func SendFriendRequest(w http.ResponseWriter, r *http.Request) {
	var f Friendship
	if err := json.NewDecoder(r.Body).Decode(&f); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Prevent duplicate requests
	var exists bool
	err := GetDatabaseConnection().QueryRow(`SELECT EXISTS(
        SELECT 1 FROM friendships
        WHERE requester_id=$1 AND addressee_id=$2
    )`, f.RequesterID, f.AddresseeID).Scan(&exists)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if exists {
		http.Error(w, "Friend request already sent", http.StatusConflict)
		return
	}

	// Insert new friend request
	_, err = GetDatabaseConnection().Exec(`INSERT INTO friendships (requester_id, addressee_id, status)
        VALUES ($1, $2, 'pending')`, f.RequesterID, f.AddresseeID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func AcceptFriendRequest(w http.ResponseWriter, r *http.Request) {
	var f Friendship
	if err := json.NewDecoder(r.Body).Decode(&f); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Update the existing request to 'accepted'
	res, err := GetDatabaseConnection().Exec(`UPDATE friendships
        SET status='accepted'
        WHERE requester_id=$1 AND addressee_id=$2 AND status='pending'`,
		f.RequesterID, f.AddresseeID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if rowsAffected == 0 {
		http.Error(w, "No pending friend request found", http.StatusNotFound)
		return
	}

	// Optionally, insert reciprocal friendship
	_, err = GetDatabaseConnection().Exec(`INSERT INTO friendships (requester_id, addressee_id, status)
        VALUES ($1, $2, 'accepted')`, f.AddresseeID, f.RequesterID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// The function handler deletes the friendship between two users. By removing the frieds-tag. Future improvements.
// It is not a good practice to delete the friendship from the database, but it is done in this example.
func RemoveFriend(w http.ResponseWriter, r *http.Request) {
	var f Friendship
	if err := json.NewDecoder(r.Body).Decode(&f); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Delete both directions of the friendship
	_, err := GetDatabaseConnection().Exec(`DELETE FROM friendships
        WHERE (requester_id=$1 AND addressee_id=$2)
           OR (requester_id=$2 AND addressee_id=$1)`,
		f.RequesterID, f.AddresseeID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// FetchOnlineUsers retrieves all online users from the database.
func FetchOnlineUsers(w http.ResponseWriter, r *http.Request) {

	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	rows, err := GetDatabaseConnection().Query("SELECT id, username, gender FROM users WHERE id IN (SELECT user_id FROM sessions)")
	if err != nil {
		fmt.Println("Error fetching online users:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users []User
	current_user_id, _ := getCurrentUserID(r)
	for rows.Next() {
		var user User
		if err := rows.Scan(&user.ID, &user.Nickname, &user.Gender); err != nil {
			fmt.Println("Error scanning user:", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if user.ID != current_user_id {
			users = append(users, user)
		}

	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(users)
}
