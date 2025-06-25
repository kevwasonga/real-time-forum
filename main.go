package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"forum/internal/auth"
	"forum/internal/database"
	"forum/internal/handlers"
	"forum/internal/websocket"
)

// Valid frontend routes for SPA
var validFrontendRoutes = map[string]bool{
	"/":            true,
	"/login":       true,
	"/register":    true,
	"/profile":     true,
	"/post":        true,
	"/posts":       true,
	"/messages":    true,
	"/friends":     true,
	"/create-post": true,
	"/settings":    true,
}

func main() {
	// Initialize database
	if err := database.Initialize(); err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	defer database.Close()

	// Initialize OAuth providers
	auth.InitializeOAuthProviders()

	// Initialize WebSocket hub
	websocket.InitializeHub()

	// Setup routes
	setupRoutes()

	// Get port from environment or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("🚀 Forum starting on http://localhost:%s\n", port)
	fmt.Printf("📊 Database: forum.db\n")
	fmt.Printf("🌐 Frontend: Modern SPA with real-time features\n")

	log.Fatal(http.ListenAndServe(":"+port, nil))
}

func setupRoutes() {
	// Static files
	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("frontend/static/"))))

	// API routes
	http.HandleFunc("/api/register", handlers.RegisterHandler)
	http.HandleFunc("/api/login", handlers.LoginHandler)
	http.HandleFunc("/api/logout", handlers.LogoutHandler)
	http.HandleFunc("/api/user", handlers.CurrentUserHandler)
	http.HandleFunc("/api/posts", handlers.PostsHandler)
	http.HandleFunc("/api/posts/", handlers.PostHandler)
	http.HandleFunc("/api/comment", handlers.CommentHandler)
	http.HandleFunc("/api/comments/", handlers.CommentsHandler)
	// Also handle without trailing slash for better compatibility
	http.HandleFunc("/api/comments", handlers.CommentsHandler)

	// Test endpoint
	http.HandleFunc("/api/test", func(w http.ResponseWriter, r *http.Request) {
		log.Printf("🧪 Test endpoint called")
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"success": true, "message": "Test endpoint working"}`))
	})
	http.HandleFunc("/api/like", handlers.LikeHandler)
	http.HandleFunc("/api/messages", handlers.MessagesHandler)
	http.HandleFunc("/api/messages/", handlers.MessageHandler)
	http.HandleFunc("/api/users", handlers.UsersHandler)
	http.HandleFunc("/api/categories", handlers.CategoriesHandler)
	http.HandleFunc("/api/profile", handlers.ProfileHandler)
	http.HandleFunc("/api/friends", handlers.FriendsHandler)
	http.HandleFunc("/api/online-users", handlers.OnlineUsersHandler)

	// Avatar upload routes
	http.HandleFunc("/api/upload/avatar", handlers.AvatarUploadHandler)
	http.HandleFunc("/api/profile/avatar", handlers.AvatarUpdateHandler)

	// OAuth routes
	http.HandleFunc("/auth/google/login", handlers.GoogleLoginHandler)
	http.HandleFunc("/auth/google/callback", handlers.GoogleCallbackHandler)
	http.HandleFunc("/auth/github/login", handlers.GithubLoginHandler)
	http.HandleFunc("/auth/github/callback", handlers.GithubCallbackHandler)

	// WebSocket endpoint
	http.HandleFunc("/api/ws", websocket.HandleWebSocket)

	// SPA handler - serve index.html for all frontend routes
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		// Check if it's a valid frontend route or a sub-route
		isValidRoute := validFrontendRoutes[path]
		if !isValidRoute {
			// Check for sub-routes (e.g., /post/123, /messages/456)
			for route := range validFrontendRoutes {
				if route != "/" && strings.HasPrefix(path, route+"/") {
					isValidRoute = true
					break
				}
			}
		}

		if isValidRoute || path == "/" {
			http.ServeFile(w, r, "frontend/static/index.html")
		} else {
			http.NotFound(w, r)
		}
	})
}
