package chat

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
)

// ChatServer manages all chat rooms
type ChatServer struct {
	db         *sql.DB
	rooms      map[string]*Room
	registered map[string]string
}

// NewChatServer creates a new chat server
func NewChatServer(db *sql.DB) *ChatServer {
	return &ChatServer{
		db:         db,
		rooms:      make(map[string]*Room),
		registered: make(map[string]string),
	}
}

// RunRoutine continuously checks for new chats and creates rooms
func (cs *ChatServer) RunRoutine() {
	log.Println("🗨️ Starting chat server routine...")

	for {
		// Get all chats from database
		rows, err := cs.db.Query("SELECT * FROM chats")
		if err != nil {
			log.Printf("Error querying chats: %v", err)
			continue
		}

		var chats []map[string]string
		for rows.Next() {
			var id int
			var user1, user2 string
			err := rows.Scan(&id, &user1, &user2)
			if err != nil {
				log.Printf("Error scanning chat row: %v", err)
				continue
			}
			chats = append(chats, map[string]string{
				"user1": user1,
				"user2": user2,
			})
		}
		rows.Close()

		// Create room names in format user1~user2
		var roomNames []string
		for _, chat := range chats {
			roomNames = append(roomNames, chat["user1"]+"~"+chat["user2"])
		}

		// Register new rooms
		for _, name := range roomNames {
			if _, ok := cs.registered[name]; !ok {
				room := NewRoom(name, cs.db)
				cs.rooms[name] = room
				cs.registered[name] = room.topic
				
				// Register HTTP handler
				http.Handle("/chat/"+name, room)
				
				// Start room goroutine
				go room.Run()
				
				log.Printf("🗨️ Registered new chat room: %s", name)
			}
		}
	}
}

// ExecuteSQL helper function for compatibility
func ExecuteSQL(db *sql.DB, queryStr string) []byte {
	rows, err := db.Query(queryStr)
	if err != nil {
		log.Printf("Query failed: %v", err)
		return []byte("[]")
	}
	defer rows.Close()

	columns, _ := rows.Columns()
	count := len(columns)

	var data []interface{}

	for rows.Next() {
		values := make([]interface{}, count)
		valuePtrs := make([]interface{}, count)
		for i := range columns {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}

		m := make(map[string]interface{})
		for i := range columns {
			m[columns[i]] = values[i]
		}
		data = append(data, m)
	}

	jsonMsg, err := json.Marshal(data)
	if err != nil {
		log.Printf("Error marshaling JSON: %v", err)
		return []byte("[]")
	}
	return jsonMsg
}
