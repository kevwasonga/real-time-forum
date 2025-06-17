package backend

import (
	"database/sql"

	_ "github.com/mattn/go-sqlite3"
)

var databaseConnection *sql.DB

// EstablishDatabaseConnection initializes and configures the SQLite database with all required tables
func EstablishDatabaseConnection() (*sql.DB, error) {
	var err error
	databaseConnection, err = sql.Open("sqlite3", "./community_forum.db")
	if err != nil {
		return nil, err
	}

	// Create enhanced users table with comprehensive user information
	_, err = databaseConnection.Exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            nickname TEXT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            age INTEGER NOT NULL,
            gender TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    `)
	if err != nil {
		return nil, err
	}

	// Create secure user sessions table
	_, err = databaseConnection.Exec(`
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            created_at DATETIME NOT NULL,
            expires_at DATETIME NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `)
	if err != nil {
		return nil, err
	}

	// Create comment interaction tracking table
	_, err = databaseConnection.Exec(`
        CREATE TABLE IF NOT EXISTS comments_likes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            comment_id INTEGER NOT NULL
        )
    `)
	if err != nil {
		return nil, err
	}

	// Create comprehensive forum posts table
	_, err = databaseConnection.Exec(`
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            likes INTEGER DEFAULT 0,
            comment_count INTEGER DEFAULT 0,
            category TEXT NOT NULL,
            created_at DATETIME NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `)
	if err != nil {
		return nil, err
	}

	// Create post engagement tracking table
	_, err = databaseConnection.Exec(`
        CREATE TABLE IF NOT EXISTS posts_likes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            post_id INTEGER NOT NULL
        )
    `)
	if err != nil {
		return nil, err
	}

	// Create discussion comments table
	_, err = databaseConnection.Exec(`
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            user_id TEXT NOT NULL,
            content TEXT NOT NULL,
            reply_count INTEGER DEFAULT 0,
            likes INTEGER DEFAULT 0,
            created_at DATETIME NOT NULL,
            FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `)
	if err != nil {
		return nil, err
	}

	// Create comment replies table
	_, err = databaseConnection.Exec(`
        CREATE TABLE IF NOT EXISTS replies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            comment_id INTEGER NOT NULL,
            user_id TEXT NOT NULL,
            content TEXT NOT NULL,
            likes INTEGER DEFAULT 0,
            created_at DATETIME NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `)
	if err != nil {
		return nil, err
	}

	// Create reply engagement tracking table
	_, err = databaseConnection.Exec(`
        CREATE TABLE IF NOT EXISTS replies_likes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            reply_id INTEGER NOT NULL
        )
    `)

	if err != nil {
		return nil, err
	}

	// Create private messaging system table
	_, err = databaseConnection.Exec(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL,
            receiver_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            created_at DATETIME NOT NULL,
            read BOOLEAN DEFAULT FALSE,
            FOREIGN KEY (sender_id) REFERENCES users(id),
            FOREIGN KEY (receiver_id) REFERENCES users(id)
        )
    `)
	if err != nil {
		return nil, err
	}

	// Create social connection requests table
	_, err = databaseConnection.Exec(`
        CREATE TABLE IF NOT EXISTS friend_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL,
            receiver_id INTEGER NOT NULL,
            status TEXT NOT NULL,
            created_at DATETIME NOT NULL,
            FOREIGN KEY (sender_id) REFERENCES users(id),
            FOREIGN KEY (receiver_id) REFERENCES users(id),
            UNIQUE(sender_id, receiver_id)
        )
    `)
	if err != nil {
		return nil, err
	}

	// Create user relationships management table
	_, err = databaseConnection.Exec(`
        CREATE TABLE IF NOT EXISTS friendships (
            user_id INT NOT NULL,
            friend_id INT NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('pending', 'accepted')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, friend_id),
            FOREIGN KEY (user_id) REFERENCES users(user_id),
            FOREIGN KEY (friend_id) REFERENCES users(user_id)
        )
    `)
	if err != nil {
		return nil, err
	}

	/* DATABASE TRIGGERS FOR AUTOMATIC UPDATES */

	_, err = databaseConnection.Exec(`
        CREATE TRIGGER IF NOT EXISTS update_posts_likes_on_insert
        AFTER INSERT ON posts_likes
        FOR EACH ROW
        BEGIN
            UPDATE posts
            SET likes = (SELECT COUNT(*) FROM posts_likes WHERE post_id = NEW.post_id)
            WHERE id = NEW.post_id;
        END;
    `)
	if err != nil {
		return nil, err
	}

	_, err = databaseConnection.Exec(`
            CREATE TRIGGER IF NOT EXISTS update_posts_likes_on_delete
            AFTER DELETE ON posts_likes
            FOR EACH ROW
            BEGIN
                UPDATE posts
                SET likes = (SELECT COUNT(*) FROM posts_likes WHERE post_id = OLD.post_id)
                WHERE id = OLD.post_id;
            END;
        `)
	if err != nil {
		return nil, err
	}

	_, err = databaseConnection.Exec(`
            CREATE TRIGGER IF NOT EXISTS update_comment_count_on_insert
            AFTER INSERT ON comments
            FOR EACH ROW
            BEGIN
                UPDATE posts
                SET comment_count = (
                    SELECT COUNT(*)
                    FROM comments
                    WHERE post_id = NEW.post_id
                )
                WHERE id = NEW.post_id;
            END;
        `)
	if err != nil {
		return nil, err
	}

	_, err = databaseConnection.Exec(`
            CREATE TRIGGER IF NOT EXISTS update_comment_count_on_delete
            AFTER DELETE ON comments
            FOR EACH ROW
            BEGIN
                UPDATE posts
                SET comment_count = (
                    SELECT COUNT(*)
                    FROM comments
                    WHERE post_id = OLD.post_id
                )
                WHERE id = OLD.post_id;
            END;
        `)
	if err != nil {
		return nil, err
	}

	_, err = databaseConnection.Exec(`
        CREATE TRIGGER IF NOT EXISTS update_reply_count_on_insert
            AFTER INSERT ON replies
            FOR EACH ROW
            BEGIN
                UPDATE comments
                SET reply_count = (
                    SELECT COUNT(*)
                    FROM replies
                    WHERE comment_id = NEW.comment_id
                )
                WHERE id = NEW.comment_id;
            END;
        `)
	if err != nil {
		return nil, err
	}

	_, err = databaseConnection.Exec(`
        CREATE TRIGGER IF NOT EXISTS update_reply_count_on_delete
            AFTER DELETE ON replies
            FOR EACH ROW
            BEGIN
                UPDATE comments
                SET reply_count = (
                    SELECT COUNT(*)
                    FROM replies
                    WHERE comment_id = OLD.comment_id
                )
                WHERE id = OLD.comment_id;
            END;
        `)
	if err != nil {
		return nil, err
	}

	_, err = databaseConnection.Exec(`
        CREATE TRIGGER IF NOT EXISTS update_comments_likes_on_insert
        AFTER INSERT ON comments_likes
        FOR EACH ROW
        BEGIN
            UPDATE comments
            SET likes = (SELECT COUNT(*) FROM comments_likes WHERE comment_id = NEW.comment_id)
            WHERE id = NEW.comment_id;
        END;
    `)
	if err != nil {
		return nil, err
	}

	_, err = databaseConnection.Exec(`
            CREATE TRIGGER IF NOT EXISTS update_comments_likes_on_delete
            AFTER DELETE ON comments_likes
            FOR EACH ROW
            BEGIN
                UPDATE comments
                SET likes = (SELECT COUNT(*) FROM comments_likes WHERE comment_id = OLD.comment_id)
                WHERE id = OLD.comment_id;
            END;
        `)
	if err != nil {
		return nil, err
	}

	_, err = databaseConnection.Exec(`
        CREATE TRIGGER IF NOT EXISTS update_replies_likes_on_insert
        AFTER INSERT ON replies_likes
        FOR EACH ROW
        BEGIN
            UPDATE replies
            SET likes = (SELECT COUNT(*) FROM replies_likes WHERE reply_id = NEW.reply_id)
            WHERE id = NEW.reply_id;
        END;
    `)
	if err != nil {
		return nil, err
	}

	_, err = databaseConnection.Exec(`
            CREATE TRIGGER IF NOT EXISTS update_replies_likes_on_delete
            AFTER DELETE ON replies_likes
            FOR EACH ROW
            BEGIN
                UPDATE replies
                SET likes = (SELECT COUNT(*) FROM replies_likes WHERE reply_id = OLD.reply_id)
                WHERE id = OLD.reply_id;
            END;
        `)
	if err != nil {
		return nil, err
	}

	return databaseConnection, nil
}

// GetDatabaseConnection returns the active database connection instance
func GetDatabaseConnection() *sql.DB {
	return databaseConnection
}

// Legacy function for backward compatibility
func InitDB() (*sql.DB, error) {
	return EstablishDatabaseConnection()
}

// Legacy function for backward compatibility
func GetDB() *sql.DB {
	return GetDatabaseConnection()
}
