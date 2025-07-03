-- Messaging system schema based on reference implementation
-- Drop existing tables if they exist
DROP TABLE IF EXISTS chats;
DROP TABLE IF EXISTS messages;

-- Create chats table (equivalent to conversations)
CREATE TABLE IF NOT EXISTS chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user1 VARCHAR(255) NOT NULL,
    user2 VARCHAR(255) NOT NULL
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender VARCHAR(64),
    receiver VARCHAR(64),
    message TEXT,
    time TEXT NOT NULL,
    status VARCHAR(64)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chats_users ON chats(user1, user2);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver);
CREATE INDEX IF NOT EXISTS idx_messages_time ON messages(time);
