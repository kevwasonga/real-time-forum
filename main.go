package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"forum/backend"
)

func main() {
	// Establish database connection with enhanced schema
	db, err := backend.EstablishDatabaseConnection()
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Initialize WebSocket hub for real-time features
	backend.InitializeWebSocketHub()

	// Configure static file serving
	staticFileServer := http.FileServer(http.Dir("frontend/static"))
	http.Handle("/static/", http.StripPrefix("/static/", staticFileServer))

	// Enhanced API routes with new naming convention
	http.HandleFunc("/api/register", backend.ProcessUserRegistration)
	http.HandleFunc("/api/login", backend.AuthenticateUserLogin)
	http.HandleFunc("/api/logout", backend.TerminateUserSession)
	http.HandleFunc("/api/check-session", backend.ValidateActiveSession)

	// Real-time WebSocket connection
	http.HandleFunc("/api/ws", backend.EstablishWebSocketConnection)
	http.HandleFunc("/api/discussions", backend.ManageForumDiscussions)
	http.HandleFunc("/api/discussions/personal", backend.GetUserPosts)
	http.HandleFunc("/api/connections/request", backend.SendFriendRequest)
	http.HandleFunc("/api/connections/accept", backend.AcceptFriendRequest)
	http.HandleFunc("/api/connections/remove", backend.RemoveFriend)
	// http.HandleFunc("/api/messages/recent", backend.LatestMessagesHandler)
	http.HandleFunc("/api/profile/manage", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			backend.UserProfileHandler(w, r)
		} else if r.Method == http.MethodPut {
			backend.UpdateUserProfileHandler(w, r)
		} else if r.Method == http.MethodDelete {
			backend.DeleteUserAccountHandler(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	http.HandleFunc("/api/discussions/", func(w http.ResponseWriter, r *http.Request) {
		if len(r.URL.Path) > len("/api/discussions/") {
			pathParts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/discussions/"), "/")
			if len(pathParts) == 2 && pathParts[1] == "comments" {
				discussionId := pathParts[0]
				if r.Method == http.MethodGet {
					backend.FetchCommentsHandler(w, r, discussionId)
				} else if r.Method == http.MethodPost {
					backend.CreateCommentHandler(w, r, discussionId)
				} else {
					http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
				}
				return
			} else if len(pathParts) == 2 && pathParts[1] == "engage" {
				discussionId := pathParts[0]
				if r.Method == http.MethodPost {
					backend.ProcessPostEngagementToggle(w, r, discussionId)
				} else {
					http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
				}
				return
			}
		}
		http.NotFound(w, r)
	})

	http.HandleFunc("/api/interactions/", func(w http.ResponseWriter, r *http.Request) {
		if len(r.URL.Path) > len("/api/interactions/") {
			pathParts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/interactions/"), "/")
			if len(pathParts) == 3 && pathParts[0] == "replies" && pathParts[2] == "engage" {
				replyId := pathParts[1]
				if r.Method == http.MethodPost {
					backend.LikeReplyHandler(w, r, replyId)
				} else {
					http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
				}
				return
			} else if len(pathParts) == 2 && pathParts[1] == "engage" {
				commentId := pathParts[0]
				if r.Method == http.MethodPost {
					backend.LikeCommentHandler(w, r, commentId)
				} else {
					http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
				}
				return
			} else if len(pathParts) == 2 && pathParts[1] == "responses" {
				commentId := pathParts[0]
				if r.Method == http.MethodGet {
					backend.FetchRepliesHandler(w, r, commentId)
				} else if r.Method == http.MethodPost {
					backend.CreateReplyHandler(w, r, commentId)
				} else {
					http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
				}
				return
			}
		}
		http.NotFound(w, r)
	})

	// Enhanced route for forum member status tracking
	http.HandleFunc("/api/community/active-members", backend.FetchOnlineUsers)

	// Comprehensive messaging system routes
	http.HandleFunc("/api/communications/", func(w http.ResponseWriter, r *http.Request) {
		pathParts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/communications/"), "/")
		userId := pathParts[0]
		backend.FetchMessagesHandler(w, r, userId)
	})
	http.HandleFunc("/api/members/", func(w http.ResponseWriter, r *http.Request) {
		pathParts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/members/"), "/")
		userId := pathParts[0]
		backend.FetchUserHandler(w, r, userId)
	})
	http.HandleFunc("/api/communications/dispatch/", func(w http.ResponseWriter, r *http.Request) {
		pathParts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/communications/dispatch/"), "/")
		recipientId := pathParts[0]
		backend.SendMessageHandler(w, r, recipientId)
	})

	// Primary application interface route
	http.HandleFunc("/", backend.ServeTemplate)

	serverPort := os.Getenv("PORT")
	if serverPort == "" {
		serverPort = "8084"
	}
	serverPort = ":" + serverPort
	fmt.Printf("🚀 Forum starting on http://localhost%s\n", serverPort)
	fmt.Printf("📊 Database: community_forum.db\n")
	fmt.Printf("🌐 Frontend: Enhanced modern interface\n")
	log.Fatal(http.ListenAndServe(serverPort, nil))
}
