// Messages Page Component
window.MessagesPage = {
    conversations: [],
    selectedConversation: null,
    messages: [],

    async render() {
        window.forumApp.setCurrentPage('messages');
        
        // Require authentication
        if (!window.auth.requireAuth()) {
            return;
        }

        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="messages-container">
                <div class="messages-sidebar">
                    <div class="messages-header">
                        <h2>Messages</h2>
                    </div>

                    <div class="online-users-section">
                        <h3>Online Users</h3>
                        <div id="online-users-list" class="online-users-list">
                            <div class="loading-placeholder">Loading online users...</div>
                        </div>
                    </div>

                    <div class="recent-conversations-section">
                        <h3>Recent Conversations</h3>
                        <div id="conversations-list" class="conversations-list">
                            <div class="loading-placeholder">Loading conversations...</div>
                        </div>
                    </div>
                </div>

                <div class="messages-main">
                    <div id="messages-content" class="messages-content">
                        <div class="no-conversation-selected">
                            <h3>Select a user to start messaging</h3>
                            <p>Choose an online user or recent conversation to start chatting</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await this.loadOnlineUsers();
        await this.loadConversations();
        this.bindEvents();
    },

    bindEvents() {
        // Listen for WebSocket messages
        if (window.forumApp?.websocket) {
            window.forumApp.websocket.addEventListener('private_message', (message) => {
                this.handleNewMessage(message);
            });
        }
    },

    async loadOnlineUsers() {
        console.log('🔄 loadOnlineUsers called');
        try {
            console.log('📡 Making API call to get online users...');
            const response = await window.api.getOnlineUsers();
            console.log('📡 API response:', response);

            if (response.success) {
                const onlineUsers = response.data || [];
                console.log('👥 Raw online users:', onlineUsers);

                // Filter out current user
                const otherUsers = onlineUsers.filter(user =>
                    window.forumApp.currentUser && user.id !== window.forumApp.currentUser.id
                );
                console.log('👥 Filtered online users (excluding current user):', otherUsers);
                console.log('👤 Current user:', window.forumApp.currentUser);

                this.renderOnlineUsers(otherUsers);
            } else {
                console.error('❌ API call failed:', response);
                const container = document.getElementById('online-users-list');
                if (container) {
                    container.innerHTML = '<div class="error-message">Failed to load online users</div>';
                }
            }
        } catch (error) {
            console.error('❌ Failed to load online users:', error);
            const container = document.getElementById('online-users-list');
            if (container) {
                container.innerHTML = '<div class="error-message">Failed to load online users</div>';
            }
        }
    },

    renderOnlineUsers(users) {
        console.log('🎨 renderOnlineUsers called with:', users);
        const container = document.getElementById('online-users-list');
        if (!container) {
            console.error('❌ Container #online-users-list not found!');
            return;
        }

        if (users.length === 0) {
            console.log('📭 No users to display');
            container.innerHTML = '<div class="no-users">No other users online</div>';
            return;
        }

        console.log('👥 Rendering', users.length, 'online users');

        container.innerHTML = users.map(user => `
            <div class="online-user-item" data-user-id="${user.id}">
                <img src="${user.avatarURL || '/static/images/default-avatar.svg'}"
                     alt="${window.utils.escapeHtml(user.nickname)}'s avatar"
                     class="user-avatar">
                <div class="user-info">
                    <div class="user-name">${window.utils.escapeHtml(user.nickname)}</div>
                    <div class="user-status">
                        <span class="online-indicator"></span>
                        Online
                    </div>
                </div>
            </div>
        `).join('');

        // Bind click events for online users
        const userItems = container.querySelectorAll('.online-user-item');
        console.log('🔗 Binding click events to', userItems.length, 'online user items');

        userItems.forEach((item, index) => {
            console.log(`🔗 Binding click event to item ${index}:`, item.dataset.userId);

            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                console.log('🖱️ Click detected on online user item!');

                const userID = item.dataset.userId;
                const user = users.find(u => u.id === userID);

                console.log('🔍 Found user data:', user);

                if (user) {
                    console.log('✅ Starting conversation with online user:', user.nickname);
                    this.startNewConversation(user);
                } else {
                    console.error('❌ User not found for ID:', userID);
                }
            });
        });
    },

    async loadConversations() {
        try {
            const response = await window.api.getConversations();
            if (response.success) {
                this.conversations = response.data || [];
                this.renderConversations();
            }
        } catch (error) {
            console.error('Failed to load conversations:', error);
            const container = document.getElementById('conversations-list');
            if (container) {
                container.innerHTML = '<div class="error-message">Failed to load conversations</div>';
            }
        }
    },

    renderConversations() {
        const container = document.getElementById('conversations-list');
        if (!container) return;

        if (this.conversations.length === 0) {
            container.innerHTML = '<div class="no-conversations">No conversations yet. Start a new one!</div>';
            return;
        }

        // Sort conversations by last message time (desc), then alphabetically as specified in prompt
        const sortedConversations = [...this.conversations].sort((a, b) => {
            if (a.lastMessageTime && b.lastMessageTime) {
                return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
            }
            if (a.lastMessageTime && !b.lastMessageTime) return -1;
            if (!a.lastMessageTime && b.lastMessageTime) return 1;
            return a.nickname.localeCompare(b.nickname);
        });

        container.innerHTML = sortedConversations.map(conv => `
            <div class="conversation-item ${this.selectedConversation?.userID === conv.userID ? 'active' : ''}" 
                 data-user-id="${conv.userID}">
                <img src="${conv.avatarURL || '/static/images/default-avatar.svg'}"
                     alt="${window.utils.escapeHtml(conv.nickname)}'s avatar" 
                     class="conversation-avatar">
                <div class="conversation-info">
                    <div class="conversation-header">
                        <span class="conversation-name">${window.utils.escapeHtml(conv.nickname)}</span>
                        ${conv.lastMessageTime ? `<span class="conversation-time">${window.utils.formatDate(conv.lastMessageTime)}</span>` : ''}
                    </div>
                    <div class="conversation-preview">
                        ${conv.lastMessage ? window.utils.escapeHtml(conv.lastMessage.substring(0, 50)) + (conv.lastMessage.length > 50 ? '...' : '') : 'No messages yet'}
                    </div>
                    ${conv.unreadCount > 0 ? `<div class="unread-badge">${conv.unreadCount}</div>` : ''}
                </div>
            </div>
        `).join('');

        // Bind conversation click events
        const conversationItems = container.querySelectorAll('.conversation-item');
        console.log('🔗 Found', conversationItems.length, 'conversation items to bind');

        conversationItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                console.log('👆 Conversation clicked!');
                const userID = item.dataset.userId;
                console.log('👤 User ID:', userID);
                const conversation = this.conversations.find(c => c.userID === userID);
                console.log('💬 Found conversation:', conversation);

                if (conversation) {
                    console.log('✅ Opening conversation with:', conversation.nickname);
                    this.selectConversation(conversation);
                } else {
                    console.error('❌ No conversation found for user ID:', userID);
                }
            });
        });
    },

    async selectConversation(conversation) {
        console.log('🔄 selectConversation called with:', conversation);
        this.selectedConversation = conversation;

        // Update UI to show active state in conversations list
        this.renderConversations();

        // Load messages for this conversation
        console.log('📨 Loading messages for user:', conversation.userID);
        await this.loadMessages(conversation.userID);

        // Render the chat interface
        console.log('🎨 Rendering chat interface');
        this.renderMessages();

        console.log('✅ Chat opened successfully for:', conversation.nickname);
    },

    async loadMessages(userID) {
        try {
            const response = await window.api.getMessages(userID);
            if (response.success) {
                this.messages = response.data || [];
                this.renderMessages();
                console.log('📨 Loaded', this.messages.length, 'messages for conversation');
            } else {
                console.error('❌ Failed to load messages:', response.message);
            }
        } catch (error) {
            console.error('❌ Failed to load messages:', error);
        }
    },

    renderMessages() {
        const container = document.getElementById('messages-content');
        console.log('🎨 renderMessages called');
        console.log('🎨 Container found:', !!container);
        console.log('🎨 Selected conversation:', this.selectedConversation);

        if (!container) {
            console.error('❌ messages-content container not found!');
            return;
        }

        if (!this.selectedConversation) {
            console.error('❌ No selected conversation!');
            return;
        }

        console.log('✅ Rendering chat interface for:', this.selectedConversation.nickname);

        // Render the full chat interface in the main area
        container.innerHTML = `
            <div class="conversation-header">
                <img src="${this.selectedConversation.avatarURL || '/static/images/default-avatar.svg'}"
                     alt="${window.utils.escapeHtml(this.selectedConversation.nickname)}'s avatar"
                     class="conversation-avatar">
                <div class="conversation-info">
                    <h3>${window.utils.escapeHtml(this.selectedConversation.nickname)}</h3>
                    <span class="user-status">Online</span>
                </div>
            </div>

            <div class="messages-list" id="messages-list">
                ${this.renderMessagesList()}
            </div>

            <div class="message-input-container">
                <form id="message-form" class="message-form">
                    <input type="text" id="message-input" placeholder="Type a message..." required>
                    <button type="submit" class="btn btn-primary">Send</button>
                </form>
            </div>
        `;

        console.log('✅ Chat HTML rendered, binding events...');
        this.bindMessageEvents();
        this.scrollToBottom();
        console.log('✅ Chat interface fully rendered');
    },

    renderMessagesList() {
        if (this.messages.length === 0) {
            return '<div class="no-messages">No messages yet. Start the conversation!</div>';
        }

        return this.messages.map(message => {
            const isOwnMessage = window.forumApp.currentUser && 
                               message.senderID === window.forumApp.currentUser.id;
            
            // Format message as specified in prompt: [YYYY-MM-DD HH:MM] Username: Content
            const timestamp = window.utils.formatTime(message.createdAt);
            const senderName = isOwnMessage ? 'You' : message.senderName;
            
            return `
                <div class="message ${isOwnMessage ? 'own-message' : 'other-message'}">
                    <div class="message-content">
                        <div class="message-header">
                            <span class="message-time">${timestamp}</span>
                            <span class="message-sender">${window.utils.escapeHtml(senderName)}:</span>
                        </div>
                        <div class="message-text">${window.utils.escapeHtml(message.content)}</div>
                    </div>
                </div>
            `;
        }).join('');
    },

    bindMessageEvents() {
        const messageForm = document.getElementById('message-form');
        if (messageForm) {
            messageForm.addEventListener('submit', this.handleSendMessage.bind(this));
        }

        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            // Auto-focus
            messageInput.focus();
            
            // Typing indicator
            let typingTimeout;
            messageInput.addEventListener('input', () => {
                if (this.selectedConversation && window.forumApp.websocket) {
                    window.forumApp.websocket.sendTypingIndicator(
                        this.selectedConversation.userID, 
                        true
                    );

                    clearTimeout(typingTimeout);
                    typingTimeout = setTimeout(() => {
                        window.forumApp.websocket.sendTypingIndicator(
                            this.selectedConversation.userID, 
                            false
                        );
                    }, 1000);
                }
            });
        }
    },

    async handleSendMessage(event) {
        event.preventDefault();
        
        if (!this.selectedConversation) return;
        
        const form = event.target;
        const messageInput = form.querySelector('#message-input');
        const content = messageInput.value.trim();
        
        if (!content) return;

        try {
            const response = await window.api.sendMessage(this.selectedConversation.userID, content);
            if (response.success) {
                messageInput.value = '';
                
                // Add message to local list
                this.messages.push(response.data);
                
                // Re-render messages
                const messagesList = document.getElementById('messages-list');
                if (messagesList) {
                    messagesList.innerHTML = this.renderMessagesList();
                    this.scrollToBottom();
                }
                
                // Update conversations list
                await this.loadConversations();
                
                // Send via WebSocket for real-time delivery
                if (window.forumApp.websocket) {
                    window.forumApp.websocket.sendPrivateMessage(
                        this.selectedConversation.userID, 
                        content
                    );
                }
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            if (window.forumApp.notificationComponent) {
                window.forumApp.notificationComponent.error('Failed to send message');
            }
        }
    },



    async startNewConversation(user) {
        console.log('Starting new conversation with:', user.nickname);

        // Create a conversation object
        const conversation = {
            userID: user.id,
            nickname: user.nickname,
            firstName: user.firstName,
            lastName: user.lastName,
            avatarURL: user.avatarURL,
            lastMessage: '',
            lastMessageTime: null,
            unreadCount: 0
        };

        // Add to conversations if not already there
        const existingConversation = this.conversations.find(c => c.userID === user.id);
        if (!existingConversation) {
            this.conversations.unshift(conversation);
            console.log(' Added new conversation to list');
        } else {
            console.log(' Using existing conversation');
        }

        // Select the conversation (use existing one if found)
        const conversationToSelect = existingConversation || conversation;
        await this.selectConversation(conversationToSelect);

        console.log('Conversation started successfully');
    },

    handleNewMessage(message) {
        // Update conversations list
        this.loadConversations();
        
        // If this message is for the current conversation, add it
        if (this.selectedConversation && 
            ((message.senderID === this.selectedConversation.userID && 
              message.receiverID === window.forumApp.currentUser.id) ||
             (message.senderID === window.forumApp.currentUser.id && 
              message.receiverID === this.selectedConversation.userID))) {
            
            this.messages.push(message);
            
            const messagesList = document.getElementById('messages-list');
            if (messagesList) {
                messagesList.innerHTML = this.renderMessagesList();
                this.scrollToBottom();
            }
        }
    },

    scrollToBottom() {
        const messagesList = document.getElementById('messages-list');
        if (messagesList) {
            messagesList.scrollTop = messagesList.scrollHeight;
        }
    },

    // Method to be called from sidebar component
    selectUser(user) {
        this.startNewConversation(user);
    },


};
