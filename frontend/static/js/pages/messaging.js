// Simple messaging page functionality based on reference implementation
class MessagingPage {
    constructor() {
        this.currentUser = localStorage.getItem('username');
        this.users = [];
        this.sessions = [];
        this.chats = [];
        this.messages = [];
        this.currentChatWindow = null;
        this.currentChatUser = null;
        this.websocket = null;
        this.notifications = new Map(); // Track notifications per user
        this.notificationSound = null;
        this.initNotificationSound();

        this.init();
    }

    async init() {
        try {
            console.log('🚀 Initializing simple messaging page...');
            this.render();
            console.log('📱 Rendered messaging interface');

            // Add a small delay to ensure DOM is ready
            await new Promise(resolve => setTimeout(resolve, 100));

            await this.loadData();
            console.log('💬 Loaded messaging data');

            this.renderUserList();
            console.log('👥 Rendered user list');

            this.setupEventListeners();
            console.log('🎯 Set up event listeners');

            console.log('✅ Simple messaging page initialization complete');
        } catch (error) {
            console.error('❌ Error initializing messaging page:', error);
            this.showError('Failed to initialize messaging: ' + error.message);
        }
    }

    render() {
        console.log('🎨 Rendering simple messaging interface...');

        const mainContent = document.getElementById('main-content');
        if (!mainContent) {
            console.error('❌ main-content element not found!');
            return;
        }

        const content = `
            <div class="simple-messaging-container">
                <div class="messaging-header">
                    <h2>Messages</h2>
                    <button class="refresh-btn" id="refreshBtn">🔄 Refresh</button>
                </div>

                <div class="messenger-page" id="messengerPage">
                    <!-- User list will be populated here -->
                </div>
            </div>
        `;

        mainContent.innerHTML = content;

        // Add basic styles
        this.addStyles();

        console.log('✅ Simple messaging interface rendered successfully');
    }

    addStyles() {
        if (document.getElementById('simple-messaging-styles')) return;

        const style = document.createElement('style');
        style.id = 'simple-messaging-styles';
        style.textContent = `
            .simple-messaging-container {
                padding: 20px;
                max-width: 800px;
                margin: 0 auto;
                background: #1e2124;
                min-height: calc(100vh - 100px);
                border-radius: 10px;
            }

            .messaging-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 2px solid #333;
            }

            .refresh-btn {
                background: #007bff;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 5px;
                cursor: pointer;
            }

            .refresh-btn:hover {
                background: #0056b3;
            }

            .chat-room {
                background: #252831;
                color: white;
                padding: 15px;
                margin-bottom: 10px;
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.3s ease;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .chat-room:hover {
                background: #2a2d37;
                transform: translateX(5px);
                border-color: rgba(255, 255, 255, 0.2);
            }

            .chat-room h3 {
                margin: 0 0 5px 0;
                font-size: 1.2em;
            }

            .chat-room p {
                margin: 0 0 5px 0;
                opacity: 0.8;
            }

            .chat-room em {
                font-size: 0.9em;
                opacity: 0.7;
            }
        `;

        document.head.appendChild(style);
    }

    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadData().then(() => this.renderUserList());
            });
        }

        // Global event listeners
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentChatWindow) {
                this.closeChatWindow();
            }
        });
    }

    async loadData() {
        try {
            console.log('📊 Loading messaging data...');

            // Load users, sessions, chats, and messages
            await Promise.all([
                this.fetchData('users'),
                this.fetchData('sessions'),
                this.fetchData('chats'),
                this.fetchData('messages')
            ]);

            console.log('✅ All messaging data loaded');
        } catch (error) {
            console.error('❌ Error loading messaging data:', error);
        }
    }

    async fetchData(endpoint) {
        try {
            const response = await fetch(`/api/${endpoint}`);
            const data = await response.json();
            this[endpoint] = data || [];
            console.log(`📊 Loaded ${endpoint}:`, this[endpoint]);
        } catch (error) {
            console.error(`❌ Error fetching ${endpoint}:`, error);
            this[endpoint] = [];
        }
    }

    renderUserList() {
        const container = document.getElementById('messengerPage');
        if (!container) return;

        container.innerHTML = '';

        // Get latest message info for sorting
        const latestInfo = this.getLatestMessageInfo();

        console.log('🎨 Rendering user list:', latestInfo.length, 'users');

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

        // Clear notifications for this user
        this.clearNotificationBadge(otherUser);

        // Create chat window
        this.currentChatWindow = this.createChatWindow(otherUser);
        document.body.appendChild(this.currentChatWindow);

        // Load messages for this chat
        await this.loadChatMessages(otherUser);

        // Create chat in database
        await this.createChat(this.currentUser, otherUser);

        // Connect to WebSocket
        this.connectToChat(otherUser);

        // Focus on input field
        const input = this.currentChatWindow.querySelector('input');
        if (input) {
            setTimeout(() => input.focus(), 100);
        }
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
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;

        chatWindow.innerHTML = `
            <div class="chat-header" style="padding: 10px; background: #252831; color: white; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                <span>Chat with: ${otherUser}</span>
                <button class="close-btn" style="background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer; padding: 5px 8px;">✕</button>
            </div>
            <div class="chat-messages" style="flex: 1; padding: 10px; overflow-y: auto; background: #1e2124; color: white;"></div>
            <div class="chat-input" style="padding: 10px; border-top: 1px solid rgba(255, 255, 255, 0.1); display: flex; gap: 10px; background: #252831;">
                <input type="text" placeholder="Type a message..." style="flex: 1; padding: 8px; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 5px; background: #1e2124; color: white;">
                <button class="send-btn" style="padding: 8px 16px; background: #8b9dc3; color: white; border: none; border-radius: 5px; cursor: pointer;">Send</button>
            </div>
        `;

        // Add event listeners
        const closeBtn = chatWindow.querySelector('.close-btn');
        const sendBtn = chatWindow.querySelector('.send-btn');
        const input = chatWindow.querySelector('input');

        closeBtn.onclick = () => this.closeChatWindow();
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
        console.log('🔒 Closing chat window');

        if (this.currentChatWindow) {
            this.currentChatWindow.remove();
            this.currentChatWindow = null;
        }

        if (this.websocket) {
            console.log('🔌 Closing WebSocket connection');
            this.websocket.close(1000, 'Chat window closed');
            this.websocket = null;
        }

        this.currentChatUser = null;
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
                this.showError('Connection error. Please try again.');
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
            this.showError('Failed to connect to chat. Please try again.');
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
            this.showError('Reconnecting... Please try again in a moment.');
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
                this.showError('Reconnecting... Please try again in a moment.');
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
            this.showError('Failed to send message. Please try again.');
        }
    }

    initNotificationSound() {
        // Create a simple notification sound using Web Audio API
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
        // Request notification permission if not granted
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }

        if (Notification.permission === 'granted') {
            const notification = new Notification(`New message from ${sender}`, {
                body: message.length > 50 ? message.substring(0, 50) + '...' : message,
                icon: '/static/images/message-icon.png', // Add icon if available
                tag: `message-${sender}`, // Prevent duplicate notifications
                requireInteraction: true
            });

            notification.onclick = () => {
                window.focus();
                this.openChatWindow(sender);
                notification.close();
            };

            // Auto-close after 5 seconds
            setTimeout(() => notification.close(), 5000);
        }

        // Play sound
        this.playNotificationSound();

        // Show in-app notification
        this.showInAppNotification(sender, message);
    }

    showInAppNotification(sender, message) {
        // Create floating notification
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
            animation: slideInRight 0.3s ease;
        `;

        notification.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">💬 ${sender}</div>
            <div style="font-size: 0.9em; opacity: 0.9;">${message.length > 60 ? message.substring(0, 60) + '...' : message}</div>
            <div style="font-size: 0.8em; opacity: 0.7; margin-top: 5px;">Click to reply</div>
        `;

        // Add CSS animation
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        notification.onclick = () => {
            this.openChatWindow(sender);
            notification.remove();
        };

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 5000);

        // Update notification badge
        this.updateNotificationBadge(sender);
    }

    updateNotificationBadge(sender) {
        const currentCount = this.notifications.get(sender) || 0;
        this.notifications.set(sender, currentCount + 1);

        // Update user list to show notification badge
        const userElements = document.querySelectorAll('.chat-room');
        userElements.forEach(element => {
            const username = element.textContent.split(' ')[0];
            if (username === sender) {
                let badge = element.querySelector('.notification-badge');
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'notification-badge';
                    badge.style.cssText = `
                        background: #dc3545;
                        color: white;
                        border-radius: 50%;
                        padding: 2px 6px;
                        font-size: 0.8em;
                        margin-left: 10px;
                        min-width: 18px;
                        text-align: center;
                        display: inline-block;
                    `;
                    element.appendChild(badge);
                }
                badge.textContent = this.notifications.get(sender);
            }
        });
    }

    clearNotificationBadge(sender) {
        this.notifications.delete(sender);

        // Remove badge from user list
        const userElements = document.querySelectorAll('.chat-room');
        userElements.forEach(element => {
            const username = element.textContent.split(' ')[0];
            if (username === sender) {
                const badge = element.querySelector('.notification-badge');
                if (badge) {
                    badge.remove();
                }
            }
        });
    }

    showError(message) {
        console.error('❌ Error:', message);

        // Create a simple toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #e74c3c;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
    }
}

// Export MessagingPage class to global scope for compatibility with main.js
window.MessagesPage = {
    async render() {
        console.log('🚀 MessagesPage.render() called');
        window.forumApp.setCurrentPage('messages');
        const messagingPage = new MessagingPage();
        await messagingPage.init();
        console.log('✅ MessagingPage initialized successfully');
        return messagingPage;
    }
};

// Also export as MessagingPage for consistency
window.MessagingPage = window.MessagesPage;
