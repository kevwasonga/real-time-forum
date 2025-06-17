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

/*
============================================================================
FetchRepliessHandler handles fetching replies for a specific comment
*/
func FetchRepliesHandler(w http.ResponseWriter, r *http.Request, commentIdStr string) {

	commentId, err := strconv.Atoi(commentIdStr)
	if err != nil {
		http.Error(w, "Invalid commentId", http.StatusBadRequest)
		fmt.Println("cannot convert the comment id to an int")
		return
	}

	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var session Session
	err = GetDB().QueryRow("SELECT id, user_id, created_at, expires_at FROM sessions WHERE id = ?", cookie.Value).
		Scan(&session.ID, &session.UserID, &session.CreatedAt, &session.ExpiresAt)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if time.Now().After(session.ExpiresAt) {
		_, err = GetDB().Exec("DELETE FROM sessions WHERE id = ?", session.ID)
		if err != nil {
			log.Printf("Error deleting expired session: %v", err)
		}
		http.Error(w, "Session expired", http.StatusUnauthorized)
		return
	}

	query := `
			SELECT r.id, r.comment_id, r.user_id, r.content, r.likes, r.created_at,
				   u.nickname as author_nickname, u.first_name as author_first_name, u.last_name as author_last_name,
				   u.gender as author_gender
			FROM replies r
			JOIN users u ON r.user_id = u.id
		`
	query += " WHERE r.comment_id = ?"
	query += " ORDER BY r.created_at DESC"
	rows, err := GetDB().Query(query, commentId)
	if err != nil {
		log.Printf("Error querying replies: %v", err)
		http.Error(w, "Failed to fetch replies", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var replies []Reply
	for rows.Next() {
		var reply Reply
		err := rows.Scan(
			&reply.ID,
			&reply.CommentID,
			&reply.UserID,
			&reply.Content,
			&reply.Likes,
			&reply.CreatedAt,
			&reply.AuthorNickname,
			&reply.AuthorFirstName,
			&reply.AuthorLastName,
			&reply.AuthorGender,
		)
		if err != nil {
			log.Printf("Error scanning comments: %v", err)
			continue
		}

		reply.AuthorNickname = ConfirmAuthorName2(w, r, reply)
		replies = append(replies, reply)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(replies)
}

/*
============================================
This function will confirm the logged in user versave
the author of the reply, and modify to "You" if
they are the same, or else, the name of the author is
displayed
*/
func ConfirmAuthorName2(w http.ResponseWriter, r *http.Request, c Reply) string {
	cookie, _ := r.Cookie("session_id")

	var current_logged_in_user_id string
	err := GetDB().QueryRow(`
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
		err := GetDB().QueryRow(`
		SELECT nickname 
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

func LikeReplyHandler(w http.ResponseWriter, r *http.Request, replyIdStr string) {

	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Verify session exists in database
	var session Session
	err = GetDB().QueryRow("SELECT id, user_id, created_at, expires_at FROM sessions WHERE id = ?", cookie.Value).
		Scan(&session.ID, &session.UserID, &session.CreatedAt, &session.ExpiresAt)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Check if session is expired
	if time.Now().After(session.ExpiresAt) {
		// Delete expired session
		_, err = GetDB().Exec("DELETE FROM sessions WHERE id = ?", session.ID)
		if err != nil {
			log.Printf("Error deleting expired session: %v", err)
		}
		http.Error(w, "Session expired", http.StatusUnauthorized)
		return
	}

	replyId, err := strconv.Atoi(replyIdStr) // strconv.Atoi(vars["commentId"])
	if err != nil {
		http.Error(w, "Invalid comment ID", http.StatusBadRequest)
		return
	}

	var userId string
	err = GetDB().QueryRow(`
    SELECT user_id 
    FROM sessions 
    WHERE id = ?`, cookie.Value).Scan(&userId)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "User not found", http.StatusNotFound)
			fmt.Println("User not found for userID:", cookie.Value)
		} else {
			http.Error(w, "Failed to fetch user id", http.StatusInternalServerError)
			fmt.Println("Error querying user id:", err)
		}
		return
	}

	found, eRr := checkUserLikedReply(replyId, userId)
	if found {
		err = rmvRwFrmTb("replies_likes", replyId, userId)
		if err != nil {
			http.Error(w, "Failed to unlike reply", http.StatusInternalServerError)
			return
		}
	} else {
		err = incrementReplyLikes(replyId, userId)
		if err != nil {
			http.Error(w, "Failed to like reply", http.StatusInternalServerError)
			return
		}
	}
	if eRr != nil {
		http.Error(w, "Failed to unlike reply", http.StatusInternalServerError)
		return
	}

	likes, err := getReplyLikes(replyId)
	if err != nil {
		http.Error(w, "Failed to retrieve like count", http.StatusInternalServerError)
		return
	}

	// Respond with the updated like count
	response := map[string]interface{}{
		"replyId": replyId,
		"likes":   likes,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// function to check whether the user had liked a reply
func checkUserLikedReply(replyId int, userID string) (bool, error) {
	query := `SELECT COUNT(*) FROM replies_likes WHERE reply_id = ? AND user_id = ?`
	var count int

	err := GetDatabaseConnection().QueryRow(query, replyId, userID).Scan(&count)
	if err != nil {
		return false, err
	}

	if count > 0 {
		return true, nil
	}
	return false, nil
}

func rmvRwFrmTb(tableName string, replyId int, userID string) error {
	query := fmt.Sprintf("DELETE FROM %s WHERE reply_id = ? AND user_id = ?", tableName)

	_, err := GetDatabaseConnection().Exec(query, replyId, userID)
	if err != nil {
		return fmt.Errorf("failed to remove row from table %s: %v", tableName, err)
	}

	return nil
}

func incrementReplyLikes(replyId int, userID string) error {

	tx, err := GetDatabaseConnection().Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %v", err)
	}

	query := `UPDATE replies SET likes = likes + 1 WHERE id = ?`
	_, err = tx.Exec(query, replyId)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to increment likes: %v", err)
	}

	query = `INSERT INTO replies_likes (reply_id, user_id) VALUES (?, ?)`
	_, err = tx.Exec(query, replyId, userID)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to add row to replies_likes table: %v", err)
	}

	err = tx.Commit()
	if err != nil {
		return fmt.Errorf("failed to commit transaction: %v", err)
	}
	return nil
}

// getPostLikes retrieves the current like count for a post from the database
func getReplyLikes(replyId int) (int, error) {
	var likes int
	query := `SELECT likes FROM replies WHERE id = ?`
	err := GetDatabaseConnection().QueryRow(query, replyId).Scan(&likes)
	return likes, err
}

/*
=====================================================================================
This function will approve a comment and post the comments into the database.
If the posting of the comment is successful, the function returns a successful reasponse,
else returns an error response
*/
func CreateReplyHandler(w http.ResponseWriter, r *http.Request, commentIdStr string) {

	commentId, err := strconv.Atoi(commentIdStr)
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
		fmt.Println("Error decoding reply content: ", err)
		return
	}

	if strings.TrimSpace(requestBody.Content) == "" {
		http.Error(w, "Reply content cannot be empty", http.StatusBadRequest)
		return
	}

	var id, authorNickname string
	err = GetDB().QueryRow(`
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
	err = GetDB().QueryRow(`
    SELECT nickname 
    FROM users 
    WHERE id = ?`, id).Scan(&authorNickname)
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

	newReply := Reply{
		CommentID:      commentId,
		UserID:         id,
		Content:        html.EscapeString(requestBody.Content),
		CreatedAt:      time.Now(),
		AuthorNickname: authorNickname,
	}

	_, err = GetDB().Exec(`
	INSERT INTO replies (comment_id, user_id, content, created_at) 
	VALUES (?, ?, ?, ?)`,
		newReply.CommentID, newReply.UserID, newReply.Content, newReply.CreatedAt)
	if err != nil {
		log.Printf("Error creating reply: %v", err)
		http.Error(w, "Error creating reply", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(newReply)

}
