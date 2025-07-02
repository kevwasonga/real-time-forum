// Messaging page functionality
class MessagingPage {
    constructor() {
        this.currentConversationId = null;
        this.conversations = [];
        this.messages = [];
        this.isLoading = false;
        this.searchTimeout = null;
        
        this.init();
    }

    async init() {
        this.render();
        await this.loadConversations();
        this.setupEventListeners();
    }

    render() {
        const content = `
            <div class="messaging-container">
                <!-- Sidebar -->
                <div class="messaging-sidebar">
                    <div class="messaging-header">
                        <h2>Messages</h2>
                        <button class="new-message-btn" id="newMessageBtn">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    
                    <!-- Search Users -->
                    <div class="user-search" id="userSearch" style="display: none;">
                        <div class="search-header">
                            <input type="text" id="searchInput" placeholder="Search users..." class="search-input">
                            <button class="close-search-btn" id="closeSearchBtn">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="search-results" id="searchResults"></div>
                    </div>
                    
                    <!-- Conversations List -->
                    <div class="conversations-list" id="conversationsList">
                        <div class="loading-spinner" id="conversationsLoading">
                            <i class="fas fa-spinner fa-spin"></i> Loading conversations...
                        </div>
                    </div>
                </div>

                <!-- Chat Area -->
                <div class="chat-area">
                    <div class="chat-placeholder" id="chatPlaceholder">
                        <div class="placeholder-content">
                            <i class="fas fa-comments"></i>
                            <h3>Select a conversation</h3>
                            <p>Choose a conversation from the sidebar to start messaging</p>
                        </div>
                    </div>
                    
                    <div class="chat-container" id="chatContainer" style="display: none;">
                        <!-- Chat Header -->
                        <div class="chat-header" id="chatHeader">
                            <div class="chat-user-info">
                                <img class="user-avatar" id="chatUserAvatar" src="" alt="">
                                <div class="user-details">
                                    <h3 id="chatUserName"></h3>
                                    <span class="user-status" id="chatUserStatus">Online</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Messages Area -->
                        <div class="messages-area" id="messagesArea">
                            <div class="messages-loading" id="messagesLoading">
                                <i class="fas fa-spinner fa-spin"></i> Loading messages...
                            </div>
                            <div class="messages-container" id="messagesContainer"></div>
                        </div>
                        
                        <!-- Message Input -->
                        <div class="message-input-area">
                            <div class="message-input-container">
                                <textarea 
                                    id="messageInput" 
                                    placeholder="Type your message..." 
                                    rows="1"
                                    maxlength="1000"
                                ></textarea>
                                <button class="send-btn" id="sendBtn" disabled>
                                    <i class="fas fa-paper-plane"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('content').innerHTML = content;
    }

    setupEventListeners() {
        // New message button
        document.getElementById('newMessageBtn').addEventListener('click', () => {
            this.showUserSearch();
        });

        // Close search button
        document.getElementById('closeSearchBtn').addEventListener('click', () => {
            this.hideUserSearch();
        });

        // Search input
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.searchUsers(e.target.value);
            }, 300);
        });

        // Message input
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        
        messageInput.addEventListener('input', () => {
            const hasContent = messageInput.value.trim().length > 0;
            sendBtn.disabled = !hasContent;
            
            // Auto-resize textarea
            messageInput.style.height = 'auto';
            messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
        });

        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Send button
        sendBtn.addEventListener('click', () => {
            this.sendMessage();
        });
    }

    async loadConversations() {
        try {
            const response = await window.api.get('/conversations');
            if (response.success) {
                this.conversations = response.data.conversations || [];
                this.renderConversations();
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
            this.showError('Failed to load conversations');
        } finally {
            document.getElementById('conversationsLoading').style.display = 'none';
        }
    }

    renderConversations() {
        const container = document.getElementById('conversationsList');
        const loading = document.getElementById('conversationsLoading');
        
        if (this.conversations.length === 0) {
            container.innerHTML = `
                <div class="no-conversations">
                    <i class="fas fa-inbox"></i>
                    <p>No conversations yet</p>
                    <p class="text-muted">Start a new conversation by clicking the + button</p>
                </div>
            `;
            return;
        }

        const conversationsHtml = this.conversations.map(conv => {
            const otherUser = conv.otherUser;
            const lastMessage = conv.lastMessage;
            const unreadBadge = conv.unreadCount > 0 ? 
                `<span class="unread-badge">${conv.unreadCount}</span>` : '';
            
            return `
                <div class="conversation-item ${conv.id === this.currentConversationId ? 'active' : ''}" 
                     data-conversation-id="${conv.id}" 
                     data-user-id="${otherUser.id}">
                    <img class="conversation-avatar" 
                         src="${otherUser.avatarUrl || '/static/images/default-avatar.png'}" 
                         alt="${otherUser.nickname}">
                    <div class="conversation-info">
                        <div class="conversation-header">
                            <h4 class="conversation-name">${otherUser.nickname}</h4>
                            <span class="conversation-time">
                                ${lastMessage ? this.formatTime(lastMessage.createdAt) : ''}
                            </span>
                            ${unreadBadge}
                        </div>
                        <p class="conversation-preview">
                            ${lastMessage ? this.truncateText(lastMessage.content, 50) : 'No messages yet'}
                        </p>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = conversationsHtml;

        // Add click listeners
        container.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', () => {
                const conversationId = item.dataset.conversationId;
                const userId = item.dataset.userId;
                this.selectConversation(conversationId, userId);
            });
        });
    }

    async selectConversation(conversationId, userId) {
        if (this.currentConversationId === conversationId) return;

        this.currentConversationId = conversationId;
        
        // Update UI
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-conversation-id="${conversationId}"]`).classList.add('active');
        
        // Show chat container
        document.getElementById('chatPlaceholder').style.display = 'none';
        document.getElementById('chatContainer').style.display = 'flex';
        
        // Load conversation details
        await this.loadConversationDetails(userId);
        await this.loadMessages(conversationId);
    }

    async loadConversationDetails(userId) {
        try {
            // Find user in conversations
            const conversation = this.conversations.find(conv => conv.otherUser.id === userId);
            if (conversation) {
                const user = conversation.otherUser;
                document.getElementById('chatUserName').textContent = user.nickname;
                document.getElementById('chatUserAvatar').src = user.avatarUrl || '/static/images/default-avatar.png';
                document.getElementById('chatUserStatus').textContent = 'Online'; // TODO: Implement online status
            }
        } catch (error) {
            console.error('Error loading conversation details:', error);
        }
    }

    async loadMessages(conversationId) {
        const messagesLoading = document.getElementById('messagesLoading');
        const messagesContainer = document.getElementById('messagesContainer');
        
        messagesLoading.style.display = 'block';
        messagesContainer.innerHTML = '';

        try {
            const response = await window.api.get(`/messages/${conversationId}`);
            if (response.success) {
                this.messages = response.data.messages || [];
                this.renderMessages();
                this.scrollToBottom();
                
                // Mark messages as read
                await this.markAsRead(conversationId);
            }
        } catch (error) {
            console.error('Error loading messages:', error);
            this.showError('Failed to load messages');
        } finally {
            messagesLoading.style.display = 'none';
        }
    }

    renderMessages() {
        const container = document.getElementById('messagesContainer');
        const currentUser = window.currentUser;
        
        if (this.messages.length === 0) {
            container.innerHTML = `
                <div class="no-messages">
                    <p>No messages yet. Start the conversation!</p>
                </div>
            `;
            return;
        }

        const messagesHtml = this.messages.map(message => {
            const isOwn = message.senderId === currentUser.id;
            const sender = message.sender || {};
            
            return `
                <div class="message ${isOwn ? 'own' : 'other'}">
                    ${!isOwn ? `
                        <img class="message-avatar" 
                             src="${sender.avatarUrl || '/static/images/default-avatar.png'}" 
                             alt="${sender.nickname}">
                    ` : ''}
                    <div class="message-content">
                        <div class="message-bubble">
                            <p>${this.escapeHtml(message.content)}</p>
                        </div>
                        <div class="message-time">
                            ${this.formatTime(message.createdAt)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = messagesHtml;
    }

    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const content = messageInput.value.trim();

        if (!content || !this.currentConversationId) return;

        // Get recipient ID from current conversation
        const conversation = this.conversations.find(conv => conv.id === this.currentConversationId);
        if (!conversation) return;

        const recipientId = conversation.otherUser.id;

        try {
            const response = await window.api.post('/messages', {
                recipientId: recipientId,
                content: content
            });

            if (response.success) {
                // Clear input
                messageInput.value = '';
                messageInput.style.height = 'auto';
                document.getElementById('sendBtn').disabled = true;

                // Add message to UI immediately
                this.addMessageToUI(response.data);
                this.scrollToBottom();

                // Update conversation list
                await this.loadConversations();
            }
        } catch (error) {
            console.error('Error sending message:', error);
            this.showError('Failed to send message');
        }
    }

    addMessageToUI(message) {
        const container = document.getElementById('messagesContainer');
        const currentUser = window.currentUser;
        const isOwn = message.senderId === currentUser.id;
        const sender = message.sender || {};

        const messageHtml = `
            <div class="message ${isOwn ? 'own' : 'other'}">
                ${!isOwn ? `
                    <img class="message-avatar"
                         src="${sender.avatarUrl || '/static/images/default-avatar.png'}"
                         alt="${sender.nickname}">
                ` : ''}
                <div class="message-content">
                    <div class="message-bubble">
                        <p>${this.escapeHtml(message.content)}</p>
                    </div>
                    <div class="message-time">
                        ${this.formatTime(message.createdAt)}
                    </div>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', messageHtml);
        this.messages.push(message);
    }

    showUserSearch() {
        document.getElementById('userSearch').style.display = 'block';
        document.getElementById('searchInput').focus();
    }

    hideUserSearch() {
        document.getElementById('userSearch').style.display = 'none';
        document.getElementById('searchInput').value = '';
        document.getElementById('searchResults').innerHTML = '';
    }

    async searchUsers(query) {
        if (!query.trim()) {
            document.getElementById('searchResults').innerHTML = '';
            return;
        }

        try {
            const response = await window.api.get(`/users/search?q=${encodeURIComponent(query)}`);
            if (response.success) {
                this.renderSearchResults(response.data.users || []);
            }
        } catch (error) {
            console.error('Error searching users:', error);
        }
    }

    renderSearchResults(users) {
        const container = document.getElementById('searchResults');

        if (users.length === 0) {
            container.innerHTML = '<div class="no-results">No users found</div>';
            return;
        }

        const usersHtml = users.map(user => `
            <div class="search-result-item" data-user-id="${user.id}">
                <img class="search-avatar"
                     src="${user.avatarUrl || '/static/images/default-avatar.png'}"
                     alt="${user.nickname}">
                <div class="search-user-info">
                    <h4>${user.nickname}</h4>
                    <p>${user.firstName} ${user.lastName}</p>
                </div>
            </div>
        `).join('');

        container.innerHTML = usersHtml;

        // Add click listeners
        container.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', async () => {
                const userId = item.dataset.userId;
                await this.startConversation(userId);
            });
        });
    }

    async startConversation(userId) {
        try {
            // Send a placeholder message to create conversation
            const response = await window.api.post('/messages', {
                recipientId: userId,
                content: 'Hello! 👋'
            });

            if (response.success) {
                this.hideUserSearch();
                await this.loadConversations();

                // Find and select the new conversation
                const newConversation = this.conversations.find(conv =>
                    conv.otherUser.id === userId
                );
                if (newConversation) {
                    this.selectConversation(newConversation.id, userId);
                }
            }
        } catch (error) {
            console.error('Error starting conversation:', error);
            this.showError('Failed to start conversation');
        }
    }

    async markAsRead(conversationId) {
        try {
            await window.api.put(`/messages/${conversationId}/read`);
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    }

    scrollToBottom() {
        const messagesArea = document.getElementById('messagesArea');
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);

        if (diffInHours < 24) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffInHours < 24 * 7) {
            return date.toLocaleDateString([], { weekday: 'short' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        // Simple error display - can be enhanced
        alert(message);
    }
}

// Export MessagingPage class to global scope
window.MessagingPage = {
    render: function() {
        const messagingPage = new MessagingPage();
        return messagingPage;
    }
};
