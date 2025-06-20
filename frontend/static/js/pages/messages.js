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
                        <button id="new-message-btn" class="btn btn-primary btn-sm">New Message</button>
                    </div>
                    
                    <div class="search-users">
                        <input type="text" id="user-search" placeholder="Search users..." class="search-input">
                        <div id="user-search-results" class="search-results"></div>
                    </div>
                    
                    <div id="conversations-list" class="conversations-list">
                        <div class="loading-placeholder">Loading conversations...</div>
                    </div>
                </div>
                
                <div class="messages-main">
                    <div id="messages-content" class="messages-content">
                        <div class="no-conversation-selected">
                            <h3>Select a conversation</h3>
                            <p>Choose a conversation from the sidebar to start messaging</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await this.loadConversations();
        this.bindEvents();
    },

    bindEvents() {
        const newMessageBtn = document.getElementById('new-message-btn');
        if (newMessageBtn) {
            newMessageBtn.addEventListener('click', this.toggleUserSearch.bind(this));
        }

        const userSearch = document.getElementById('user-search');
        if (userSearch) {
            userSearch.addEventListener('input', window.utils.debounce(this.searchUsers.bind(this), 300));
        }

        // Listen for WebSocket messages
        if (window.forumApp?.websocket) {
            window.forumApp.websocket.addEventListener('private_message', (message) => {
                this.handleNewMessage(message);
            });
        }
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
                <img src="${conv.avatarURL || '/static/images/default-avatar.png'}" 
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
        conversationItems.forEach(item => {
            item.addEventListener('click', () => {
                const userID = item.dataset.userId;
                const conversation = this.conversations.find(c => c.userID === userID);
                if (conversation) {
                    this.selectConversation(conversation);
                }
            });
        });
    },

    async selectConversation(conversation) {
        this.selectedConversation = conversation;
        
        // Update UI
        this.renderConversations(); // Re-render to show active state
        
        // Load messages
        await this.loadMessages(conversation.userID);
        
        // Open chat component if available
        if (window.forumApp.chatComponent) {
            window.forumApp.chatComponent.openConversation(conversation);
        }
    },

    async loadMessages(userID) {
        try {
            const response = await window.api.getMessages(userID);
            if (response.success) {
                this.messages = response.data || [];
                this.renderMessages();
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    },

    renderMessages() {
        const container = document.getElementById('messages-content');
        if (!container || !this.selectedConversation) return;

        container.innerHTML = `
            <div class="conversation-header">
                <img src="${this.selectedConversation.avatarURL || '/static/images/default-avatar.png'}" 
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

        this.bindMessageEvents();
        this.scrollToBottom();
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

    toggleUserSearch() {
        const searchContainer = document.querySelector('.search-users');
        if (searchContainer) {
            searchContainer.classList.toggle('active');
            const searchInput = document.getElementById('user-search');
            if (searchInput && searchContainer.classList.contains('active')) {
                searchInput.focus();
            }
        }
    },

    async searchUsers(event) {
        const query = event.target.value.trim();
        const resultsContainer = document.getElementById('user-search-results');
        
        if (!resultsContainer) return;
        
        if (query.length < 2) {
            resultsContainer.innerHTML = '';
            return;
        }

        try {
            const response = await window.api.getUsers({ search: query });
            if (response.success) {
                this.renderUserSearchResults(response.data || []);
            }
        } catch (error) {
            console.error('Failed to search users:', error);
            resultsContainer.innerHTML = '<div class="error-message">Search failed</div>';
        }
    },

    renderUserSearchResults(users) {
        const container = document.getElementById('user-search-results');
        if (!container) return;

        if (users.length === 0) {
            container.innerHTML = '<div class="no-results">No users found</div>';
            return;
        }

        container.innerHTML = users.map(user => `
            <div class="user-search-result" data-user-id="${user.id}">
                <img src="${user.avatarURL || '/static/images/default-avatar.png'}" 
                     alt="${window.utils.escapeHtml(user.nickname)}'s avatar" 
                     class="user-avatar">
                <div class="user-info">
                    <span class="user-name">${window.utils.escapeHtml(user.nickname)}</span>
                    <span class="user-full-name">${window.utils.escapeHtml(user.firstName)} ${window.utils.escapeHtml(user.lastName)}</span>
                </div>
            </div>
        `).join('');

        // Bind click events
        const userResults = container.querySelectorAll('.user-search-result');
        userResults.forEach(result => {
            result.addEventListener('click', () => {
                const userID = result.dataset.userId;
                const user = users.find(u => u.id === userID);
                if (user) {
                    this.startNewConversation(user);
                }
            });
        });
    },

    async startNewConversation(user) {
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
        if (!this.conversations.find(c => c.userID === user.id)) {
            this.conversations.unshift(conversation);
        }

        // Select the conversation
        await this.selectConversation(conversation);

        // Clear search
        const searchInput = document.getElementById('user-search');
        const searchResults = document.getElementById('user-search-results');
        if (searchInput) searchInput.value = '';
        if (searchResults) searchResults.innerHTML = '';
        
        // Hide search
        const searchContainer = document.querySelector('.search-users');
        if (searchContainer) {
            searchContainer.classList.remove('active');
        }
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
    }
};
