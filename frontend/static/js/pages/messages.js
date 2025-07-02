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

                    <div class="user-search-section">
                        <h3>Search Users</h3>
                        <div class="search-container">
                            <input type="text" id="user-search-input" placeholder="Search for users..." class="search-input">
                            <button id="search-users-btn" class="search-btn">🔍</button>
                        </div>
                        <div id="search-results" class="search-results">
                            <!-- Search results will appear here -->
                        </div>
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
        this.setupUserSearch();
    },

    bindEvents() {
        // Listen for WebSocket messages
        if (window.forumApp?.websocket) {
            window.forumApp.websocket.addEventListener('private_message', (message) => {
                this.handleNewMessage(message);
            });
        }
    },

    setupUserSearch() {
        const searchInput = document.getElementById('user-search-input');
        const searchBtn = document.getElementById('search-users-btn');

        if (!searchInput || !searchBtn) {
            console.error('🔍 Search elements not found');
            return;
        }

        // Search on button click
        searchBtn.addEventListener('click', () => {
            this.performUserSearch();
        });

        // Search on Enter key press
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performUserSearch();
            }
        });

        // Real-time search as user types (with debounce)
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const query = searchInput.value.trim();
                if (query.length >= 2) {
                    this.performUserSearch();
                } else if (query.length === 0) {
                    this.clearSearchResults();
                }
            }, 300); // 300ms debounce
        });

        console.log('🔍 User search functionality initialized');
    },

    async performUserSearch() {
        const searchInput = document.getElementById('user-search-input');
        const searchResults = document.getElementById('search-results');

        if (!searchInput || !searchResults) {
            console.error('🔍 Search elements not found');
            return;
        }

        const query = searchInput.value.trim();

        if (query.length < 2) {
            this.clearSearchResults();
            return;
        }

        console.log('🔍 Searching for users with query:', query);

        try {
            // Show loading state
            searchResults.innerHTML = '<div class="loading-placeholder">Searching users...</div>';

            // Make API call to search users
            const response = await window.api.request(`/api/users?search=${encodeURIComponent(query)}`);

            console.log('🔍 Search response:', response);

            if (response.success && response.data) {
                this.renderSearchResults(response.data);
            } else {
                searchResults.innerHTML = '<div class="no-results">No users found</div>';
            }
        } catch (error) {
            console.error('🔍 Search error:', error);
            searchResults.innerHTML = '<div class="error-message">Search failed. Please try again.</div>';
        }
    },

    renderSearchResults(users) {
        const searchResults = document.getElementById('search-results');

        if (!searchResults) {
            console.error('🔍 Search results container not found');
            return;
        }

        if (!users || users.length === 0) {
            searchResults.innerHTML = '<div class="no-results">No users found</div>';
            return;
        }

        // Filter out current user
        const currentUser = window.forumApp.currentUser;
        const filteredUsers = users.filter(user => {
            const userId = user.id || user.userID || user.user_id || user.ID;
            return currentUser && userId !== currentUser.id;
        });

        if (filteredUsers.length === 0) {
            searchResults.innerHTML = '<div class="no-results">No other users found</div>';
            return;
        }

        console.log('🔍 Rendering', filteredUsers.length, 'search results');

        searchResults.innerHTML = filteredUsers.map(user => {
            const userId = user.id || user.userID || user.user_id || user.ID;
            const isOnline = this.isUserOnline(userId);

            return `
                <div class="search-result-item" data-user-id="${userId}">
                    <img src="${user.avatarURL || '/static/images/default-avatar.svg'}"
                         alt="${window.utils.escapeHtml(user.nickname)}'s avatar"
                         class="user-avatar">
                    <div class="user-info">
                        <div class="user-name">${window.utils.escapeHtml(user.nickname)}</div>
                        <div class="user-details">
                            <span class="user-fullname">${window.utils.escapeHtml(user.firstName || '')} ${window.utils.escapeHtml(user.lastName || '')}</span>
                            ${isOnline ? '<span class="online-indicator">🟢 Online</span>' : '<span class="offline-indicator">⚫ Offline</span>'}
                        </div>
                    </div>
                    <button class="start-chat-btn" data-user-id="${userId}">💬 Chat</button>
                </div>
            `;
        }).join('');

        // Bind click events for search results
        this.bindSearchResultEvents();
    },

    bindSearchResultEvents() {
        const searchResults = document.getElementById('search-results');
        if (!searchResults) return;

        // Bind click events to chat buttons
        const chatButtons = searchResults.querySelectorAll('.start-chat-btn');
        chatButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const userId = button.dataset.userId;
                this.startChatWithUser(userId);
            });
        });

        // Bind click events to result items
        const resultItems = searchResults.querySelectorAll('.search-result-item');
        resultItems.forEach(item => {
            item.addEventListener('click', () => {
                const userId = item.dataset.userId;
                this.startChatWithUser(userId);
            });
        });
    },

    async startChatWithUser(userId) {
        console.log('💬 Starting chat with user ID:', userId);

        try {
            // Find user data from search results or online users
            const user = this.findUserById(userId);

            if (!user) {
                console.error('❌ User not found for ID:', userId);
                return;
            }

            console.log('💬 Found user data:', user);

            // Start new conversation
            await this.startNewConversation(user);

            // Clear search results
            this.clearSearchResults();

            // Clear search input
            const searchInput = document.getElementById('user-search-input');
            if (searchInput) {
                searchInput.value = '';
            }

        } catch (error) {
            console.error('💬 Error starting chat:', error);
        }
    },

    findUserById(userId) {
        // First check online users
        const onlineUsersContainer = document.getElementById('online-users-list');
        if (onlineUsersContainer) {
            const onlineUserElement = onlineUsersContainer.querySelector(`[data-user-id="${userId}"]`);
            if (onlineUserElement) {
                // Extract user data from online users list
                const nickname = onlineUserElement.querySelector('.user-name')?.textContent;
                if (nickname) {
                    return {
                        id: userId,
                        userID: userId,
                        nickname: nickname
                    };
                }
            }
        }

        // Check search results
        const searchResults = document.getElementById('search-results');
        if (searchResults) {
            const searchResultElement = searchResults.querySelector(`[data-user-id="${userId}"]`);
            if (searchResultElement) {
                const nickname = searchResultElement.querySelector('.user-name')?.textContent;
                const fullName = searchResultElement.querySelector('.user-fullname')?.textContent;
                if (nickname) {
                    const [firstName, lastName] = (fullName || '').split(' ');
                    return {
                        id: userId,
                        userID: userId,
                        nickname: nickname,
                        firstName: firstName || '',
                        lastName: lastName || ''
                    };
                }
            }
        }

        return null;
    },

    isUserOnline(userId) {
        const onlineUsersContainer = document.getElementById('online-users-list');
        if (!onlineUsersContainer) return false;

        const onlineUserElement = onlineUsersContainer.querySelector(`[data-user-id="${userId}"]`);
        return !!onlineUserElement;
    },

    clearSearchResults() {
        const searchResults = document.getElementById('search-results');
        if (searchResults) {
            searchResults.innerHTML = '';
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

        // Debug each user object in extreme detail
        users.forEach((user, index) => {
            console.log(`👤 User ${index} FULL OBJECT:`, JSON.stringify(user, null, 2));
            console.log(`👤 User ${index} KEYS:`, Object.keys(user));
            console.log(`👤 User ${index} VALUES:`, Object.values(user));
            console.log(`👤 User ${index} .id:`, user.id);
            console.log(`👤 User ${index} .userID:`, user.userID);
            console.log(`👤 User ${index} .user_id:`, user.user_id);
            console.log(`👤 User ${index} .ID:`, user.ID);
            console.log(`👤 User ${index} nickname:`, user.nickname);
        });

        container.innerHTML = users.map((user, index) => {
            // Try different possible ID property names
            const userId = user.id || user.userID || user.user_id || user.ID;
            console.log(`🏗️ Generating HTML for user ${index} with ID:`, userId);
            console.log(`🏗️ User object keys:`, Object.keys(user));

            return `
            <div class="online-user-item" data-user-id="${userId}">
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
        `;
        }).join('');

        console.log('🏗️ Generated HTML:', container.innerHTML);

        // Debug the actual DOM elements
        const userItems = container.querySelectorAll('.online-user-item');
        console.log('🔗 Found', userItems.length, 'online user items in DOM');

        userItems.forEach((item, index) => {
            console.log(`🔗 Item ${index} dataset:`, item.dataset);
            console.log(`🔗 Item ${index} data-user-id:`, item.dataset.userId);
            console.log(`🔗 Item ${index} getAttribute('data-user-id'):`, item.getAttribute('data-user-id'));
            console.log(`🔗 Item ${index} outerHTML:`, item.outerHTML);
        });

        userItems.forEach((item, index) => {
            console.log(`🔗 Binding click event to item ${index}:`, item.dataset.userId);

            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                console.log('🖱️ Click detected on online user item!');
                console.log('🖱️ Current users array:', users);
                console.log('🖱️ Users array length:', users.length);
                console.log('🖱️ Item clicked:', item);
                console.log('🖱️ Item dataset:', item.dataset);
                console.log('🖱️ Item outerHTML:', item.outerHTML);

                const userID = item.dataset.userId;
                console.log('🖱️ Extracted userID from dataset:', userID);

                const user = users.find(u => {
                    const userId = u.id || u.userID || u.user_id || u.ID;
                    console.log('🔍 Checking user:', u, 'with ID:', userId);
                    return userId === userID;
                });

                console.log('🔍 Found user data:', user);
                console.log('🔍 Looking for userID:', userID);

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
        console.log('💬 MESSAGES: startNewConversation called with:', user.nickname);
        console.log('💬 MESSAGES: Full user object:', JSON.stringify(user, null, 2));

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
        console.log('📨 MESSAGES: selectUser called with:', user);
        console.log('📨 MESSAGES: User object:', JSON.stringify(user, null, 2));
        this.startNewConversation(user);
    },

    // Test function to send messages programmatically
    async testSendMessage(recipientId, message) {
        console.log('🧪 TEST: Sending test message to:', recipientId, 'Message:', message);

        try {
            const response = await window.api.request('/api/messages', {
                method: 'POST',
                body: JSON.stringify({
                    recipientID: recipientId,
                    content: message
                })
            });

            console.log('🧪 TEST: Message sent successfully:', response);
            return response;
        } catch (error) {
            console.error('🧪 TEST: Failed to send message:', error);
            throw error;
        }
    }


};
