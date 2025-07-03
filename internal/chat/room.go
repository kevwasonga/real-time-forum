package chat

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

const (
	socketBufferSize  = 1024
	messageBufferSize = 256
)

// Room represents a single chat room
type Room struct {
	// forward is a channel that holds incoming messages
	// that should be forwarded to the other clients.
	// forward channel is used to send incoming messages to all (other) clients.
	forward chan []byte

	// join is a channel for clients wishing to join the room.
	join chan *Client

	// leave is a channel for clients wishing to leave the room.
	leave chan *Client

	// clients holds all current clients in this room.
	clients map[*Client]bool

	// Topic defines the topic
	topic string

	// Database connection
	db *sql.DB
}

// Convert connection from http request to one that can be used for websocket communication.
var upgrader = &websocket.Upgrader{
	ReadBufferSize:  socketBufferSize,
	WriteBufferSize: socketBufferSize,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// Socket handler
func (r *Room) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	// Convert the connection.
	socket, err := upgrader.Upgrade(w, req, nil)
	if err != nil {
		// If failed log the error.
		log.Fatal("serving http failed ", err)
		return
	}

	client := &Client{
		socket: socket,
		send:   make(chan []byte, messageBufferSize),
		room:   r,
	}

	r.join <- client
	defer func() { r.leave <- client }()

	// Send message back to client.
	go client.write()

	// Keep waiting for messages and read them.
	client.read()
}

// NewRoom creates a new chat room
func NewRoom(topic string, db *sql.DB) *Room {
	return &Room{
		forward: make(chan []byte),
		join:    make(chan *Client),
		leave:   make(chan *Client),
		clients: make(map[*Client]bool),
		topic:   topic,
		db:      db,
	}
}

// Run initializes a chat room
// Keeps watching the three channels inside our room: join, leave, and forward.
// If a message is received on any of those channels,
// the select statement will run the code for that particular case
func (r *Room) Run() {
	log.Printf("running chat room %v", r.topic)
	for {
		select {
		case client := <-r.join:
			log.Printf("new client in room %v", r.topic)
			r.clients[client] = true

		case client := <-r.leave:
			log.Printf("client leaving room %v", r.topic)
			delete(r.clients, client)
			close(client.send)

		case msg := <-r.forward:
			data := FromJSON(msg)
			log.Printf("client '%v' writing message to room %v, message: %v", data.Sender, r.topic, data.Message)

			// Insert message to database.
			_, chatError := r.db.Exec(`INSERT INTO messages(sender, receiver, message, time, status) values(?,?,?, datetime('now','localtime'), ?)`,
				data.Sender, data.Receiver, data.Message, data.Status)
			if chatError != nil {
				fmt.Println(chatError.Error())
				log.Printf("Error inserting message: %v", chatError)
				continue
			}

			// Loop over all the clients in room, and forward the message to all connected clients
			for client := range r.clients {
				select {
				case client.send <- msg:
				default:
					delete(r.clients, client)
					close(client.send)
				}
			}
		}
	}
}
