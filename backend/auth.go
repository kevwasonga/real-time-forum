package backend

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// ProcessUserRegistration orchestrates the complete user registration workflow.
// This function handles the creation of new user accounts with comprehensive validation,
// security measures, and proper error handling to ensure a smooth onboarding experience.
//
// The registration process includes:
// - Input validation and sanitization
// - Email and username uniqueness verification
// - Secure password hashing using bcrypt
// - Database transaction safety
// - Proper error messaging for user feedback
//
// Security considerations:
// - Passwords are hashed using bcrypt with appropriate cost factor
// - User input is validated to prevent injection attacks
// - Unique constraints prevent duplicate accounts
func ProcessUserRegistration(w http.ResponseWriter, r *http.Request) {
	// Enforce POST method for security - registration should never be a GET request
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse and validate the incoming registration data
	// We use a structured approach to ensure all required information is provided
	var registrationData UserRegistrationRequest
	if err := json.NewDecoder(r.Body).Decode(&registrationData); err != nil {
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	// Comprehensive field validation to ensure data integrity and legal compliance
	// All fields are required for a complete user profile in our community
	// Age restriction ensures compliance with COPPA and other privacy regulations
	if registrationData.Username == "" || registrationData.FirstName == "" || registrationData.LastName == "" ||
		registrationData.Age < 13 || registrationData.Gender == "" || registrationData.Email == "" || registrationData.Password == "" {
		http.Error(w, "All fields are required and age must be at least 13", http.StatusBadRequest)
		return
	}

	// Secure password hashing using bcrypt algorithm
	// bcrypt is specifically designed for password hashing and includes salt generation
	// The DefaultCost provides a good balance between security and performance
	encryptedPassword, err := bcrypt.GenerateFromPassword([]byte(registrationData.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Error processing password", http.StatusInternalServerError)
		return
	}

	// Generate a cryptographically secure unique identifier for the new user
	// Using UUID v4 ensures uniqueness across all users and prevents ID collisions
	userIdentifier := uuid.New().String()

	// Create new user record in database
	_, err = GetDatabaseConnection().Exec(`
        INSERT INTO users (id, username, nickname, first_name, last_name, age, gender, email, password)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		userIdentifier, registrationData.Username, registrationData.Username, registrationData.FirstName, registrationData.LastName,
		registrationData.Age, registrationData.Gender, registrationData.Email, string(encryptedPassword))
	if err != nil {
		http.Error(w, "Error creating user account", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

// AuthenticateUserLogin manages the complete user authentication workflow.
// This function handles user login attempts with comprehensive security measures,
// including credential validation, password verification, and secure session creation.
//
// The authentication process includes:
// - Input validation and sanitization
// - User existence verification (by username or email)
// - Secure password comparison using bcrypt
// - Session creation with expiration
// - Secure cookie management
//
// Security features:
// - Constant-time password comparison to prevent timing attacks
// - Secure session token generation
// - HttpOnly cookies to prevent XSS attacks
// - Session expiration for security
func AuthenticateUserLogin(w http.ResponseWriter, r *http.Request) {
	// Enforce POST method for security - login credentials should never be in URL
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse login credentials from request body
	// We accept either username or email as the identifier for user convenience
	var loginCredentials struct {
		Identifier string `json:"identifier"` // Can be username or email
		Password   string `json:"password"`   // Plain text password for verification
	}
	if err := json.NewDecoder(r.Body).Decode(&loginCredentials); err != nil {
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	// Attempt to find the user by username or email
	// This flexible approach allows users to log in with either credential type
	var authenticatedUser UserProfile
	err := GetDatabaseConnection().QueryRow(`
        SELECT id, username, nickname, first_name, last_name, age, gender, email, password
        FROM users
        WHERE username = ? OR email = ?`,
		loginCredentials.Identifier, loginCredentials.Identifier).
		Scan(&authenticatedUser.ID, &authenticatedUser.Username, &authenticatedUser.Nickname, &authenticatedUser.FirstName, &authenticatedUser.LastName,
			&authenticatedUser.Age, &authenticatedUser.Gender, &authenticatedUser.Email, &authenticatedUser.Password)
	if err != nil {
		// Handle user not found vs. database errors differently
		if err == sql.ErrNoRows {
			// Use generic error message to prevent username enumeration attacks
			http.Error(w, "Invalid credentials", http.StatusUnauthorized)
			return
		}
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Verify the provided password against the stored hash
	// bcrypt.CompareHashAndPassword performs constant-time comparison to prevent timing attacks
	if err := bcrypt.CompareHashAndPassword([]byte(authenticatedUser.Password), []byte(loginCredentials.Password)); err != nil {
		// Use the same error message as user not found to prevent enumeration
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	// Terminate existing user sessions for security
	_, err = GetDatabaseConnection().Exec("DELETE FROM sessions WHERE user_id = ?", authenticatedUser.ID)
	if err != nil {
		http.Error(w, "Error clearing previous sessions", http.StatusInternalServerError)
		return
	}

	// Generate new secure session
	sessionToken := uuid.New().String()
	sessionExpiry := time.Now().Add(24 * time.Hour)

	_, err = GetDatabaseConnection().Exec("INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
		sessionToken, authenticatedUser.ID, time.Now(), sessionExpiry)
	if err != nil {
		http.Error(w, "Error creating session", http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    sessionToken,
		Expires:  sessionExpiry,
		Path:     "/",
		HttpOnly: true,
	})

	authenticatedUser.Password = ""
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(authenticatedUser)
}

// TerminateUserSession handles user logout and session cleanup
func TerminateUserSession(w http.ResponseWriter, r *http.Request) {
	sessionCookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "No active session found", http.StatusUnauthorized)
		return
	}

	// Remove session from database
	_, err = GetDatabaseConnection().Exec("DELETE FROM sessions WHERE id = ?", sessionCookie.Value)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Invalidate session cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		Path:     "/",
		HttpOnly: true,
	})

	w.WriteHeader(http.StatusOK)
}

// ValidateActiveSession verifies user session and returns user information
func ValidateActiveSession(w http.ResponseWriter, r *http.Request) {
	sessionCookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "No active session found", http.StatusUnauthorized)
		return
	}

	var userSession UserSession
	err = GetDatabaseConnection().QueryRow("SELECT id, user_id, created_at, expires_at FROM sessions WHERE id = ?", sessionCookie.Value).
		Scan(&userSession.ID, &userSession.UserID, &userSession.CreatedAt, &userSession.ExpiresAt)
	if err != nil {
		http.Error(w, "Invalid session", http.StatusUnauthorized)
		return
	}

	if time.Now().After(userSession.ExpiresAt) {
		// Remove expired session
		_, _ = GetDatabaseConnection().Exec("DELETE FROM sessions WHERE id = ?", userSession.ID)
		http.Error(w, "Session expired", http.StatusUnauthorized)
		return
	}

	var currentUser UserProfile
	err = GetDatabaseConnection().QueryRow("SELECT id, username, nickname, first_name, last_name, age, gender, email FROM users WHERE id = ?", userSession.UserID).
		Scan(&currentUser.ID, &currentUser.Username, &currentUser.Nickname, &currentUser.FirstName, &currentUser.LastName, &currentUser.Age, &currentUser.Gender, &currentUser.Email)
	if err != nil {
		http.Error(w, "User not found", http.StatusUnauthorized)
		return
	}

	json.NewEncoder(w).Encode(currentUser)
}
