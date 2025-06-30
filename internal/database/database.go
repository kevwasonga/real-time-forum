package database

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

// Initialize sets up the database connection and creates tables
func Initialize() error {
	var err error
	DB, err = sql.Open("sqlite3", "forum.db")
	if err != nil {
		return fmt.Errorf("failed to open database: %v", err)
	}

	// Test the connection
	if err = DB.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %v", err)
	}

	// Enable foreign keys
	if _, err = DB.Exec("PRAGMA foreign_keys = ON"); err != nil {
		return fmt.Errorf("failed to enable foreign keys: %v", err)
	}

	// Create tables
	if err = createTables(); err != nil {
		return fmt.Errorf("failed to create tables: %v", err)
	}

	log.Println("✅ Database initialized successfully")
	return nil
}

// Close closes the database connection
func Close() error {
	if DB != nil {
		return DB.Close()
	}
	return nil
}

// createTables creates all necessary database tables
func createTables() error {
	// Users table with comprehensive profile information
	usersTable := `
	CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		email TEXT UNIQUE NOT NULL,
		nickname TEXT UNIQUE NOT NULL,
		password TEXT NOT NULL,
		first_name TEXT NOT NULL,
		last_name TEXT NOT NULL,
		age INTEGER NOT NULL CHECK (age >= 13),
		gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
		google_id TEXT UNIQUE,
		github_id TEXT UNIQUE,
		avatar_url TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`

	// OAuth tokens table for Google authentication
	googleAuthTable := `
	CREATE TABLE IF NOT EXISTS google_auth (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id TEXT NOT NULL UNIQUE,
		access_token TEXT NOT NULL,
		refresh_token TEXT,
		expires_at TIMESTAMP NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	);`

	// OAuth tokens table for GitHub authentication
	githubAuthTable := `
	CREATE TABLE IF NOT EXISTS github_auth (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id TEXT NOT NULL UNIQUE,
		access_token TEXT NOT NULL,
		refresh_token TEXT,
		expires_at TIMESTAMP NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	);`

	// Sessions table for user authentication
	sessionsTable := `
	CREATE TABLE IF NOT EXISTS sessions (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		expires_at TIMESTAMP NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	);`

	// Posts table
	postsTable := `
	CREATE TABLE IF NOT EXISTS posts (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id TEXT NOT NULL,
		title TEXT NOT NULL,
		content TEXT NOT NULL,
		image_path TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	);`

	// Post categories table
	postCategoriesTable := `
	CREATE TABLE IF NOT EXISTS post_categories (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		post_id INTEGER NOT NULL,
		category TEXT NOT NULL,
		FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
	);`

	// Comments table with support for nested comments
	commentsTable := `
	CREATE TABLE IF NOT EXISTS comments (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		post_id INTEGER NOT NULL,
		user_id TEXT NOT NULL,
		parent_id INTEGER,
		content TEXT NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
	);`

	// Messages table for private messaging
	messagesTable := `
	CREATE TABLE IF NOT EXISTS messages (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		sender_id TEXT NOT NULL,
		receiver_id TEXT NOT NULL,
		content TEXT NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		read_at TIMESTAMP,
		FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
	);`

	// Likes table for posts and comments
	likesTable := `
	CREATE TABLE IF NOT EXISTS likes (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id TEXT NOT NULL,
		post_id INTEGER,
		comment_id INTEGER,
		is_like BOOLEAN NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
		FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
		UNIQUE(user_id, post_id),
		UNIQUE(user_id, comment_id)
	);`

	// Friends table for friend relationships
	friendsTable := `
	CREATE TABLE IF NOT EXISTS friends (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		requester_id TEXT NOT NULL,
		addressee_id TEXT NOT NULL,
		status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')),
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE,
		UNIQUE(requester_id, addressee_id)
	);`

	// Online users table for tracking active users (supports multiple sessions per user)
	onlineUsersTable := `
	CREATE TABLE IF NOT EXISTS online_users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id TEXT NOT NULL,
		session_id TEXT NOT NULL UNIQUE,
		last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	);`

	// Private messages table for storing chat messages
	privateMessagesTable := `
	CREATE TABLE IF NOT EXISTS private_messages (
		id TEXT PRIMARY KEY,
		sender_id TEXT NOT NULL,
		receiver_id TEXT NOT NULL,
		content TEXT NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		read_at TIMESTAMP NULL,
		FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
	);`

	// Post shares table for tracking sharing activity
	postSharesTable := `
	CREATE TABLE IF NOT EXISTS post_shares (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		post_id INTEGER NOT NULL,
		user_id TEXT NOT NULL,
		share_method TEXT NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	);`

	tables := []string{
		usersTable,
		googleAuthTable,
		githubAuthTable,
		sessionsTable,
		postsTable,
		postCategoriesTable,
		commentsTable,
		messagesTable,
		likesTable,
		friendsTable,
		onlineUsersTable,
		privateMessagesTable,
		postSharesTable,
	}

	for _, table := range tables {
		if _, err := DB.Exec(table); err != nil {
			return fmt.Errorf("failed to create table: %v", err)
		}
	}

	// Create indexes for better performance
	indexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);",
		"CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);",
		"CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);",
		"CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);",
		"CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON messages(sender_id, receiver_id);",
		"CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);",
		"CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);",
		"CREATE INDEX IF NOT EXISTS idx_likes_comment_id ON likes(comment_id);",
		"CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);",
		"CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);",
		"CREATE INDEX IF NOT EXISTS idx_private_messages_sender_receiver ON private_messages(sender_id, receiver_id);",
		"CREATE INDEX IF NOT EXISTS idx_private_messages_created_at ON private_messages(created_at DESC);",
	}

	for _, index := range indexes {
		if _, err := DB.Exec(index); err != nil {
			return fmt.Errorf("failed to create index: %v", err)
		}
	}

	// Migrate online_users table to new schema if needed
	if err := migrateOnlineUsersTable(); err != nil {
		return fmt.Errorf("failed to migrate online_users table: %v", err)
	}

	return nil
}

// migrateOnlineUsersTable migrates the online_users table to support multiple sessions per user
func migrateOnlineUsersTable() error {
	// Check if session_id column exists
	var columnExists bool
	err := DB.QueryRow(`
		SELECT COUNT(*) > 0
		FROM pragma_table_info('online_users')
		WHERE name = 'session_id'
	`).Scan(&columnExists)

	if err != nil {
		return fmt.Errorf("failed to check table schema: %v", err)
	}

	// If session_id column doesn't exist, we need to recreate the table
	if !columnExists {
		log.Println("🔄 Migrating online_users table to support multiple sessions...")

		// Drop the old table
		_, err := DB.Exec("DROP TABLE IF EXISTS online_users")
		if err != nil {
			return fmt.Errorf("failed to drop old online_users table: %v", err)
		}

		// Create the new table with the updated schema
		newOnlineUsersTable := `
		CREATE TABLE IF NOT EXISTS online_users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id TEXT NOT NULL,
			session_id TEXT NOT NULL UNIQUE,
			last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		);`

		_, err = DB.Exec(newOnlineUsersTable)
		if err != nil {
			return fmt.Errorf("failed to create new online_users table: %v", err)
		}

		log.Println("✅ Successfully migrated online_users table")
	}

	return nil
}
