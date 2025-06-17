package backend

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"html"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// FetchCommentsHandler orchestrates the retrieval of all comments for a specific discussion.
// This function serves as the primary interface for accessing the comment system,
// providing comprehensive comment data including author information, engagement metrics,
// and hierarchical reply structures.
//
// The handler performs several key operations:
// - Validates the discussion ID parameter
// - Authenticates the requesting user through session validation
// - Retrieves all comments with author details in a single optimized query
// - Structures the response for efficient frontend consumption
// - Handles error cases gracefully with appropriate HTTP status codes
//
// This approach ensures that the frontend receives all necessary comment data
// in a single request, reducing the number of API calls and improving performance.
func FetchCommentsHandler(w http.ResponseWriter, r *http.Request, postIDStr string) {
	// Validate and convert the post ID parameter to ensure we're working with valid data
	// This early validation prevents unnecessary database queries with invalid parameters
	postId, err := strconv.Atoi(postIDStr)
	if err != nil {
		http.Error(w, "Invalid postId", http.StatusBadRequest)
		fmt.Println("cannot convert the post id to an int")
		return
	}

	// Authenticate the user making the request
	// Comments are only accessible to authenticated users to maintain community standards
	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Validate session integrity and ensure it's not expired
	// This prevents unauthorized access through stale or invalid sessions
	var session Session
	err = GetDatabaseConnection().QueryRow("SELECT id, user_id, created_at, expires_at FROM sessions WHERE id = ?", cookie.Value).
		Scan(&session.ID, &session.UserID, &session.CreatedAt, &session.ExpiresAt)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Enforce session expiration for security compliance
	if time.Now().After(session.ExpiresAt) {
		// Clean up expired session from database
		_, err = GetDatabaseConnection().Exec("DELETE FROM sessions WHERE id = ?", session.ID)
		if err != nil {
			log.Printf("Error deleting expired session: %v", err)
		}
		http.Error(w, "Session expired", http.StatusUnauthorized)
		return
	}

	// Execute optimized query to retrieve all comments with author information
	// This single JOIN query is more efficient than multiple separate queries
	// and ensures we get all necessary data for the frontend in one database call
	rows, err := GetDatabaseConnection().Query(`
		SELECT c.id, c.post_id, c.user_id, c.content, c.reply_count, c.likes, c.created_at,
			   u.username as author_nickname, u.first_name as author_first_name, u.last_name as author_last_name,
			   u.gender as author_gender
		FROM comments c
		JOIN users u ON c.user_id = u.id
		WHERE c.post_id = ?
		ORDER BY c.created_at DESC`, postId)
	if err != nil {
		log.Printf("Error querying comments: %v", err)
		http.Error(w, "Failed to fetch comments", http.StatusInternalServerError)
		return
	}
	defer rows.Close() // Ensure proper resource cleanup

	// Build our comment collection by iterating through database results
	var comments []Comment
	for rows.Next() {
		var comment Comment
		// Map database columns to our Comment struct fields
		// This scanning approach ensures type safety and proper data handling
		err := rows.Scan(
			&comment.ID,
			&comment.PostID,
			&comment.UserID,
			&comment.Content,
			&comment.ReplyCount,
			&comment.Likes,
			&comment.CreatedAt,
			&comment.AuthorNickname,
			&comment.AuthorFirstName,
			&comment.AuthorLastName,
			&comment.AuthorGender,
		)
		if err != nil {
			// Log the error but continue processing other comments
			// This ensures partial failures don't break the entire response
			log.Printf("Error scanning comments: %v", err)
			continue
		}

		// Personalize the author display name for better user experience
		// This shows "You" for the current user's comments
		comment.AuthorNickname = ConfirmAuthorName(w, r, comment)
		comments = append(comments, comment)
	}

	// Send the collected comments back to the client as JSON
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(comments)
}

/*
============================================
This function will confirm the logged in user versave
the author of the comment, and modify to "You" if
they are the same, or else, the name of the author is
displayed
*/
func ConfirmAuthorName(w http.ResponseWriter, r *http.Request, c Comment) string {
	cookie, _ := r.Cookie("session_id")

	var current_logged_in_user_id string
	err := GetDatabaseConnection().QueryRow(`
    SELECT user_id
    FROM sessions
    WHERE id = ?`, cookie.Value).Scan(&current_logged_in_user_id)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "User not found", http.StatusNotFound)
			fmt.Println("User not found for userID:", cookie.Value)
		} else {
			http.Error(w, "Failed to fetch user nickname", http.StatusInternalServerError)
			fmt.Println("Error querying user nickname:", err)
		}
		return c.AuthorNickname
	}

	if c.UserID == current_logged_in_user_id {
		c.AuthorNickname = "You"
	} else {
		err := GetDatabaseConnection().QueryRow(`
		SELECT username
		FROM users
		WHERE id = ?`, c.UserID).Scan(&c.AuthorNickname)
		if err != nil {
			if err == sql.ErrNoRows {
				http.Error(w, "User not found", http.StatusNotFound)
				fmt.Println("User not found for userID:", c.UserID)
			} else {
				http.Error(w, "Failed to fetch user nickname", http.StatusInternalServerError)
				fmt.Println("Error querying user nickname:", err)
			}
			return c.AuthorNickname
		}
	}
	return c.AuthorNickname
}

func LikeCommentHandler(w http.ResponseWriter, r *http.Request, commentIdStr string) {

	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Verify session exists in database
	var session Session
	err = GetDatabaseConnection().QueryRow("SELECT id, user_id, created_at, expires_at FROM sessions WHERE id = ?", cookie.Value).
		Scan(&session.ID, &session.UserID, &session.CreatedAt, &session.ExpiresAt)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if time.Now().After(session.ExpiresAt) {
		_, err = GetDatabaseConnection().Exec("DELETE FROM sessions WHERE id = ?", session.ID)
		if err != nil {
			log.Printf("Error deleting expired session: %v", err)
		}
		http.Error(w, "Session expired", http.StatusUnauthorized)
		return
	}

	commentId, err := strconv.Atoi(commentIdStr)
	if err != nil {
		http.Error(w, "Invalid comment ID", http.StatusBadRequest)
		return
	}

	var current_logged_in_userId string
	err = GetDatabaseConnection().QueryRow(`
    SELECT user_id
    FROM sessions
    WHERE id = ?`, cookie.Value).Scan(&current_logged_in_userId)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "User not found", http.StatusNotFound)
			fmt.Println("User not found for current_logged_in_userID:", cookie.Value)
		} else {
			http.Error(w, "Failed to fetch user id", http.StatusInternalServerError)
			fmt.Println("Error querying user id:", err)
		}
		return
	}

	found, _ := checkUserLikedComment(commentId, current_logged_in_userId)
	if found {
		err = RmvRwFrmTb("comments_likes", commentId, current_logged_in_userId)
		if err != nil {
			http.Error(w, "Failed to unlike comment", http.StatusInternalServerError)
			return
		}
	} else {
		err = incrementCommentLikes(commentId, current_logged_in_userId)
		if err != nil {
			http.Error(w, "Failed to like comment", http.StatusInternalServerError)
			return
		}
	}

	likes, err := getCommentLikes(commentId)
	if err != nil {
		http.Error(w, "Failed to retrieve like count", http.StatusInternalServerError)
		return
	}

	// Respond with the updated like count
	response := map[string]interface{}{
		"commentId": commentId,
		"likes":     likes,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// function to check whether the user had liked a comment
func checkUserLikedComment(commentID int, userID string) (bool, error) {
	query := `SELECT COUNT(*) FROM comments_likes WHERE comment_id = ? AND user_id = ?`
	var count int

	err := GetDatabaseConnection().QueryRow(query, commentID, userID).Scan(&count)
	if err != nil {
		return false, err
	}

	if count > 0 {
		return true, nil
	}
	return false, nil
}

func RmvRwFrmTb(tableName string, commentId int, userID string) error {
	query := fmt.Sprintf("DELETE FROM %s WHERE comment_id = ? AND user_id = ?", tableName)

	_, err := GetDatabaseConnection().Exec(query, commentId, userID)
	if err != nil {
		return fmt.Errorf("failed to remove row from table %s: %v", tableName, err)
	}

	return nil
}

func incrementCommentLikes(commentId int, userID string) error {

	tx, err := GetDatabaseConnection().Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %v", err)
	}

	query := `UPDATE comments SET likes = likes + 1 WHERE id = ?`
	_, err = tx.Exec(query, commentId)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to increment likes: %v", err)
	}

	query = `INSERT INTO comments_likes (comment_id, user_id) VALUES (?, ?)`
	_, err = tx.Exec(query, commentId, userID)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to add row to comments_likes table: %v", err)
	}

	err = tx.Commit()
	if err != nil {
		return fmt.Errorf("failed to commit transaction: %v", err)
	}
	return nil
}

// getCommentLikes retrieves the current like count for a comemnt from the database
func getCommentLikes(commentId int) (int, error) {
	var likes int
	query := `SELECT likes FROM comments WHERE id = ?`
	err := GetDatabaseConnection().QueryRow(query, commentId).Scan(&likes)
	return likes, err
}

/*
=====================================================================================
This function will approve a comment and post the comments into the database.
If the posting of the comment is successful, the function returns a successful reasponse,
else returns an error response
*/
func CreateCommentHandler(w http.ResponseWriter, r *http.Request, postIDStr string) {

	postId, err := strconv.Atoi(postIDStr)
	if err != nil {
		http.Error(w, "Invalid postId", http.StatusBadRequest)
		fmt.Println("cannot convert the post id to an int")
		return
	}

	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userID := cookie.Value

	var requestBody struct {
		Content string `json:"content"`
	}

	if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		fmt.Println("Error decoding comment content: ", err)
		return
	}

	if strings.TrimSpace(requestBody.Content) == "" {
		http.Error(w, "Comment content cannot be empty", http.StatusBadRequest)
		return
	}

	var id, authorNickname, authorGender, authorFirstName, authorLastName string
	err = GetDatabaseConnection().QueryRow(`
		SELECT user_id
		FROM sessions
		WHERE id = ?`, userID).Scan(&id)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "User not found", http.StatusNotFound)
			fmt.Println("User not found for userID:", userID)
		} else {
			http.Error(w, "Failed to fetch user nickname", http.StatusInternalServerError)
			fmt.Println("Error querying user nickname:", err)
		}
		return
	}
	err = GetDatabaseConnection().QueryRow(`
		SELECT username, gender, first_name, last_name
		FROM users
		WHERE id = ?`, id).Scan(&authorNickname, &authorGender, &authorFirstName, &authorLastName)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "User not found", http.StatusNotFound)
			fmt.Println("User not found for userID:", userID)
		} else {
			http.Error(w, "Failed to fetch user details", http.StatusInternalServerError)
			fmt.Println("Error querying user details:", err)
		}
		return
	}

	newComment := Comment{
		PostID:          postId,
		Content:         html.EscapeString(requestBody.Content),
		CreatedAt:       time.Now(),
		UserID:          id,
		AuthorNickname:  authorNickname,
		AuthorGender:    authorGender,
		AuthorFirstName: authorFirstName,
		AuthorLastName:  authorLastName,
	}

	var post_userId string
	err = GetDatabaseConnection().QueryRow(`
		SELECT user_id
		FROM posts
		WHERE id = ?`, postId).Scan(&post_userId)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "User not found", http.StatusNotFound)
			fmt.Println("User not found for userID:", userID)
		} else {
			http.Error(w, "Failed to fetch user nickname", http.StatusInternalServerError)
			fmt.Println("Error querying user nickname:", err)
		}
		return
	}
	if post_userId == id {
		newComment.AuthorNickname = "You"
	} else {
		newComment.AuthorNickname = authorNickname
	}

	_, err = GetDatabaseConnection().Exec(`
		INSERT INTO comments (post_id, user_id, content, created_at)
		VALUES (?, ?, ?, ?)`,
		newComment.PostID, newComment.UserID, newComment.Content, newComment.CreatedAt)
	if err != nil {
		log.Printf("Error creating comment: %v", err)
		http.Error(w, "Error creating comment", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(newComment)

}
