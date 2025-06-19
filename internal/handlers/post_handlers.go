package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"forum/internal/auth"
	"forum/internal/database"
	"forum/internal/models"
)

// PostHandler handles individual post operations
func PostHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RenderError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract post ID from URL path
	path := strings.TrimPrefix(r.URL.Path, "/api/posts/")
	postID, err := strconv.Atoi(path)
	if err != nil {
		RenderError(w, "Invalid post ID", http.StatusBadRequest)
		return
	}

	// Get post with comments
	post, err := getPostWithComments(postID)
	if err != nil {
		RenderError(w, "Post not found", http.StatusNotFound)
		return
	}

	// Check if current user liked/disliked this post
	user := auth.GetUserFromSession(r)
	if user != nil {
		userLike, err := getUserLikeStatus(user.ID, &post.ID, nil)
		if err == nil && userLike != nil {
			post.UserLiked = userLike.IsLike
			post.UserDisliked = !userLike.IsLike
		}

		// Check like status for comments
		for i := range post.Comments {
			commentLike, err := getUserLikeStatus(user.ID, nil, &post.Comments[i].ID)
			if err == nil && commentLike != nil {
				post.Comments[i].UserLiked = commentLike.IsLike
				post.Comments[i].UserDisliked = !commentLike.IsLike
			}
		}
	}

	RenderSuccess(w, "Post retrieved successfully", post)
}

// CommentHandler handles comment creation
func CommentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		RenderError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user := auth.GetUserFromSession(r)
	if user == nil {
		RenderError(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	var req models.CommentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RenderError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate input
	if req.PostID == 0 || req.Content == "" {
		RenderError(w, "Post ID and content are required", http.StatusBadRequest)
		return
	}

	// Insert comment
	result, err := database.DB.Exec(`
		INSERT INTO comments (post_id, user_id, parent_id, content, created_at)
		VALUES (?, ?, ?, ?, ?)
	`, req.PostID, user.ID, req.ParentID, req.Content, time.Now())

	if err != nil {
		RenderError(w, "Failed to create comment", http.StatusInternalServerError)
		return
	}

	commentID, _ := result.LastInsertId()

	// Get the created comment
	comment, err := getCommentByID(int(commentID))
	if err != nil {
		RenderError(w, "Failed to retrieve created comment", http.StatusInternalServerError)
		return
	}

	RenderSuccess(w, "Comment created successfully", comment)
}

// LikeHandler handles like/dislike operations
func LikeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		RenderError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user := auth.GetUserFromSession(r)
	if user == nil {
		RenderError(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	var req models.LikeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RenderError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate that either postID or commentID is provided
	if req.PostID == nil && req.CommentID == nil {
		RenderError(w, "Either postId or commentId is required", http.StatusBadRequest)
		return
	}

	// Check if user already liked/disliked this item
	var existingLike *models.Like
	var err error

	if req.PostID != nil {
		existingLike, err = getUserLikeStatus(user.ID, req.PostID, nil)
	} else {
		existingLike, err = getUserLikeStatus(user.ID, nil, req.CommentID)
	}

	if err != nil {
		RenderError(w, "Failed to check existing like status", http.StatusInternalServerError)
		return
	}

	if existingLike != nil {
		// If clicking the same action (like->like or dislike->dislike), remove the like
		if existingLike.IsLike == req.IsLike {
			_, err = database.DB.Exec(`DELETE FROM likes WHERE id = ?`, existingLike.ID)
		} else {
			// Update existing like to opposite action
			_, err = database.DB.Exec(`
				UPDATE likes SET is_like = ? WHERE id = ?
			`, req.IsLike, existingLike.ID)
		}
	} else {
		// Create new like
		_, err = database.DB.Exec(`
			INSERT INTO likes (user_id, post_id, comment_id, is_like, created_at)
			VALUES (?, ?, ?, ?, ?)
		`, user.ID, req.PostID, req.CommentID, req.IsLike, time.Now())
	}

	if err != nil {
		RenderError(w, "Failed to update like status", http.StatusInternalServerError)
		return
	}

	// Return updated counts
	var likeCount, dislikeCount int
	if req.PostID != nil {
		// Get updated post counts
		database.DB.QueryRow(`
			SELECT
				COALESCE(SUM(CASE WHEN is_like = 1 THEN 1 ELSE 0 END), 0) as like_count,
				COALESCE(SUM(CASE WHEN is_like = 0 THEN 1 ELSE 0 END), 0) as dislike_count
			FROM likes WHERE post_id = ?
		`, *req.PostID).Scan(&likeCount, &dislikeCount)
	} else {
		// Get updated comment counts
		database.DB.QueryRow(`
			SELECT
				COALESCE(SUM(CASE WHEN is_like = 1 THEN 1 ELSE 0 END), 0) as like_count,
				COALESCE(SUM(CASE WHEN is_like = 0 THEN 1 ELSE 0 END), 0) as dislike_count
			FROM likes WHERE comment_id = ?
		`, *req.CommentID).Scan(&likeCount, &dislikeCount)
	}

	response := map[string]interface{}{
		"likeCount":    likeCount,
		"dislikeCount": dislikeCount,
	}

	RenderSuccess(w, "Like status updated successfully", response)
}

// CategoriesHandler handles category operations
func CategoriesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RenderError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	rows, err := database.DB.Query(`
		SELECT category, COUNT(*) as post_count
		FROM post_categories
		GROUP BY category
		ORDER BY post_count DESC, category ASC
	`)
	if err != nil {
		RenderError(w, "Failed to fetch categories", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var categories []models.Category
	for rows.Next() {
		var category models.Category
		if err := rows.Scan(&category.Name, &category.PostCount); err != nil {
			RenderError(w, "Failed to scan category", http.StatusInternalServerError)
			return
		}
		categories = append(categories, category)
	}

	if categories == nil {
		categories = []models.Category{}
	}

	RenderSuccess(w, "Categories retrieved successfully", categories)
}

// Helper functions for post handlers

// getPostWithComments gets a post with its comments
func getPostWithComments(postID int) (*models.Post, error) {
	// Get the post
	post, err := getPostByID(postID)
	if err != nil {
		return nil, err
	}

	// Get comments for the post
	comments, err := getPostComments(postID)
	if err != nil {
		return nil, err
	}

	post.Comments = comments
	return post, nil
}

// getPostComments gets all comments for a post
func getPostComments(postID int) ([]models.Comment, error) {
	rows, err := database.DB.Query(`
		SELECT c.id, c.post_id, c.user_id, c.parent_id, c.content, c.created_at,
		       u.nickname, u.avatar_url,
		       COALESCE(like_counts.like_count, 0) as like_count,
		       COALESCE(like_counts.dislike_count, 0) as dislike_count
		FROM comments c
		JOIN users u ON c.user_id = u.id
		LEFT JOIN (
			SELECT comment_id,
			       SUM(CASE WHEN is_like = 1 THEN 1 ELSE 0 END) as like_count,
			       SUM(CASE WHEN is_like = 0 THEN 1 ELSE 0 END) as dislike_count
			FROM likes
			WHERE comment_id IS NOT NULL
			GROUP BY comment_id
		) like_counts ON c.id = like_counts.comment_id
		WHERE c.post_id = ?
		ORDER BY c.created_at ASC
	`, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []models.Comment
	for rows.Next() {
		var comment models.Comment
		err := rows.Scan(
			&comment.ID, &comment.PostID, &comment.UserID, &comment.ParentID, &comment.Content, &comment.CreatedAt,
			&comment.Author, &comment.AuthorAvatar,
			&comment.LikeCount, &comment.DislikeCount,
		)
		if err != nil {
			return nil, err
		}
		comments = append(comments, comment)
	}

	return comments, nil
}

// getCommentByID gets a comment by ID
func getCommentByID(commentID int) (*models.Comment, error) {
	var comment models.Comment
	err := database.DB.QueryRow(`
		SELECT c.id, c.post_id, c.user_id, c.parent_id, c.content, c.created_at,
		       u.nickname, u.avatar_url,
		       COALESCE(like_counts.like_count, 0) as like_count,
		       COALESCE(like_counts.dislike_count, 0) as dislike_count
		FROM comments c
		JOIN users u ON c.user_id = u.id
		LEFT JOIN (
			SELECT comment_id,
			       SUM(CASE WHEN is_like = 1 THEN 1 ELSE 0 END) as like_count,
			       SUM(CASE WHEN is_like = 0 THEN 1 ELSE 0 END) as dislike_count
			FROM likes
			WHERE comment_id IS NOT NULL
			GROUP BY comment_id
		) like_counts ON c.id = like_counts.comment_id
		WHERE c.id = ?
	`, commentID).Scan(
		&comment.ID, &comment.PostID, &comment.UserID, &comment.ParentID, &comment.Content, &comment.CreatedAt,
		&comment.Author, &comment.AuthorAvatar,
		&comment.LikeCount, &comment.DislikeCount,
	)

	if err != nil {
		return nil, err
	}

	return &comment, nil
}
