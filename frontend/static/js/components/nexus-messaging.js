/**
 * Forum - Enhanced Messaging Component
 * Handles private messaging and real-time chat functionality
 */

class NexusMessaging {
    constructor() {
        this.conversations = [];
        this.activeConversation = null;
        this.onlineUsers = [];
        this.isLoading = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        console.log('💬 Messaging component initialized');
    }

    setupEventListeners() {
        // Listen for page changes
        nexusCore.on('page:change', (event) => {
            if (event.detail.page === 'messages') {
                this.renderMessagingPage();
            }
        });

        // Listen for WebSocket messages
        nexusCore.on('websocket:private_message', (event) => {
            this.handleIncomingMessage(event.detail);
        });

        nexusCore.on('websocket:user_status', (event) => {
            this.handleUserStatusChange(event.detail);
        });
    }

    /**
     * Render messaging page
     */
    async renderMessagingPage() {
        nexusNavigation.setPageTitle('Messages');
        
        const template = `
            <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pt-20">
                <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <!-- Page Header -->
                    <div class="mb-8">
                        <h1 class="nexus-heading-1 mb-2">Messages</h1>
                        <p class="nexus-text-secondary">Connect with forum members</p>
                    </div>

                    <div class="grid lg:grid-cols-3 gap-6">
                        <!-- Conversations List -->
                        <div class="lg:col-span-1">
                            <div class="nexus-card">
                                <div class="nexus-card-header">
                                    <h2 class="nexus-heading-3">Conversations</h2>
                                    <button 
                                        class="nexus-btn nexus-btn-primary nexus-btn-sm"
                                        onclick="nexusMessaging.showNewMessageModal()"
                                    >
                                        <i class="fas fa-plus mr-2"></i>
                                        New
                                    </button>
                                </div>
                                <div class="nexus-card-body p-0">
                                    <div id="conversations-list">
                                        ${this.isLoading ? this.renderLoadingSkeleton() : ''}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Chat Area -->
                        <div class="lg:col-span-2">
                            <div id="chat-area">
                                ${this.activeConversation ? this.renderChatArea() : this.renderEmptyChat()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.renderToMainContent(template);
        await this.loadConversations();
        await this.loadOnlineUsers();
    }

    /**
     * Load conversations from API
     */
    async loadConversations() {
        try {
            this.isLoading = true;
            this.updateConversationsList();

            // Load online users as potential conversation partners
            const response = await nexusCore.apiRequest('/community/active-members');

            if (response.ok) {
                const users = await response.json();
                // Convert users to conversation format
                this.conversations = users.map(user => ({
                    userId: user.id,
                    firstName: user.firstName || user.nickname,
                    lastName: user.lastName || '',
                    username: user.username || user.nickname,
                    lastMessage: '',
                    lastMessageTime: new Date(),
                    unreadCount: 0
                }));
                this.updateConversationsList();
            } else {
                throw new Error('Failed to load users');
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
            nexusCore.showNotification('Failed to load users', 'error');
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Load online users
     */
    async loadOnlineUsers() {
        try {
            const response = await nexusCore.apiRequest('/community/active-members');

            if (response.ok) {
                const users = await response.json();
                // Extract user IDs for online status checking
                this.onlineUsers = users.map(user => user.id);
            }
        } catch (error) {
            console.error('Error loading online users:', error);
        }
    }

    /**
     * Update conversations list
     */
    updateConversationsList() {
        const container = document.getElementById('conversations-list');
        if (!container) return;

        if (this.isLoading) {
            container.innerHTML = this.renderLoadingSkeleton();
            return;
        }

        if (this.conversations.length === 0) {
            container.innerHTML = this.renderEmptyConversations();
            return;
        }

        container.innerHTML = this.conversations.map(conversation => 
            this.renderConversationItem(conversation)
        ).join('');
    }

    /**
     * Render conversation item
     */
    renderConversationItem(conversation) {
        const isOnline = this.onlineUsers.includes(conversation.userId);
        const isActive = this.activeConversation?.userId === conversation.userId;
        
        return `
            <div class="conversation-item ${isActive ? 'active' : ''} p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                 onclick="nexusMessaging.selectConversation('${conversation.userId}')">
                <div class="flex items-center gap-3">
                    <div class="relative">
                        <img 
                            src="/static/img/default-avatar.png" 
                            alt="${conversation.firstName}"
                            class="nexus-avatar nexus-avatar-md"
                        >
                        ${isOnline ? '<div class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>' : ''}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between">
                            <h4 class="font-medium text-gray-900 truncate">
                                ${conversation.firstName} ${conversation.lastName}
                            </h4>
                            <span class="text-xs text-gray-500">
                                ${nexusCore.formatDate(conversation.lastMessageTime)}
                            </span>
                        </div>
                        <p class="text-sm text-gray-600 truncate">
                            ${conversation.lastMessage || 'No messages yet'}
                        </p>
                    </div>
                    ${conversation.unreadCount > 0 ? `
                        <div class="nexus-badge nexus-badge-primary">
                            ${conversation.unreadCount}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Render chat area
     */
    renderChatArea() {
        return `
            <div class="nexus-chat-container">
                <div class="nexus-chat-header">
                    <div class="flex items-center gap-3">
                        <img 
                            src="/static/img/default-avatar.png" 
                            alt="${this.activeConversation.firstName}"
                            class="nexus-avatar nexus-avatar-md"
                        >
                        <div>
                            <h3 class="font-medium text-gray-900">
                                ${this.activeConversation.firstName} ${this.activeConversation.lastName}
                            </h3>
                            <p class="text-sm text-gray-500">
                                ${this.isUserOnline(this.activeConversation.userId) ? 'Online' : 'Offline'}
                            </p>
                        </div>
                    </div>
                    <button 
                        class="nexus-btn nexus-btn-ghost"
                        onclick="nexusMessaging.closeChat()"
                    >
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="nexus-chat-messages" id="chat-messages">
                    <!-- Messages will be loaded here -->
                </div>
                
                <div class="nexus-chat-input">
                    <form class="nexus-chat-form" onsubmit="nexusMessaging.sendMessage(event)">
                        <textarea 
                            class="nexus-chat-textarea" 
                            placeholder="Type your message..."
                            rows="1"
                            id="message-input"
                            onkeydown="nexusMessaging.handleKeyDown(event)"
                        ></textarea>
                        <button type="submit" class="nexus-btn nexus-btn-primary">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </form>
                </div>
            </div>
        `;
    }

    /**
     * Render empty chat state
     */
    renderEmptyChat() {
        return `
            <div class="nexus-card h-96 flex items-center justify-center">
                <div class="text-center">
                    <i class="fas fa-comments text-6xl text-gray-300 mb-4"></i>
                    <h3 class="nexus-heading-3 mb-2">Select a conversation</h3>
                    <p class="nexus-text-secondary mb-6">
                        Choose a conversation from the list to start messaging
                    </p>
                    <button 
                        class="nexus-btn nexus-btn-primary"
                        onclick="nexusMessaging.showNewMessageModal()"
                    >
                        <i class="fas fa-plus mr-2"></i>
                        Start New Conversation
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Show new message modal
     */
    showNewMessageModal() {
        const template = `
            <div class="nexus-modal-overlay active" id="new-message-modal">
                <div class="nexus-modal nexus-animate-scale-in" style="max-width: 500px;">
                    <div class="nexus-modal-header">
                        <h2 class="nexus-modal-title">
                            <i class="fas fa-envelope mr-2 nexus-gradient-text"></i>
                            New Message
                        </h2>
                        <button class="nexus-modal-close" onclick="nexusMessaging.closeNewMessageModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="nexus-modal-body">
                        <form id="new-message-form" class="space-y-4">
                            <div class="nexus-form-group">
                                <label class="nexus-label">To</label>
                                <select name="recipient" class="nexus-select" required>
                                    <option value="">Select a member</option>
                                    ${this.users.map(user => `
                                        <option value="${user.id}">${user.firstName} ${user.lastName} (@${user.username})</option>
                                    `).join('')}
                                </select>
                            </div>

                            <div class="nexus-form-group">
                                <label class="nexus-label">Message</label>
                                <textarea
                                    name="content"
                                    class="nexus-textarea"
                                    placeholder="Type your message..."
                                    required
                                    rows="4"
                                    maxlength="1000"
                                ></textarea>
                                <div class="text-xs text-gray-500 mt-1">
                                    <span id="new-message-counter">0</span>/1000 characters
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="nexus-modal-footer">
                        <button
                            type="button"
                            class="nexus-btn nexus-btn-secondary"
                            onclick="nexusMessaging.closeNewMessageModal()"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="new-message-form"
                            class="nexus-btn nexus-btn-primary"
                        >
                            <i class="fas fa-paper-plane mr-2"></i>
                            Send Message
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', template);
        this.setupNewMessageForm();
    }

    /**
     * Setup new message form
     */
    setupNewMessageForm() {
        const form = document.getElementById('new-message-form');
        const textarea = form.querySelector('[name="content"]');
        const counter = document.getElementById('new-message-counter');

        // Character counter
        textarea.addEventListener('input', () => {
            counter.textContent = textarea.value.length;
        });

        // Form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.sendNewMessage(new FormData(form));
        });

        // Focus recipient select
        setTimeout(() => {
            form.querySelector('[name="recipient"]').focus();
        }, 100);
    }

    /**
     * Send new message
     */
    async sendNewMessage(formData) {
        const submitBtn = document.querySelector('#new-message-modal button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        try {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Sending...';
            submitBtn.disabled = true;

            const messageData = {
                content: formData.get('content')
            };

            const recipientId = formData.get('recipient');
            const response = await nexusCore.apiRequest(`/communications/dispatch/${recipientId}`, 'POST', messageData);

            if (response.ok) {
                nexusCore.showNotification('Message sent successfully!', 'success');
                this.closeNewMessageModal();

                // Open conversation with the recipient
                await this.selectConversation(recipientId);

            } else {
                const error = await response.text();
                nexusCore.showNotification(error || 'Failed to send message', 'error');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            nexusCore.showNotification('Network error. Please try again.', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }
    }

    /**
     * Close new message modal
     */
    closeNewMessageModal() {
        const modal = document.getElementById('new-message-modal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        }
    }

    /**
     * Select conversation
     */
    async selectConversation(userId) {
        try {
            const response = await nexusCore.apiRequest(`/members/${userId}`);

            if (response.ok) {
                const userData = await response.json();
                this.activeConversation = {
                    userId: userData.id,
                    firstName: userData.firstName || userData.nickname,
                    lastName: userData.lastName || '',
                    username: userData.username || userData.nickname
                };

                // Update chat area
                const chatArea = document.getElementById('chat-area');
                if (chatArea) {
                    chatArea.innerHTML = this.renderChatArea();
                }

                // Load messages for this conversation
                await this.loadMessages(userId);

                // Update active state in conversations list
                document.querySelectorAll('.conversation-item').forEach(item => {
                    item.classList.remove('active');
                });

                // Find and activate the correct conversation item
                const targetItem = document.querySelector(`[onclick="nexusMessaging.selectConversation('${userId}')"]`);
                if (targetItem) {
                    targetItem.closest('.conversation-item').classList.add('active');
                }
            }
        } catch (error) {
            console.error('Error selecting conversation:', error);
            nexusCore.showNotification('Failed to load conversation', 'error');
        }
    }

    /**
     * Load messages for conversation
     */
    async loadMessages(userId) {
        try {
            const response = await nexusCore.apiRequest(`/communications/${userId}`);
            
            if (response.ok) {
                const messages = await response.json();
                this.renderMessages(messages);
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    /**
     * Render messages in chat
     */
    renderMessages(messages) {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        container.innerHTML = messages.map(message => `
            <div class="nexus-message ${message.senderId === nexusCore.currentUser.id ? 'own' : ''}">
                <div class="nexus-message-bubble">
                    <p>${nexusCore.sanitizeHtml(message.content)}</p>
                    <div class="nexus-message-time">
                        ${nexusCore.formatDate(message.createdAt)}
                    </div>
                </div>
            </div>
        `).join('');

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    /**
     * Send message
     */
    async sendMessage(event) {
        event.preventDefault();
        
        const input = document.getElementById('message-input');
        const content = input.value.trim();
        
        if (!content || !this.activeConversation) return;

        try {
            const response = await nexusCore.apiRequest(
                `/communications/dispatch/${this.activeConversation.userId}`, 
                'POST', 
                { content }
            );

            if (response.ok) {
                input.value = '';
                // Message will be added via WebSocket
            } else {
                throw new Error('Failed to send message');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            nexusCore.showNotification('Failed to send message', 'error');
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyDown(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage(event);
        }
    }

    /**
     * Handle incoming WebSocket message
     */
    handleIncomingMessage(data) {
        // Add message to active conversation if it matches
        if (this.activeConversation && data.senderId === this.activeConversation.userId) {
            const container = document.getElementById('chat-messages');
            if (container) {
                const messageHtml = `
                    <div class="nexus-message">
                        <div class="nexus-message-bubble">
                            <p>${nexusCore.sanitizeHtml(data.content)}</p>
                            <div class="nexus-message-time">
                                ${nexusCore.formatDate(data.timestamp)}
                            </div>
                        </div>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', messageHtml);
                container.scrollTop = container.scrollHeight;
            }
        }
        
        // Update conversations list
        this.loadConversations();
    }

    /**
     * Handle user status change
     */
    handleUserStatusChange(data) {
        if (data.status === 'online') {
            if (!this.onlineUsers.includes(data.userId)) {
                this.onlineUsers.push(data.userId);
            }
        } else {
            this.onlineUsers = this.onlineUsers.filter(id => id !== data.userId);
        }
        
        // Update UI if needed
        this.updateConversationsList();
    }

    /**
     * Check if user is online
     */
    isUserOnline(userId) {
        return this.onlineUsers.includes(userId);
    }

    /**
     * Close chat
     */
    closeChat() {
        this.activeConversation = null;
        const chatArea = document.getElementById('chat-area');
        if (chatArea) {
            chatArea.innerHTML = this.renderEmptyChat();
        }
        
        // Remove active state from conversations
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });
    }

    /**
     * Render loading skeleton
     */
    renderLoadingSkeleton() {
        return Array(3).fill(0).map(() => `
            <div class="p-4 border-b border-gray-100">
                <div class="flex items-center gap-3">
                    <div class="nexus-skeleton w-12 h-12 rounded-full"></div>
                    <div class="flex-1">
                        <div class="nexus-skeleton h-4 w-32 mb-2"></div>
                        <div class="nexus-skeleton h-3 w-24"></div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Render empty conversations
     */
    renderEmptyConversations() {
        return `
            <div class="text-center py-8">
                <i class="fas fa-inbox text-4xl text-gray-300 mb-4"></i>
                <p class="nexus-text-secondary">No conversations yet</p>
            </div>
        `;
    }

    /**
     * Render template to main content
     */
    renderToMainContent(template) {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = template;
            mainContent.classList.remove('hidden');
        }
    }
}

// Initialize messaging component
document.addEventListener('DOMContentLoaded', () => {
    window.nexusMessaging = new NexusMessaging();
    nexusCore.registerComponent('messaging', NexusMessaging);
});
