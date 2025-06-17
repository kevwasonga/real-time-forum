package backend

import (
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"time"
)

func ServeTemplate(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}

	// Check for session cookie
	cookie, err := r.Cookie("session_id")
	if err != nil {
		// No session cookie, show login form
		tmpl, err := template.ParseFiles("frontend/templates/index.html")
		if err != nil {
			log.Printf("Error parsing template: %v", err)
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}

		err = tmpl.Execute(w, map[string]interface{}{
			"ShowLoginForm": true,
		})
		if err != nil {
			log.Printf("Error executing template: %v", err)
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		}
		return
	}

	// Verify session exists in database
	var session Session
	err = GetDatabaseConnection().QueryRow("SELECT id, user_id, created_at, expires_at FROM sessions WHERE id = ?", cookie.Value).
		Scan(&session.ID, &session.UserID, &session.CreatedAt, &session.ExpiresAt)
	if err != nil {
		// Session not found in database, clear cookie and show login form
		http.SetCookie(w, &http.Cookie{
			Name:     "session_id",
			Value:    "",
			Expires:  time.Now().Add(-1 * time.Hour),
			Path:     "/",
			HttpOnly: true,
		})

		tmpl, err := template.ParseFiles("frontend/templates/index.html")
		if err != nil {
			log.Printf("Error parsing template: %v", err)
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}

		err = tmpl.Execute(w, map[string]interface{}{
			"ShowLoginForm": true,
		})
		if err != nil {
			log.Printf("Error executing template: %v", err)
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		}
		return
	}

	// Check if session is expired
	if time.Now().After(session.ExpiresAt) {
		// Delete expired session
		_, _ = GetDB().Exec("DELETE FROM sessions WHERE id = ?", session.ID)
		// Clear cookie
		http.SetCookie(w, &http.Cookie{
			Name:     "session_id",
			Value:    "",
			Expires:  time.Now().Add(-1 * time.Hour),
			Path:     "/",
			HttpOnly: true,
		})

		tmpl, err := template.ParseFiles("frontend/templates/index.html")
		if err != nil {
			log.Printf("Error parsing template: %v", err)
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}

		err = tmpl.Execute(w, map[string]interface{}{
			"ShowLoginForm": true,
		})
		if err != nil {
			log.Printf("Error executing template: %v", err)
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		}
		return
	}

	// Session is valid, show forum content
	tmpl, err := template.ParseFiles("frontend/templates/index.html")
	if err != nil {
		log.Printf("Error parsing template: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	err = tmpl.Execute(w, map[string]interface{}{
		"ShowLoginForm": false,
	})
	if err != nil {
		log.Printf("Error executing template: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
	}
}

// FetchUserHandler retrieves details of a specific user
func FetchUserHandler(w http.ResponseWriter, r *http.Request, userId string) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user, err := FetchUser(userId)
	if err != nil {
		http.Error(w, "Failed to fetch user details", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

// FetchUser retrieves user details from the database
func FetchUser(userId string) (User, error) {
	var user User
	err := GetDatabaseConnection().QueryRow("SELECT id, username, first_name, last_name, age, gender, email FROM users WHERE id = ?", userId).
		Scan(&user.ID, &user.Nickname, &user.FirstName, &user.LastName, &user.Age, &user.Gender, &user.Email)
	if err != nil {
		fmt.Println("You screwed up: ", err)
		return User{}, err
	}

	return user, nil
}
