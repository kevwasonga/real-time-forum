// Simple messaging implementation based on reference
class SimpleMessaging {
    constructor() {
        // Get current user from the authentication system
        if (window.auth && window.auth.isLoggedIn()) {
            const user = window.auth.getCurrentUser();
            this.currentUser = user ? user.nickname : null;
            console.log('✅ Current user from auth system:', this.currentUser);
        } else {
            // Fallback: try localStorage
            this.currentUser = localStorage.getItem('username');
            console.log('🔍 Current user from localStorage:', this.currentUser);
        }

        if (!this.currentUser) {
            console.error('❌ No current user found! User needs to login.');
            return;
        }

        console.log('✅ Current user identified:', this.currentUser);

        this.users = [];
        this.sessions = [];
        this.chats = [];
        this.messages = [];
        this.currentChatWindow = null;
        this.currentChatUser = null;
        this.websocket = null;
        this.notifications = new Map(); // Track notifications per user
        this.initNotificationSound();

        this.init();
    }

    async init() {
        console.log('🗨️ Initializing simple messaging...');
        await this.loadData();
        this.renderUserList();
        this.setupEventListeners();
    }

    async loadData() {
        try {
            // Load users, sessions, chats, and messages
            await Promise.all([
                this.fetchData('users'),
                this.fetchData('sessions'), 
                this.fetchData('chats'),
                this.fetchData('messages')
            ]);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    async fetchData(endpoint) {
        try {
            const response = await fetch(`/api/${endpoint}`);
            const data = await response.json();
            this[endpoint] = data || [];
            console.log(`📊 Loaded ${endpoint}:`, this[endpoint]);
        } catch (error) {
            console.error(`Error fetching ${endpoint}:`, error);
            this[endpoint] = [];
        }
    }

    renderUserList() {
        const container = document.getElementById('messengerPage');
        if (!container) return;

        container.innerHTML = '';

        // Add refresh button
        const refreshBtn = document.createElement('button');
        refreshBtn.innerHTML = '🔄 Refresh';
        refreshBtn.className = 'refresh-btn';
        refreshBtn.onclick = () => this.loadData().then(() => this.renderUserList());
        container.appendChild(refreshBtn);

        // Get latest message info for sorting
        const latestInfo = this.getLatestMessageInfo();

        // Render user list
        latestInfo.forEach(userInfo => {
            const userDiv = this.createUserDiv(userInfo);
            container.appendChild(userDiv);
        });
    }

    getLatestMessageInfo() {
        const latestInfo = [];
        const currentUser = this.currentUser;

        // Get latest messages for each user
        if (this.messages && this.messages.length > 0) {
            for (let i = this.messages.length - 1; i >= 0; i--) {
                const msg = this.messages[i];
                const isReceived = msg.receiver === currentUser;
                const isSent = msg.sender === currentUser;
                
                if (isReceived || isSent) {
                    const otherUser = isReceived ? msg.sender : msg.receiver;
                    
                    // Check if we already have info for this user
                    if (!latestInfo.some(info => info.username === otherUser)) {
                        latestInfo.push({
                            username: otherUser,
                            lastMessage: msg.message,
                            time: msg.time,
                            hasMessages: true
                        });
                    }
                }
            }
        }

        // Add users with no messages
        if (this.users) {
            this.users.forEach(user => {
                if (user.username !== currentUser && 
                    !latestInfo.some(info => info.username === user.username)) {
                    latestInfo.push({
                        username: user.username,
                        online: user.online,
                        hasMessages: false
                    });
                }
            });
        }

        return latestInfo;
    }

    createUserDiv(userInfo) {
        const div = document.createElement('div');
        div.className = 'chat-room';
        div.id = `${this.currentUser}<->${userInfo.username}`;

        const isOnline = this.sessions.some(session => session.username === userInfo.username);
        const statusText = isOnline ? 'online' : 'offline';
        const bgColor = isOnline ? '#252831' : '#1e2124';

        div.style.backgroundColor = bgColor;
        div.style.borderRadius = '10px';
        div.style.padding = '1.5%';
        div.style.width = '100%';
        div.style.marginBottom = '5px';
        div.style.cursor = 'pointer';

        div.innerHTML = `
            <h3>${userInfo.username}</h3>
            <p>${statusText}</p>
            <em>${isOnline ? 'Click to chat' : 'Click to send message'}</em>
        `;

        div.addEventListener('click', () => {
            this.openChatWindow(userInfo.username);
        });

        return div;
    }

    async openChatWindow(otherUser) {
        console.log(`💬 Opening chat with ${otherUser}`);

        // Close existing chat window
        if (this.currentChatWindow) {
            this.currentChatWindow.remove();
        }

        // Create chat window
        this.currentChatWindow = this.createChatWindow(otherUser);
        document.body.appendChild(this.currentChatWindow);

        // Load messages for this chat
        await this.loadChatMessages(otherUser);

        // Create chat in database
        await this.createChat(this.currentUser, otherUser);

        // Connect to WebSocket
        this.connectToChat(otherUser);
    }

    createChatWindow(otherUser) {
        const chatWindow = document.createElement('div');
        chatWindow.className = 'chat-window';
        chatWindow.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 500px;
            height: 400px;
            background: #1e2124;
            border: 2px solid #333;
            border-radius: 10px;
            z-index: 1000;
            display: flex;
            flex-direction: column;
        `;

        chatWindow.innerHTML = `
            <div class="chat-header" style="padding: 10px; background: #252831; color: white; border-radius: 8px 8px 0 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                <span>Chat with: ${otherUser}</span>
                <button class="close-btn" style="float: right; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer; padding: 5px 8px;">✕</button>
            </div>
            <div class="chat-messages" style="flex: 1; padding: 10px; overflow-y: auto; background: #1e2124; color: white;"></div>
            <div class="chat-input" style="padding: 10px; border-top: 1px solid rgba(255, 255, 255, 0.1); background: #252831;">
                <input type="text" placeholder="Type a message..." style="width: 80%; padding: 8px; background: #1e2124; color: white; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 5px;">
                <button class="send-btn" style="width: 18%; padding: 8px; background: #8b9dc3; color: white; border: none; border-radius: 5px; cursor: pointer;">Send</button>
            </div>
        `;

        // Add event listeners
        const closeBtn = chatWindow.querySelector('.close-btn');
        const sendBtn = chatWindow.querySelector('.send-btn');
        const input = chatWindow.querySelector('input');

        closeBtn.onclick = () => {
            this.closeChatWindow();
        };

        sendBtn.onclick = () => {
            const message = input.value.trim();
            if (message) {
                this.sendMessage(otherUser, message);
                input.value = '';
                input.focus();
            }
        };

        input.onkeypress = (e) => {
            if (e.key === 'Enter') {
                const message = input.value.trim();
                if (message) {
                    this.sendMessage(otherUser, message);
                    input.value = '';
                    input.focus();
                }
            }
        };

        return chatWindow;
    }

    closeChatWindow() {
        if (this.currentChatWindow) {
            this.currentChatWindow.remove();
            this.currentChatWindow = null;
        }
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
        this.currentChatUser = null;
    }

    initNotificationSound() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    }

    playNotificationSound() {
        if (!this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.3);
        } catch (e) {
            console.log('Could not play notification sound');
        }
    }

    showNotification(sender, message) {
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }

        if (Notification.permission === 'granted') {
            const notification = new Notification(`New message from ${sender}`, {
                body: message.length > 50 ? message.substring(0, 50) + '...' : message,
                tag: `message-${sender}`,
                requireInteraction: true
            });

            notification.onclick = () => {
                window.focus();
                this.openChatWindow(sender);
                notification.close();
            };

            setTimeout(() => notification.close(), 5000);
        }

        this.playNotificationSound();
        this.showInAppNotification(sender, message);
    }

    showInAppNotification(sender, message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #252831;
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            border-left: 4px solid #8b9dc3;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            max-width: 300px;
            cursor: pointer;
            transition: all 0.3s ease;
        `;

        notification.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">💬 ${sender}</div>
            <div style="font-size: 0.9em; opacity: 0.9;">${message.length > 60 ? message.substring(0, 60) + '...' : message}</div>
            <div style="font-size: 0.8em; opacity: 0.7; margin-top: 5px;">Click to reply</div>
        `;

        notification.onclick = () => {
            this.openChatWindow(sender);
            notification.remove();
        };

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    updateNotificationBadge(sender) {
        const currentCount = this.notifications.get(sender) || 0;
        this.notifications.set(sender, currentCount + 1);
    }

    clearNotificationBadge(sender) {
        this.notifications.delete(sender);
    }

    showError(message) {
        console.error('❌ Error:', message);

        // Show error in chat window if it exists
        if (this.currentChatWindow) {
            const messagesDiv = this.currentChatWindow.querySelector('.chat-messages');
            if (messagesDiv) {
                const errorDiv = document.createElement('div');
                errorDiv.style.cssText = `
                    padding: 8px;
                    margin: 5px 0;
                    background: #dc3545;
                    color: white;
                    border-radius: 5px;
                    font-size: 0.9em;
                    text-align: center;
                `;
                errorDiv.textContent = message;
                messagesDiv.appendChild(errorDiv);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
        }
    }

    async loadChatMessages(otherUser) {
        try {
            const response = await fetch(`/api/messages?user=${otherUser}`);
            const messages = await response.json();
            
            const messagesContainer = this.currentChatWindow.querySelector('.chat-messages');
            messagesContainer.innerHTML = '';

            messages.forEach(msg => {
                this.displayMessage(msg);
            });

            // Scroll to bottom
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } catch (error) {
            console.error('Error loading chat messages:', error);
        }
    }

    displayMessage(message) {
        const isOwnMessage = message.sender === this.currentUser;

        // Show notification for incoming messages (not own messages)
        if (!isOwnMessage && message.sender !== this.currentUser) {
            // Only show notification if chat window is not open or not focused
            if (!this.currentChatWindow || this.currentChatUser !== message.sender || document.hidden) {
                this.showNotification(message.sender, message.message);
            }
        }

        // If no chat window is open, don't display the message visually yet
        if (!this.currentChatWindow) return;

        // Only display if this message is for the current chat
        if (this.currentChatUser && (message.sender === this.currentChatUser || message.receiver === this.currentChatUser || isOwnMessage)) {
            const messagesContainer = this.currentChatWindow.querySelector('.chat-messages');
            const messageDiv = document.createElement('div');
            messageDiv.style.marginBottom = '10px';

            messageDiv.style.textAlign = isOwnMessage ? 'right' : 'left';

            messageDiv.innerHTML = `
                <div style="display: inline-block; padding: 8px; border-radius: 10px; max-width: 70%;
                            background: ${isOwnMessage ? '#8b9dc3' : '#252831'};
                            color: white; border: 1px solid rgba(255, 255, 255, 0.1);">
                    <strong>${message.sender}:</strong> ${message.message}
                    <div style="font-size: 0.8em; opacity: 0.7;">${message.time}</div>
                </div>
            `;

            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

            // Clear notification badge when viewing messages
            if (!isOwnMessage) {
                this.clearNotificationBadge(message.sender);
            }
        }
    }

    async createChat(user1, user2) {
        try {
            await fetch('/api/chats', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ user1, user2 })
            });
        } catch (error) {
            console.error('Error creating chat:', error);
        }
    }

    connectToChat(otherUser) {
        // Close existing connection if any
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }

        this.currentChatUser = otherUser;
        const chatRoom = `${this.currentUser}~${otherUser}`;
        const wsUrl = `ws://${window.location.host}/chat/${chatRoom}`;

        console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);

        try {
            this.websocket = new WebSocket(wsUrl);

            this.websocket.onopen = () => {
                console.log('✅ WebSocket connected successfully');
            };

            this.websocket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.displayMessage(message);
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            };

            this.websocket.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
            };

            this.websocket.onclose = (event) => {
                console.log('🔌 WebSocket connection closed:', event.code, event.reason);
                this.websocket = null;

                // Auto-reconnect if the chat window is still open and it wasn't a manual close
                if (this.currentChatWindow && event.code !== 1000) {
                    console.log('🔄 Attempting to reconnect...');
                    setTimeout(() => {
                        if (this.currentChatWindow && this.currentChatUser) {
                            this.connectToChat(this.currentChatUser);
                        }
                    }, 2000);
                }
            };
        } catch (error) {
            console.error('❌ Failed to create WebSocket:', error);
        }
    }

    sendMessage(receiver, content) {
        if (!content.trim()) {
            console.log('❌ Cannot send empty message');
            return;
        }

        if (!this.websocket) {
            console.log('❌ No WebSocket connection, attempting to reconnect...');
            this.connectToChat(receiver);
            return;
        }

        if (this.websocket.readyState !== WebSocket.OPEN) {
            console.log('❌ WebSocket not ready, state:', this.websocket.readyState);

            if (this.websocket.readyState === WebSocket.CONNECTING) {
                // Wait for connection to open
                this.websocket.addEventListener('open', () => {
                    this.sendMessage(receiver, content);
                }, { once: true });
                return;
            } else {
                // Connection is closing or closed, reconnect
                console.log('🔄 Reconnecting WebSocket...');
                this.connectToChat(receiver);
                return;
            }
        }

        try {
            const message = {
                message: content,
                sender: this.currentUser,
                receiver: receiver,
                status: 'unread'
            };

            console.log('📤 Sending message:', message);
            this.websocket.send(JSON.stringify(message));

            // Optionally display the message immediately for better UX
            this.displayMessage({
                ...message,
                time: new Date().toLocaleTimeString()
            });

        } catch (error) {
            console.error('❌ Error sending message:', error);
        }
    }

    setupEventListeners() {
        // Add any global event listeners here
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentChatWindow) {
                this.closeChatWindow();
            }
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname === '/messages') {
        new SimpleMessaging();
    }
});
