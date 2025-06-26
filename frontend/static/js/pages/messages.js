// Messages Page Component
window.MessagesPage = {
    conversations: [],
    selectedConversation: null,
    messages: [],
    users: [],
    currentPage: 0,
    isLoadingMessages: false,
    hasMoreMessages: true,

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
                        <div class="sidebar-tabs">
                            <button id="conversations-tab" class="tab-btn active">Conversations</button>
                            <button id="users-tab" class="tab-btn">Users</button>
                        </div>
                    </div>

                    <div class="search-users">
                        <input type="text" id="user-search" placeholder="Search users..." class="search-input">
                        <div id="user-search-results" class="search-results"></div>
                    </div>

                    <div id="conversations-list" class="conversations-list">
                        <div class="loading-placeholder">Loading conversations...</div>
                    </div>

                    <div id="users-list" class="users-list" style="display: none;">
                        <div class="loading-placeholder">Loading users...</div>
                    </div>
                </div>

                <div class="messages-main">
                    <div id="messages-content" class="messages-content">
                        <div class="no-conversation-selected">
                            <h3>Select a conversation</h3>
                            <p>Choose a conversation from the sidebar to start messaging</p>
                            <button id="test-chat-btn" style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Test Chat Display</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await this.loadConversations();
        await this.loadUsers();
        this.bindEvents();
        this.bindTestButton();
    },

    bindEvents() {
        // Tab functionality
        const conversationsTab = document.getElementById('conversations-tab');
        const usersTab = document.getElementById('users-tab');

        if (conversationsTab) {
            conversationsTab.addEventListener('click', () => this.switchTab('conversations'));
        }

        if (usersTab) {
            usersTab.addEventListener('click', () => this.switchTab('users'));
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

            // Listen for user status updates
            window.forumApp.websocket.addEventListener('user_status', (data) => {
                this.handleUserStatusUpdate(data);
            });
        }
    },

    switchTab(tab) {
        const conversationsTab = document.getElementById('conversations-tab');
        const usersTab = document.getElementById('users-tab');
        const conversationsList = document.getElementById('conversations-list');
        const usersList = document.getElementById('users-list');

        if (tab === 'conversations') {
            conversationsTab.classList.add('active');
            usersTab.classList.remove('active');
            conversationsList.style.display = 'block';
            usersList.style.display = 'none';
        } else if (tab === 'users') {
            conversationsTab.classList.remove('active');
            usersTab.classList.add('active');
            conversationsList.style.display = 'none';
            usersList.style.display = 'block';
        }
    },

    async loadUsers() {
        try {
            const response = await window.api.getUsers();
            if (response.success) {
                this.users = response.data || [];
                this.renderUsers();
            }
        } catch (error) {
            console.error('Failed to load users:', error);
            const container = document.getElementById('users-list');
            if (container) {
                container.innerHTML = '<div class="error-message">Failed to load users</div>';
            }
        }
    },

    renderUsers() {
        const container = document.getElementById('users-list');
        if (!container) return;

        if (this.users.length === 0) {
            container.innerHTML = '<div class="no-users">No users found</div>';
            return;
        }

        // Sort users as per requirements: 1. Most recently messaged, 2. Alphabetical
        const sortedUsers = [...this.users].sort((a, b) => {
            if (a.lastMessageTime && b.lastMessageTime) {
                return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
            }
            if (a.lastMessageTime && !b.lastMessageTime) return -1;
            if (!a.lastMessageTime && b.lastMessageTime) return 1;
            return a.nickname.localeCompare(b.nickname);
        });

        container.innerHTML = sortedUsers.map(user => `
            <div class="user-item" data-user-id="${user.id}">
                <div class="user-avatar-container">
                    <img src="${user.avatarUrl || '/static/images/default-avatar.png'}"
                         alt="${window.utils.escapeHtml(user.nickname)}'s avatar"
                         class="user-avatar">
                    <div class="online-indicator ${user.isOnline ? 'online' : 'offline'}"></div>
                </div>
                <div class="user-info">
                    <div class="user-header">
                        <span class="user-name">${window.utils.escapeHtml(user.nickname)}</span>
                        <span class="user-status">${user.isOnline ? 'Online' : 'Offline'}</span>
                    </div>
                    <div class="user-preview">
                        ${user.lastMessagePreview ? window.utils.escapeHtml(user.lastMessagePreview) : 'No messages yet'}
                    </div>
                    ${user.lastMessageTime ? `<div class="user-time">${window.utils.formatDate(user.lastMessageTime)}</div>` : ''}
                </div>
            </div>
        `).join('');

        // Bind user click events
        const userItems = container.querySelectorAll('.user-item');
        userItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const userID = item.dataset.userId;
                const user = this.users.find(u => u.id === userID);

                if (user) {
                    this.startNewConversation(user);
                }
            });
        });
    },

    handleUserStatusUpdate(data) {
        // Update user online status in the users list
        if (this.users) {
            const user = this.users.find(u => u.id === data.userID);
            if (user) {
                user.isOnline = data.status === 'online';
                this.renderUsers();
            }
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

        // Reset pagination state
        this.currentPage = 0;
        this.hasMoreMessages = true;
        this.isLoadingMessages = false;

        // Update UI to show active state
        this.renderConversations(); // Re-render to show active state

        // Load messages and render chat interface in main area
        await this.loadMessages(conversation.userID);

        // Force render messages if not already rendered
        if (this.selectedConversation) {
            this.renderMessages();
        }

        console.log('💬 Chat opened in main area for:', conversation.nickname);
    },

    async loadMessages(userID, page = 0, append = false) {
        if (this.isLoadingMessages) return;

        this.isLoadingMessages = true;

        try {
            // Use the new chat history API with pagination
            const response = await window.api.getChatHistory(userID, page);
            if (response.success) {
                const newMessages = response.data || [];

                if (append) {
                    // Prepend older messages to the beginning
                    this.messages = [...newMessages, ...this.messages];
                } else {
                    // Replace messages (initial load)
                    this.messages = newMessages;
                    this.currentPage = 0;
                    this.hasMoreMessages = newMessages.length === 10; // If we got 10 messages, there might be more
                }

                // Check if we have more messages
                if (newMessages.length < 10) {
                    this.hasMoreMessages = false;
                }

                this.renderMessages();
                console.log('📨 Loaded', newMessages.length, 'messages for conversation (page', page, ')');
            } else {
                console.error('❌ Failed to load messages:', response.message);
            }
        } catch (error) {
            console.error('❌ Failed to load messages:', error);
        } finally {
            this.isLoadingMessages = false;
        }
    },

    async loadOlderMessages() {
        if (!this.selectedConversation || !this.hasMoreMessages || this.isLoadingMessages) {
            return;
        }

        const nextPage = this.currentPage + 1;
        await this.loadMessages(this.selectedConversation.userID, nextPage, true);
        this.currentPage = nextPage;
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

        console.log('✅ Chat HTML rendered, binding events...');
        this.bindMessageEvents();
        this.bindScrollEvents();
        this.scrollToBottom();
        console.log('✅ Chat interface fully rendered');
    },

    renderMessagesList() {
        if (this.messages.length === 0) {
            return '<div class="no-messages">No messages yet. Start the conversation!</div>';
        }

        let messagesHTML = '';

        // Add loading indicator for older messages if applicable
        if (this.hasMoreMessages) {
            messagesHTML += '<div id="load-more-indicator" class="load-more-indicator">Scroll up to load older messages...</div>';
        }

        messagesHTML += this.messages.map(message => {
            const isOwnMessage = window.forumApp.currentUser &&
                               message.senderID === window.forumApp.currentUser.id;

            // Format timestamp as HH:MM (local time) as per requirements
            const timestamp = window.utils.formatTime(message.timestamp || message.createdAt);
            const senderName = isOwnMessage ? 'You' : message.senderName;

            return `
                <div class="message ${isOwnMessage ? 'own-message' : 'other-message'}">
                    <div class="message-content">
                        <div class="message-header">
                            <span class="message-sender">${window.utils.escapeHtml(senderName)}</span>
                            <span class="message-time">${timestamp}</span>
                        </div>
                        <div class="message-text">${window.utils.escapeHtml(message.content)}</div>
                    </div>
                </div>
            `;
        }).join('');

        return messagesHTML;
    },

    bindScrollEvents() {
        const messagesList = document.getElementById('messages-list');
        if (!messagesList) return;

        // Throttled scroll handler for lazy loading
        const scrollHandler = window.utils.throttle(() => {
            // Check if scrolled to top (within 50px)
            if (messagesList.scrollTop <= 50 && this.hasMoreMessages && !this.isLoadingMessages) {
                console.log('📜 Loading older messages...');
                const currentScrollHeight = messagesList.scrollHeight;

                this.loadOlderMessages().then(() => {
                    // Maintain scroll position after loading older messages
                    const newScrollHeight = messagesList.scrollHeight;
                    const scrollDiff = newScrollHeight - currentScrollHeight;
                    messagesList.scrollTop = messagesList.scrollTop + scrollDiff;
                });
            }
        }, 200);

        messagesList.addEventListener('scroll', scrollHandler);
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

        // Clear input immediately for better UX
        messageInput.value = '';

        try {
            // Send via API first to store in database
            const response = await window.api.sendMessage(this.selectedConversation.userID, content);
            if (response.success) {
                // Add message to local list immediately
                const newMessage = {
                    id: response.data.id,
                    senderID: window.forumApp.currentUser.id,
                    receiverID: this.selectedConversation.userID,
                    content: content,
                    timestamp: new Date(),
                    senderName: 'You'
                };

                this.messages.push(newMessage);

                // Re-render messages
                const messagesList = document.getElementById('messages-list');
                if (messagesList) {
                    messagesList.innerHTML = this.renderMessagesList();
                    this.scrollToBottom();
                }

                // Send via WebSocket for real-time delivery to receiver
                if (window.forumApp.websocket && window.forumApp.websocket.isConnected) {
                    window.forumApp.websocket.sendPrivateMessage(
                        this.selectedConversation.userID,
                        content
                    );
                }

                // Update conversations list
                await this.loadConversations();
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            if (window.forumApp.notificationComponent) {
                window.forumApp.notificationComponent.error('Failed to send message');
            }
            // Restore the message in input if sending failed
            messageInput.value = content;
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
        console.log('📨 Handling new message:', message);

        // Update conversations list to reflect new message
        this.loadConversations();

        // If this message is for the current conversation, add it
        if (this.selectedConversation) {
            const isForCurrentConversation =
                (message.senderID === this.selectedConversation.userID &&
                 message.receiverID === window.forumApp.currentUser.id) ||
                (message.senderID === window.forumApp.currentUser.id &&
                 message.receiverID === this.selectedConversation.userID);

            if (isForCurrentConversation) {
                // Check if message already exists (to avoid duplicates)
                const messageExists = this.messages.some(m => m.id === message.id);

                if (!messageExists) {
                    // Ensure proper message format
                    const formattedMessage = {
                        id: message.id,
                        senderID: message.senderID || message.senderId,
                        receiverID: message.receiverID || message.receiverId,
                        content: message.content,
                        timestamp: message.timestamp || message.createdAt || new Date(),
                        senderName: message.senderName || (message.senderID === window.forumApp.currentUser.id ? 'You' : 'Unknown')
                    };

                    this.messages.push(formattedMessage);

                    const messagesList = document.getElementById('messages-list');
                    if (messagesList) {
                        messagesList.innerHTML = this.renderMessagesList();
                        this.scrollToBottom();
                    }

                    console.log('✅ Message added to current conversation');
                }
            }
        }

        // Update user list if the message is from a user in the list
        if (this.users) {
            const user = this.users.find(u => u.id === message.senderID || u.id === message.senderId);
            if (user) {
                user.lastMessagePreview = message.content.substring(0, 50) + (message.content.length > 50 ? '...' : '');
                user.lastMessageTime = new Date(message.timestamp || message.createdAt || new Date());
                this.renderUsers();
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

    // Test method to check if chat display works
    bindTestButton() {
        const testBtn = document.getElementById('test-chat-btn');
        if (testBtn) {
            testBtn.addEventListener('click', () => {
                console.log('🧪 Test button clicked - creating test conversation');

                // Create a test conversation
                const testConversation = {
                    userID: 'test-user-123',
                    nickname: 'Test User',
                    firstName: 'Test',
                    lastName: 'User',
                    avatarURL: '/static/images/default-avatar.png',
                    lastMessage: 'Test message',
                    lastMessageTime: new Date().toISOString(),
                    unreadCount: 0
                };

                // Set test messages
                this.messages = [
                    {
                        id: 'msg1',
                        senderID: 'test-user-123',
                        receiverID: window.forumApp.currentUser?.id || 'current-user',
                        content: 'Hello! This is a test message.',
                        createdAt: new Date(Date.now() - 60000),
                        senderName: 'Test User'
                    },
                    {
                        id: 'msg2',
                        senderID: window.forumApp.currentUser?.id || 'current-user',
                        receiverID: 'test-user-123',
                        content: 'Hi there! This is my reply.',
                        createdAt: new Date(),
                        senderName: 'You'
                    }
                ];

                // Select the test conversation
                this.selectConversation(testConversation);
            });
        }
    }
};
