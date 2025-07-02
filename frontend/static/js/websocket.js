// WebSocket client for real-time communication

window.WebSocketClient = class {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.isConnected = false;
        this.messageQueue = [];
        this.eventListeners = new Map();
        
        // Bind methods
        this.connect = this.connect.bind(this);
        this.disconnect = this.disconnect.bind(this);
        this.send = this.send.bind(this);
        this.onOpen = this.onOpen.bind(this);
        this.onMessage = this.onMessage.bind(this);
        this.onClose = this.onClose.bind(this);
        this.onError = this.onError.bind(this);
    }

    /**
     * Connect to WebSocket server
     */
    connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/api/ws`;
            
            console.log('🔌 Connecting to WebSocket:', wsUrl);
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = this.onOpen;
            this.ws.onmessage = this.onMessage;
            this.ws.onclose = this.onClose;
            this.ws.onerror = this.onError;
            
        } catch (error) {
            console.error('❌ WebSocket connection failed:', error);
            this.scheduleReconnect();
        }
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        this.reconnectAttempts = 0;
    }

    /**
     * Send message to server
     */
    send(type, data = {}) {
        const message = {
            type,
            data,
            timestamp: new Date().toISOString()
        };

        if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify(message));
                console.log('📤 Sent WebSocket message:', message);
            } catch (error) {
                console.error('❌ Failed to send WebSocket message:', error);
                this.messageQueue.push(message);
            }
        } else {
            // Queue message for when connection is restored
            this.messageQueue.push(message);
            console.log('📝 Queued WebSocket message:', message);
        }
    }

    /**
     * Add event listener
     */
    addEventListener(type, callback) {
        if (!this.eventListeners.has(type)) {
            this.eventListeners.set(type, []);
        }
        this.eventListeners.get(type).push(callback);
    }

    /**
     * Remove event listener
     */
    removeEventListener(type, callback) {
        if (this.eventListeners.has(type)) {
            const listeners = this.eventListeners.get(type);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Emit event to listeners
     */
    emit(type, data) {
        if (this.eventListeners.has(type)) {
            this.eventListeners.get(type).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ Error in WebSocket event listener for ${type}:`, error);
                }
            });
        }
    }

    /**
     * WebSocket event handlers
     */
    onOpen(event) {
        console.log('✅ WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Send queued messages
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.ws.send(JSON.stringify(message));
            console.log('📤 Sent queued message:', message);
        }

        // Send ping to establish connection
        this.send('ping');
        
        // Emit connected event
        this.emit('connected', event);
    }

    onMessage(event) {
        try {
            const message = JSON.parse(event.data);
            console.log('📥 Received WebSocket message:', message);
            
            // Handle different message types
            switch (message.type) {
                case 'pong':
                    this.handlePong(message);
                    break;
                case 'private_message':
                    this.handlePrivateMessage(message);
                    break;
                case 'new_post':
                    this.handleNewPost(message);
                    break;
                case 'user_status':
                    this.handleUserStatus(message);
                    break;
                case 'typing_indicator':
                    this.handleTypingIndicator(message);
                    break;
                case 'notification':
                    this.handleNotification(message);
                    break;
                default:
                    console.log('🔍 Unknown message type:', message.type);
            }
            
            // Emit generic message event
            this.emit('message', message);
            
            // Emit specific event for message type
            this.emit(message.type, message.data);
            
        } catch (error) {
            console.error('❌ Failed to parse WebSocket message:', error);
        }
    }

    onClose(event) {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        this.isConnected = false;
        
        // Emit disconnected event
        this.emit('disconnected', event);
        
        // Attempt to reconnect if not a clean close
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
        }
    }

    onError(error) {
        console.error('❌ WebSocket error:', error);
        this.emit('error', error);
    }

    /**
     * Schedule reconnection attempt
     */
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        console.log(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
        
        setTimeout(() => {
            if (!this.isConnected) {
                this.connect();
            }
        }, delay);
    }

    /**
     * Message handlers
     */
    handlePong(message) {
        console.log('🏓 Received pong');
    }

    handlePrivateMessage(message) {
        console.log('💬 Received private message:', message.data);
        
        // Update chat UI if available
        if (window.forumApp && window.forumApp.chatComponent) {
            window.forumApp.chatComponent.addMessage(message.data);
        }
        
        // Show notification
        if (window.forumApp && window.forumApp.notificationComponent) {
            const msg = message.data;
            window.forumApp.notificationComponent.info(
                `New message from ${msg.senderName}: ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`
            );
        }
    }

    handleNewPost(message) {
        console.log('📝 New post created:', message.data);
        
        // Update posts list if on posts page
        if (window.forumApp && window.forumApp.currentPage === 'posts') {
            if (window.forumApp.postsComponent) {
                window.forumApp.postsComponent.addPost(message.data);
            }
        }
        
        // Show notification
        if (window.forumApp && window.forumApp.notificationComponent) {
            const post = message.data;
            window.forumApp.notificationComponent.info(
                `New post: ${post.title}`
            );
        }
    }

    handleUserStatus(message) {
        console.log('👤 User status update:', message.data);
        
        // Update sidebar if available
        if (window.forumApp && window.forumApp.sidebarComponent) {
            window.forumApp.sidebarComponent.updateUserStatus(message.data);
        }
    }

    handleTypingIndicator(message) {
        console.log('⌨️ Typing indicator:', message.data);
        
        // Update chat UI if available
        if (window.forumApp && window.forumApp.chatComponent) {
            window.forumApp.chatComponent.updateTypingIndicator(message.data);
        }
    }

    handleNotification(message) {
        console.log('🔔 Notification:', message.data);
        
        // Show notification
        if (window.forumApp && window.forumApp.notificationComponent) {
            const notification = message.data;
            window.forumApp.notificationComponent.show(
                notification.message,
                notification.type || 'info'
            );
        }
    }

    /**
     * Convenience methods for sending specific message types
     */


    sendTypingIndicator(receiverId, isTyping) {
        this.send('typing_indicator', { receiverId, isTyping });
    }

    ping() {
        this.send('ping');
    }
};
