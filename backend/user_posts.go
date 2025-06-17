package backend

import (
	"encoding/json"
	"net/http"
)

// GetUserPosts handles fetching posts created by a specific user
func GetUserPosts(w http.ResponseWriter, r *http.Request) {
	// Get user ID from session
	userID := GetUserIDFromSession(r)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Query posts from database
	rows, err := GetDatabaseConnection().Query(`
		SELECT p.id, p.title, p.content, p.category, p.created_at, p.user_id,
			   u.nickname as author_nickname, u.first_name as author_first_name, 
			   u.last_name as author_last_name, u.gender as author_gender,
			   (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
			   p.likes
		FROM posts p
		JOIN users u ON p.user_id = u.id
		WHERE p.user_id = ?
		ORDER BY p.created_at DESC
	`, userID)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var posts []Post
	for rows.Next() {
		var post Post
		err := rows.Scan(
			&post.ID,
			&post.Title,
			&post.Content,
			&post.Category,
			&post.CreatedAt,
			&post.UserID,
			&post.AuthorNickname,
			&post.AuthorFirstName,
			&post.AuthorLastName,
			&post.AuthorGender,
			&post.CommentCount,
			&post.Likes,
		)
		if err != nil {
			http.Error(w, "Error scanning posts", http.StatusInternalServerError)
			return
		}
		posts = append(posts, post)
	}

	// Return posts as JSON
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
}

// GetUserIDFromSession is a helper function to get user ID from session
func GetUserIDFromSession(r *http.Request) string {
	// Get session from cookie
	cookie, err := r.Cookie("session_id")
	if err != nil {
		return ""
	}

	// Get user ID from session
	var userID string
	err = GetDatabaseConnection().QueryRow("SELECT user_id FROM sessions WHERE id = ?", cookie.Value).Scan(&userID)
	if err != nil {
		return ""
	}

	return userID
}
