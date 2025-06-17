package backend

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"
)

// ManageForumDiscussions serves as the central hub for all forum discussion operations.
// This function handles both retrieving existing discussions and creating new ones,
// providing a comprehensive interface for community interaction.
//
// GET requests return a list of discussions, optionally filtered by category.
// POST requests create new discussions with proper validation and user authentication.
//
// The function ensures all operations are performed by authenticated users and
// maintains data integrity through proper session validation.
func ManageForumDiscussions(w http.ResponseWriter, r *http.Request) {
	// Verify user authentication through session cookie
	// This is our first line of defense against unauthorized access
	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Validate session existence and integrity in our database
	// We need to ensure the session is not only present but also valid and not expired
	var session Session
	err = GetDatabaseConnection().QueryRow("SELECT id, user_id, created_at, expires_at FROM sessions WHERE id = ?", cookie.Value).
		Scan(&session.ID, &session.UserID, &session.CreatedAt, &session.ExpiresAt)
	if err != nil {
		// Session doesn't exist in database - possible tampering or cleanup
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Enforce session expiration for security
	// Expired sessions are automatically cleaned up to maintain database hygiene
	if time.Now().After(session.ExpiresAt) {
		// Proactively remove expired session from database
		_, err = GetDatabaseConnection().Exec("DELETE FROM sessions WHERE id = ?", session.ID)
		if err != nil {
			log.Printf("Error deleting expired session: %v", err)
		}
		http.Error(w, "Session expired", http.StatusUnauthorized)
		return
	}

	// Route request based on HTTP method for appropriate handling
	// This design pattern allows a single endpoint to handle multiple operations
	if r.Method == http.MethodGet {
		// === DISCUSSION RETRIEVAL LOGIC ===
		// Extract category filter from query parameters for targeted content delivery
		category := r.URL.Query().Get("category")

		// Construct dynamic SQL query with proper JOIN for author information
		// This approach ensures we get all necessary data in a single database call
		query := `
			SELECT p.id, p.title, p.content, p.likes, p.comment_count, p.category, p.created_at, p.user_id,
				   u.username as author_nickname, u.first_name as author_first_name, u.last_name as author_last_name,
				   u.gender as author_gender
			FROM posts p
			JOIN users u ON p.user_id = u.id
		`
		// Apply category filtering if specified (excluding 'all' which means no filter)
		if category != "" && category != "all" {
			query += " WHERE p.category = ?"
		}
		// Order by creation date to show newest discussions first
		query += " ORDER BY p.created_at DESC"

		// Execute the constructed query with appropriate parameters
		// This conditional execution ensures we only pass parameters when needed
		var rows *sql.Rows
		if category != "" && category != "all" {
			rows, err = GetDatabaseConnection().Query(query, category)
		} else {
			rows, err = GetDatabaseConnection().Query(query)
		}
		if err != nil {
			log.Printf("Error querying posts: %v", err)
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}
		defer rows.Close() // Ensure proper resource cleanup

		// Build our response collection by iterating through database results
		var posts []Post
		for rows.Next() {
			var post Post
			// Map database columns to our Post struct fields
			// This scanning approach ensures type safety and proper data handling
			err := rows.Scan(
				&post.ID,
				&post.Title,
				&post.Content,
				&post.Likes,
				&post.CommentCount,
				&post.Category,
				&post.CreatedAt,
				&post.UserID,
				&post.AuthorNickname,
				&post.AuthorFirstName,
				&post.AuthorLastName,
				&post.AuthorGender,
			)
			if err != nil {
				// Log the error but continue processing other posts
				// This ensures partial failures don't break the entire response
				log.Printf("Error scanning post: %v", err)
				continue
			}
			posts = append(posts, post)
		}

		// Send the collected discussions back to the client as JSON
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(posts)
	} else if r.Method == http.MethodPost {
		// === DISCUSSION CREATION LOGIC ===
		// Parse and validate the incoming discussion data from the client
		var postData struct {
			Title    string `json:"title"`
			Content  string `json:"content"`
			Category string `json:"category"`
		}

		if err := json.NewDecoder(r.Body).Decode(&postData); err != nil {
			http.Error(w, "Invalid request format", http.StatusBadRequest)
			return
		}

		// Enforce business rules: all fields must be provided for a valid discussion
		// This prevents incomplete or malformed discussions from being created
		if postData.Title == "" || postData.Content == "" || postData.Category == "" {
			http.Error(w, "Title, content, and category are required", http.StatusBadRequest)
			return
		}

		// Create the new discussion in our database
		// We associate it with the authenticated user and timestamp it for proper ordering
		result, err := GetDatabaseConnection().Exec(`
			INSERT INTO posts (user_id, title, content, category, created_at)
			VALUES (?, ?, ?, ?, ?)`,
			session.UserID, postData.Title, postData.Content, postData.Category, time.Now())
		if err != nil {
			log.Printf("Error creating post: %v", err)
			http.Error(w, "Error creating post", http.StatusInternalServerError)
			return
		}

		// Retrieve the auto-generated ID for the new discussion
		// This ID will be used to fetch the complete discussion data
		postID, err := result.LastInsertId()
		if err != nil {
			log.Printf("Error getting post ID: %v", err)
			http.Error(w, "Error creating post", http.StatusInternalServerError)
			return
		}

		// Fetch the complete discussion data including author information
		// This ensures the client receives all necessary data for immediate display
		var post Post
		err = GetDatabaseConnection().QueryRow(`
			SELECT p.id, p.title, p.content, p.category, p.created_at, p.user_id,
				   u.username as author_nickname, u.first_name as author_first_name, u.last_name as author_last_name,
				   u.gender as author_gender
			FROM posts p
			JOIN users u ON p.user_id = u.id
			WHERE p.id = ?`,
			postID).
			Scan(&post.ID, &post.Title, &post.Content, &post.Category, &post.CreatedAt, &post.UserID,
				&post.AuthorNickname, &post.AuthorFirstName, &post.AuthorLastName, &post.AuthorGender)
		if err != nil {
			log.Printf("Error retrieving created post: %v", err)
			http.Error(w, "Error creating post", http.StatusInternalServerError)
			return
		}

		// Send the newly created discussion back to the client
		// The 201 status code indicates successful resource creation
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(post)
	} else {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// ProcessPostEngagementToggle manages the like/unlike functionality for forum discussions.
// This function implements a toggle mechanism where users can like or unlike posts,
// with proper validation to ensure users can only like posts once and can remove their likes.
//
// The function handles:
// - User authentication and session validation
// - Post existence verification
// - Duplicate like prevention
// - Like/unlike toggle logic
// - Real-time like count updates
// - Database transaction safety
func ProcessPostEngagementToggle(w http.ResponseWriter, r *http.Request, postIdStr string) {
	// Note: This function could be enhanced with mux.Vars(r) for cleaner routing
	// vars := mux.Vars(r)

	// Authenticate the user making the engagement request
	// Only authenticated users should be able to like/unlike posts
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

	// Convert the post ID from string to integer for database operations
	// This validation ensures we're working with a valid numeric post identifier
	postID, err := strconv.Atoi(postIdStr) // Could be enhanced with: strconv.Atoi(vars["postId"])
	if err != nil {
		http.Error(w, "Invalid post ID", http.StatusBadRequest)
		return
	}

	// Extract the user ID from the validated session
	// This ensures we know exactly which user is performing the engagement action
	var userId string
	err = GetDatabaseConnection().QueryRow(`
    SELECT user_id
    FROM sessions
    WHERE id = ?`, cookie.Value).Scan(&userId)
	if err != nil {
		// Provide specific error handling for different failure scenarios
		if err == sql.ErrNoRows {
			http.Error(w, "User not found", http.StatusNotFound)
			fmt.Println("User not found for userID:", cookie.Value)
		} else {
			http.Error(w, "Failed to fetch user id", http.StatusInternalServerError)
			fmt.Println("Error querying user id:", err)
		}
		return
	}

	// Determine current engagement status to implement toggle behavior
	// This check prevents duplicate likes and enables proper unlike functionality
	found, eRr := checkUserLikedPost(postID, userId)
	if found {
		// User has already liked this post, so we remove their like (unlike action)
		// This implements the toggle behavior expected in modern social platforms
		err = removeRowFromTable("posts_likes", postID, userId)
		if err != nil {
			http.Error(w, "Failed to unlike post", http.StatusInternalServerError)
			return
		}
	} else {
		// User hasn't liked this post yet, so we add their like
		// This creates a new engagement record and increments the like count
		err = incrementPostLikes(postID, userId)
		if err != nil {
			http.Error(w, "Failed to like post", http.StatusInternalServerError)
			return
		}
	}
	// Handle any errors from the engagement check operation
	if eRr != nil {
		http.Error(w, "Failed to unlike post", http.StatusInternalServerError)
		return
	}

	// Retrieve the updated like count to send back to the client
	// This ensures the frontend displays the most current engagement metrics
	likes, err := getPostLikes(postID)
	if err != nil {
		http.Error(w, "Failed to retrieve like count", http.StatusInternalServerError)
		return
	}

	// Send the updated engagement data back to the client
	// This allows for immediate UI updates without requiring a page refresh
	response := map[string]interface{}{
		"postId": postID,
		"likes":  likes,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// VerifyUserPostEngagement determines if a specific user has already liked a particular post.
// This function is crucial for implementing proper like/unlike toggle behavior and preventing
// duplicate likes from the same user.
//
// Parameters:
//   - postID: The unique identifier of the post to check
//   - userID: The unique identifier of the user whose engagement we're verifying
//
// Returns:
//   - bool: true if the user has liked the post, false otherwise
//   - error: any database error that occurred during the check
func VerifyUserPostEngagement(postID int, userID string) (bool, error) {
	// Query the posts_likes junction table to check for existing engagement
	// Using COUNT(*) is efficient as we only need to know if a record exists
	query := `SELECT COUNT(*) FROM posts_likes WHERE post_id = ? AND user_id = ?`
	var count int

	err := GetDatabaseConnection().QueryRow(query, postID, userID).Scan(&count)
	if err != nil {
		return false, err
	}

	// Convert count to boolean: any count > 0 means the user has liked the post
	if count > 0 {
		return true, nil
	}
	return false, nil
}

// RemoveEngagementRecord safely removes a user's engagement record from the specified table.
// This function is designed to handle the "unlike" action by removing the relationship
// between a user and a post from the engagement tracking tables.
//
// Parameters:
//   - tableName: The name of the table to remove the record from (e.g., "posts_likes")
//   - postID: The unique identifier of the post
//   - userID: The unique identifier of the user
//
// Returns:
//   - error: any database error that occurred during the deletion
//
// Note: This function uses string formatting for the table name, which is safe here
// because the table name is controlled by our application code, not user input.
func RemoveEngagementRecord(tableName string, postID int, userID string) error {
	// Construct the DELETE query with the specified table name
	// The WHERE clause ensures we only remove the specific user's engagement
	query := fmt.Sprintf("DELETE FROM %s WHERE post_id = ? AND user_id = ?", tableName)

	_, err := GetDatabaseConnection().Exec(query, postID, userID)
	if err != nil {
		return fmt.Errorf("failed to remove row from table %s: %v", tableName, err)
	}

	return nil
}

// ProcessPostLikeIncrement handles the complete like operation with database transaction safety.
// This function performs two critical operations atomically:
// 1. Increments the like count on the post
// 2. Records the user's like in the posts_likes table
//
// Using a database transaction ensures data consistency - either both operations
// succeed or both are rolled back, preventing inconsistent states.
//
// Parameters:
//   - postID: The unique identifier of the post being liked
//   - userID: The unique identifier of the user performing the like action
//
// Returns:
//   - error: any database error that occurred during the transaction
func ProcessPostLikeIncrement(postID int, userID string) error {
	// Begin a database transaction to ensure atomicity
	// This guarantees that both the like count update and engagement record creation
	// either both succeed or both fail, maintaining data consistency
	tx, err := GetDatabaseConnection().Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %v", err)
	}

	// First operation: increment the like count on the post
	// This provides immediate feedback for the post's popularity metrics
	query := `UPDATE posts SET likes = likes + 1 WHERE id = ?`
	_, err = tx.Exec(query, postID)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to increment likes: %v", err)
	}

	// Second operation: record the user's engagement in the junction table
	// This prevents duplicate likes and enables proper unlike functionality
	query = `INSERT INTO posts_likes (post_id, user_id) VALUES (?, ?)`
	_, err = tx.Exec(query, postID, userID)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to add row to posts_likes table: %v", err)
	}

	// Commit the transaction to make all changes permanent
	err = tx.Commit()
	if err != nil {
		return fmt.Errorf("failed to commit transaction: %v", err)
	}
	return nil
}

// RetrievePostEngagementCount fetches the current like count for a specific post.
// This function provides real-time engagement metrics that can be used for
// displaying current popularity and for updating the UI after like/unlike actions.
//
// Parameters:
//   - postID: The unique identifier of the post whose like count we want to retrieve
//
// Returns:
//   - int: The current number of likes for the post
//   - error: any database error that occurred during the query
func RetrievePostEngagementCount(postID int) (int, error) {
	var likes int
	// Query the posts table directly for the most current like count
	// This count is maintained by our database triggers for consistency
	query := `SELECT likes FROM posts WHERE id = ?`
	err := GetDatabaseConnection().QueryRow(query, postID).Scan(&likes)
	return likes, err
}

// Legacy function aliases for backward compatibility
// These aliases ensure that existing code continues to work while we transition
// to the new, more descriptive function names throughout the application
var checkUserLikedPost = VerifyUserPostEngagement
var removeRowFromTable = RemoveEngagementRecord
var incrementPostLikes = ProcessPostLikeIncrement
var getPostLikes = RetrievePostEngagementCount
var GetPostsHandler = ManageForumDiscussions
var LikePostHandler = ProcessPostEngagementToggle
