const WebSocketManager = {
    socket: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    reconnectDelay: 1000,
    enableReconnection: true,

    connect() {

        if (!this.enableReconnection) {
            console.log('WebSocket reconnection is disabled during development.');
            return;
        }

        if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
            return;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.socket = new window.WebSocket(`${protocol}//${window.location.host}/api/ws`);

        this.socket.onopen = () => {
            console.log('WebSocket connected');
            this.reconnectAttempts = 0;
            this.reconnectDelay = 1000;
        };

        this.socket.onclose = () => {
            console.log('WebSocket disconnected. Attempting to reconnect...');
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                setTimeout(() => {
                    this.connect();
                }, this.reconnectDelay);
                this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Cap at 30 seconds
                this.reconnectAttempts++;
            } else {
                console.log('Max reconnection attempts reached. Stopping reconnection.');
            }
        };


        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };
    },

    reconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Max reconnection attempts reached');
            return;
        }

        setTimeout(() => {
            console.log(`Attempting to reconnect (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
            this.connect();
            this.reconnectAttempts++;
            this.reconnectDelay *= 2;
        }, this.reconnectDelay);
    },

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    },

    send(type, data) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type,
                data,
                timestamp: new Date().toISOString()
            }));
        } else {
            console.error('WebSocket is not connected');
        }
    },

    handleMessage(message) {
        switch (message.type) {
            case 'post':
                Posts.handlePostUpdate(message.data);
                break;

            case 'comment':
                Posts.handleCommentUpdate(message.data);
                break;

            case 'like':
                Posts.handleLikeUpdate(message.data);
                break;

            case 'private_message':
                Messages.handleNewMessage(message.data);
                break;

            case 'user_status':
                this.handleUserStatus(message.data);
                break;

            case 'friend_request':
                this.handleFriendRequest(message.data);
                break;

            case 'friend_response':
                this.handleFriendResponse(message.data);
                break;

            case 'notification':
                this.handleNotification(message.data);
                break;

            default:
                console.warn('Unknown message type:', message.type);
        }
    },

    handleUserStatus(data) {
        const contactElement = document.querySelector(`.contact[data-user-id="${data.user_id}"]`);
        if (contactElement) {
            contactElement.classList.toggle('online', data.online);
            const statusElement = contactElement.querySelector('.contact-status');
            if (statusElement) {
                statusElement.textContent = data.online ? 'Online' : 'Offline';
            }
        }
    },

    handleFriendRequest(data) {
        const requestsContainer = document.getElementById('friend-requests');
        const requestHTML = Templates.friendRequest(data);
        requestsContainer.insertAdjacentHTML('afterbegin', requestHTML);

        // Update friend requests count
        this.updateNotificationCount('friend-requests');
    },

    handleFriendResponse(data) {
        const requestElement = document.querySelector(`.friend-request[data-request-id="${data.request_id}"]`);
        if (requestElement) {
            requestElement.remove();
        }

        if (data.accepted) {
            const contactsContainer = document.getElementById('online-contacts');
            const contactHTML = Templates.contact(data.user);
            contactsContainer.insertAdjacentHTML('beforeend', contactHTML);
        }
    },

    handleNotification(data) {
        // Update notification badge
        const notificationBadge = document.querySelector('.notifications-count');
        if (notificationBadge) {
            const currentCount = parseInt(notificationBadge.textContent) || 0;
            notificationBadge.textContent = currentCount + 1;
            notificationBadge.classList.remove('hidden');
        }

        // You can implement a toast notification system here
        console.log('New notification:', data.message);
    },

    updateNotificationCount(type) {
        const badge = document.querySelector(`.${type}-count`);
        if (badge) {
            const currentCount = parseInt(badge.textContent) || 0;
            badge.textContent = currentCount + 1;
            badge.classList.remove('hidden');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    WebSocketManager.connect();
});