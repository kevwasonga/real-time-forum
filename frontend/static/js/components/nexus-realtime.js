/**
 * Community Nexus - Real-time WebSocket Component
 * Handles WebSocket connections and real-time features
 */

class NexusRealtime {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.heartbeatInterval = null;
        this.messageQueue = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        console.log('🔌 Real-time component initialized');
    }

    setupEventListeners() {
        // Listen for authentication changes
        nexusCore.on('user:authenticated', (event) => {
            this.connect(event.detail.id);
        });

        nexusCore.on('user:logout', () => {
            this.disconnect();
        });

        // Listen for page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.handlePageHidden();
            } else {
                this.handlePageVisible();
            }
        });

        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.handleOnline();
        });

        window.addEventListener('offline', () => {
            this.handleOffline();
        });
    }

    /**
     * Establish WebSocket connection
     */
    connect(userId) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/api/ws?userID=${userId}`;
            
            console.log('🔌 Connecting to WebSocket:', wsUrl);
            
            this.socket = new WebSocket(wsUrl);
            this.setupSocketHandlers();
        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.handleConnectionError();
        }
    }

    /**
     * Setup WebSocket event handlers
     */
    setupSocketHandlers() {
        this.socket.onopen = (event) => {
            console.log('✅ WebSocket connected');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            // Start heartbeat
            this.startHeartbeat();
            
            // Process queued messages
            this.processMessageQueue();
            
            // Emit connection event
            nexusCore.emit('websocket:connected');
            
            // Show connection notification
            nexusCore.showNotification('Real-time features enabled', 'success', 3000);
        };

        this.socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        this.socket.onclose = (event) => {
            console.log('🔌 WebSocket disconnected:', event.code, event.reason);
            this.isConnected = false;
            this.stopHeartbeat();
            
            // Emit disconnection event
            nexusCore.emit('websocket:disconnected');
            
            // Attempt reconnection if not intentional
            if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
                this.attemptReconnection();
            }
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.handleConnectionError();
        };
    }

    /**
     * Handle incoming WebSocket messages
     */
    handleMessage(message) {
        console.log('📨 WebSocket message received:', message.type);
        
        switch (message.type) {
            case 'private_message':
                this.handlePrivateMessage(message);
                break;
                
            case 'discussion_update':
                this.handleDiscussionUpdate(message);
                break;
                
            case 'user_status':
                this.handleUserStatus(message);
                break;
                
            case 'notification':
                this.handleNotification(message);
                break;
                
            case 'typing_indicator':
                this.handleTypingIndicator(message);
                break;
                
            case 'pong':
                this.handlePong(message);
                break;
                
            default:
                console.log('Unknown message type:', message.type);
        }
    }

    /**
     * Handle private message
     */
    handlePrivateMessage(message) {
        nexusCore.emit('websocket:private_message', message.data);
        
        // Show notification if not on messages page
        if (nexusNavigation.getCurrentPage() !== 'messages') {
            nexusCore.showNotification(
                `New message from ${message.data.senderName || 'Someone'}`, 
                'info'
            );
        }
    }

    /**
     * Handle discussion update
     */
    handleDiscussionUpdate(message) {
        nexusCore.emit('websocket:discussion_update', message.data);
        
        // Update discussions if on discussions page
        if (nexusNavigation.getCurrentPage() === 'discussions') {
            // Trigger discussions component to refresh
            nexusCore.emit('discussions:refresh');
        }
    }

    /**
     * Handle user status change
     */
    handleUserStatus(message) {
        nexusCore.emit('websocket:user_status', message.data);
        
        // Show online/offline notifications for friends
        const status = message.data.status;
        const userId = message.data.userId;
        
        // Only show for friends (implement friend check logic)
        if (this.isFriend(userId)) {
            const statusText = status === 'online' ? 'came online' : 'went offline';
            nexusCore.showNotification(
                `${message.data.userName || 'A friend'} ${statusText}`, 
                'info', 
                3000
            );
        }
    }

    /**
     * Handle notification
     */
    handleNotification(message) {
        const notification = message.data;
        
        switch (notification.type) {
            case 'like':
                nexusCore.showNotification(
                    'Someone liked your post!', 
                    'success'
                );
                break;
                
            case 'comment':
                nexusCore.showNotification(
                    'New comment on your post!', 
                    'info'
                );
                break;
                
            case 'friend_request':
                nexusCore.showNotification(
                    'New friend request!', 
                    'info'
                );
                break;
                
            default:
                nexusCore.showNotification(
                    notification.message || 'New notification', 
                    'info'
                );
        }
    }

    /**
     * Handle typing indicator
     */
    handleTypingIndicator(message) {
        nexusCore.emit('websocket:typing_indicator', message.data);
    }

    /**
     * Handle pong response
     */
    handlePong(message) {
        // Connection is alive
        console.log('💓 Heartbeat received');
    }

    /**
     * Send message through WebSocket
     */
    send(type, data) {
        const message = {
            type: type,
            data: data,
            timestamp: new Date().toISOString()
        };

        if (this.isConnected && this.socket.readyState === WebSocket.OPEN) {
            try {
                this.socket.send(JSON.stringify(message));
                console.log('📤 WebSocket message sent:', type);
            } catch (error) {
                console.error('Error sending WebSocket message:', error);
                this.queueMessage(message);
            }
        } else {
            this.queueMessage(message);
        }
    }

    /**
     * Queue message for later sending
     */
    queueMessage(message) {
        this.messageQueue.push(message);
        console.log('📥 Message queued:', message.type);
    }

    /**
     * Process queued messages
     */
    processMessageQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            try {
                this.socket.send(JSON.stringify(message));
                console.log('📤 Queued message sent:', message.type);
            } catch (error) {
                console.error('Error sending queued message:', error);
                // Put it back in queue
                this.messageQueue.unshift(message);
                break;
            }
        }
    }

    /**
     * Start heartbeat to keep connection alive
     */
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected) {
                this.send('ping', { timestamp: Date.now() });
            }
        }, 30000); // Send ping every 30 seconds
    }

    /**
     * Stop heartbeat
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Attempt reconnection
     */
    attemptReconnection() {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
        
        setTimeout(() => {
            if (nexusCore.isAuthenticated && nexusCore.currentUser) {
                this.connect(nexusCore.currentUser.id);
            }
        }, delay);
    }

    /**
     * Handle connection error
     */
    handleConnectionError() {
        if (this.reconnectAttempts === 0) {
            nexusCore.showNotification('Connection lost. Attempting to reconnect...', 'warning');
        }
    }

    /**
     * Handle page hidden
     */
    handlePageHidden() {
        // Reduce heartbeat frequency when page is hidden
        this.stopHeartbeat();
        this.startHeartbeat(60000); // 1 minute intervals
    }

    /**
     * Handle page visible
     */
    handlePageVisible() {
        // Resume normal heartbeat
        this.stopHeartbeat();
        this.startHeartbeat();
        
        // Reconnect if disconnected
        if (!this.isConnected && nexusCore.isAuthenticated) {
            this.connect(nexusCore.currentUser.id);
        }
    }

    /**
     * Handle online event
     */
    handleOnline() {
        console.log('🌐 Network connection restored');
        if (!this.isConnected && nexusCore.isAuthenticated) {
            this.connect(nexusCore.currentUser.id);
        }
    }

    /**
     * Handle offline event
     */
    handleOffline() {
        console.log('📴 Network connection lost');
        nexusCore.showNotification('Network connection lost', 'warning');
    }

    /**
     * Disconnect WebSocket
     */
    disconnect() {
        if (this.socket) {
            this.socket.close(1000, 'User logout');
            this.socket = null;
        }
        this.isConnected = false;
        this.stopHeartbeat();
        this.messageQueue = [];
        console.log('🔌 WebSocket disconnected');
    }

    /**
     * Send private message
     */
    sendPrivateMessage(recipientId, content) {
        this.send('private_message', {
            recipientId: recipientId,
            content: content
        });
    }

    /**
     * Send typing indicator
     */
    sendTypingIndicator(recipientId, isTyping) {
        this.send('typing_indicator', {
            recipientId: recipientId,
            isTyping: isTyping
        });
    }

    /**
     * Broadcast discussion update
     */
    broadcastDiscussionUpdate(discussionId, updateType, data) {
        this.send('discussion_update', {
            discussionId: discussionId,
            updateType: updateType,
            data: data
        });
    }

    /**
     * Check if user is friend (placeholder)
     */
    isFriend(userId) {
        // TODO: Implement friend checking logic
        return false;
    }

    /**
     * Get connection status
     */
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            queuedMessages: this.messageQueue.length
        };
    }
}

// Initialize real-time component
document.addEventListener('DOMContentLoaded', () => {
    window.nexusRealtime = new NexusRealtime();
    nexusCore.registerComponent('realtime', NexusRealtime);
});
