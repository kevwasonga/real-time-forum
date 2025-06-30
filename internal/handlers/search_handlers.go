package handlers

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	"forum/internal/auth"
	"forum/internal/database"
	"forum/internal/models"
)

// SearchHandler handles search requests
func SearchHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("🔍 SearchHandler START - URL: %s", r.URL.String())

	if r.Method != http.MethodGet {
		RenderError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	query := r.URL.Query().Get("q")
	if query == "" {
		RenderError(w, "Search query is required", http.StatusBadRequest)
		return
	}

	// Get optional parameters
	limitStr := r.URL.Query().Get("limit")
	limit := 20 // default limit
	if limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 && parsedLimit <= 100 {
			limit = parsedLimit
		}
	}

	offsetStr := r.URL.Query().Get("offset")
	offset := 0
	if offsetStr != "" {
		if parsedOffset, err := strconv.Atoi(offsetStr); err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		}
	}

	searchType := r.URL.Query().Get("type") // posts, comments, users, all
	if searchType == "" {
		searchType = "all"
	}

	// Get current user for personalized results
	user := auth.GetUserFromSession(r)
	var userID string
	if user != nil {
		userID = user.ID
	}

	// Perform search
	results, total, err := performSearch(query, searchType, userID, limit, offset)
	if err != nil {
		log.Printf("❌ Search error: %v", err)
		RenderError(w, "Search failed", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"results": results,
		"total":   total,
		"query":   query,
		"type":    searchType,
		"limit":   limit,
		"offset":  offset,
	}

	RenderSuccess(w, "Search completed successfully", response)
}

// performSearch executes the search query across different content types
func performSearch(query, searchType, userID string, limit, offset int) ([]models.SearchResult, int, error) {
	// Sanitize query for SQL LIKE
	searchQuery := "%" + strings.ToLower(strings.TrimSpace(query)) + "%"

	switch searchType {
	case "posts":
		return searchPosts(searchQuery, userID, limit, offset)
	case "comments":
		return searchComments(searchQuery, userID, limit, offset)
	case "users":
		return searchUsers(searchQuery, limit, offset)
	case "all":
		return searchAll(searchQuery, userID, limit, offset)
	default:
		return searchAll(searchQuery, userID, limit, offset)
	}
}

// searchPosts searches for posts matching the query
func searchPosts(query, userID string, limit, offset int) ([]models.SearchResult, int, error) {
	var results []models.SearchResult

	// Count total results
	countSQL := `
		SELECT COUNT(*) 
		FROM posts p
		JOIN users u ON p.user_id = u.id
		WHERE LOWER(p.title) LIKE ? OR LOWER(p.content) LIKE ?
	`
	var total int
	err := database.DB.QueryRow(countSQL, query, query).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count posts: %v", err)
	}

	// Get posts with user like/dislike status
	searchSQL := `
		SELECT 
			p.id, p.title, p.content, p.created_at, p.user_id,
			u.nickname, u.avatar_url,
			COALESCE(pl.is_like, 0) as user_liked,
			COALESCE(pl.is_like = 0 AND pl.id IS NOT NULL, 0) as user_disliked,
			(SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND is_like = 1) as like_count,
			(SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND is_like = 0) as dislike_count,
			(SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
		FROM posts p
		JOIN users u ON p.user_id = u.id
		LEFT JOIN post_likes pl ON p.id = pl.post_id AND pl.user_id = ?
		WHERE LOWER(p.title) LIKE ? OR LOWER(p.content) LIKE ?
		ORDER BY p.created_at DESC
		LIMIT ? OFFSET ?
	`

	rows, err := database.DB.Query(searchSQL, userID, query, query, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to search posts: %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var result models.SearchResult
		var avatarURL *string
		var userLiked, userDisliked bool
		var likeCount, dislikeCount, commentCount int

		err := rows.Scan(
			&result.ID, &result.Title, &result.Content, &result.CreatedAt, &result.UserID,
			&result.Author, &avatarURL, &userLiked, &userDisliked,
			&likeCount, &dislikeCount, &commentCount,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan post result: %v", err)
		}

		result.Type = "post"
		result.URL = fmt.Sprintf("/post/%d", result.ID)
		result.Excerpt = truncateText(result.Content, 150)
		if avatarURL != nil {
			result.AuthorAvatar = *avatarURL
		}

		// Add metadata
		result.Metadata = map[string]interface{}{
			"userLiked":    userLiked,
			"userDisliked": userDisliked,
			"likeCount":    likeCount,
			"dislikeCount": dislikeCount,
			"commentCount": commentCount,
		}

		results = append(results, result)
	}

	return results, total, nil
}

// searchComments searches for comments matching the query
func searchComments(query, userID string, limit, offset int) ([]models.SearchResult, int, error) {
	var results []models.SearchResult

	// Count total results
	countSQL := `
		SELECT COUNT(*) 
		FROM comments c
		JOIN users u ON c.user_id = u.id
		JOIN posts p ON c.post_id = p.id
		WHERE LOWER(c.content) LIKE ?
	`
	var total int
	err := database.DB.QueryRow(countSQL, query).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count comments: %v", err)
	}

	// Get comments with post context
	searchSQL := `
		SELECT 
			c.id, c.content, c.created_at, c.user_id, c.post_id,
			u.nickname, u.avatar_url,
			p.title as post_title,
			COALESCE(cl.is_like, 0) as user_liked,
			COALESCE(cl.is_like = 0 AND cl.id IS NOT NULL, 0) as user_disliked,
			(SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id AND is_like = 1) as like_count,
			(SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id AND is_like = 0) as dislike_count
		FROM comments c
		JOIN users u ON c.user_id = u.id
		JOIN posts p ON c.post_id = p.id
		LEFT JOIN comment_likes cl ON c.id = cl.comment_id AND cl.user_id = ?
		WHERE LOWER(c.content) LIKE ?
		ORDER BY c.created_at DESC
		LIMIT ? OFFSET ?
	`

	rows, err := database.DB.Query(searchSQL, userID, query, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to search comments: %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var result models.SearchResult
		var avatarURL *string
		var postTitle string
		var userLiked, userDisliked bool
		var likeCount, dislikeCount int
		var postID int

		err := rows.Scan(
			&result.ID, &result.Content, &result.CreatedAt, &result.UserID, &postID,
			&result.Author, &avatarURL, &postTitle, &userLiked, &userDisliked,
			&likeCount, &dislikeCount,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan comment result: %v", err)
		}

		result.Type = "comment"
		result.Title = fmt.Sprintf("Comment on: %s", postTitle)
		result.URL = fmt.Sprintf("/post/%d#comment-%d", postID, result.ID)
		result.Excerpt = truncateText(result.Content, 150)
		if avatarURL != nil {
			result.AuthorAvatar = *avatarURL
		}

		// Add metadata
		result.Metadata = map[string]interface{}{
			"userLiked":    userLiked,
			"userDisliked": userDisliked,
			"likeCount":    likeCount,
			"dislikeCount": dislikeCount,
			"postTitle":    postTitle,
			"postID":       postID,
		}

		results = append(results, result)
	}

	return results, total, nil
}

// searchUsers searches for users matching the query
func searchUsers(query string, limit, offset int) ([]models.SearchResult, int, error) {
	var results []models.SearchResult

	// Count total results
	countSQL := `
		SELECT COUNT(*) 
		FROM users 
		WHERE LOWER(nickname) LIKE ? OR LOWER(email) LIKE ?
	`
	var total int
	err := database.DB.QueryRow(countSQL, query, query).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count users: %v", err)
	}

	// Get users
	searchSQL := `
		SELECT 
			id, nickname, email, avatar_url, created_at,
			(SELECT COUNT(*) FROM posts WHERE user_id = users.id) as post_count,
			(SELECT COUNT(*) FROM comments WHERE user_id = users.id) as comment_count
		FROM users 
		WHERE LOWER(nickname) LIKE ? OR LOWER(email) LIKE ?
		ORDER BY nickname ASC
		LIMIT ? OFFSET ?
	`

	rows, err := database.DB.Query(searchSQL, query, query, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to search users: %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var result models.SearchResult
		var avatarURL *string
		var email string
		var postCount, commentCount int

		err := rows.Scan(
			&result.UserID, &result.Author, &email, &avatarURL, &result.CreatedAt,
			&postCount, &commentCount,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan user result: %v", err)
		}

		result.Type = "user"
		result.Title = result.Author
		result.URL = fmt.Sprintf("/profile/%s", result.UserID)
		result.Content = fmt.Sprintf("User profile - %d posts, %d comments", postCount, commentCount)
		result.Excerpt = result.Content
		if avatarURL != nil {
			result.AuthorAvatar = *avatarURL
		}

		// Add metadata
		result.Metadata = map[string]interface{}{
			"email":        email,
			"postCount":    postCount,
			"commentCount": commentCount,
		}

		results = append(results, result)
	}

	return results, total, nil
}

// searchAll searches across all content types
func searchAll(query, userID string, limit, offset int) ([]models.SearchResult, int, error) {
	var allResults []models.SearchResult
	var totalCount int

	// Search posts (limit to half of requested results)
	postLimit := limit / 2
	posts, postTotal, err := searchPosts(query, userID, postLimit, 0)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to search posts: %v", err)
	}
	allResults = append(allResults, posts...)
	totalCount += postTotal

	// Search comments (limit to remaining results)
	commentLimit := limit - len(posts)
	if commentLimit > 0 {
		comments, commentTotal, err := searchComments(query, userID, commentLimit, 0)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to search comments: %v", err)
		}
		allResults = append(allResults, comments...)
		totalCount += commentTotal
	}

	// Search users (small limit for mixed results)
	if len(allResults) < limit {
		userLimit := limit - len(allResults)
		if userLimit > 5 {
			userLimit = 5 // Limit user results in mixed search
		}
		users, userTotal, err := searchUsers(query, userLimit, 0)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to search users: %v", err)
		}
		allResults = append(allResults, users...)
		totalCount += userTotal
	}

	// Sort by relevance/recency (posts and comments by created_at, users by name)
	// For now, keep the order as is (posts first, then comments, then users)

	return allResults, totalCount, nil
}
