// Chat Component for Private Messaging
window.ChatComponent = {
    isVisible: false,
    currentConversation: null,
    messages: [],
    typingUsers: new Set(),

    init() {
        this.bindEvents();
        console.log('💬 Chat component initialized');
    },

    bindEvents() {
        const toggleBtn = document.getElementById('toggle-chat');
        const messageInput = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-message-btn');

        if (toggleBtn) {
            toggleBtn.addEventListener('click', this.toggleChat.bind(this));
        }

        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });

            // Typing indicator
            let typingTimeout;
            messageInput.addEventListener('input', () => {
                if (this.currentConversation && window.forumApp.websocket) {
                    window.forumApp.websocket.sendTypingIndicator(
                        this.currentConversation.userID, 
                        true
                    );

                    clearTimeout(typingTimeout);
                    typingTimeout = setTimeout(() => {
                        window.forumApp.websocket.sendTypingIndicator(
                            this.currentConversation.userID, 
                            false
                        );
                    }, 1000);
                }
            });
        }

        if (sendBtn) {
            sendBtn.addEventListener('click', this.sendMessage.bind(this));
        }

        // Listen for WebSocket messages
        if (window.forumApp?.websocket) {
            window.forumApp.websocket.addEventListener('private_message', (message) => {
                this.addMessage(message);
            });

            window.forumApp.websocket.addEventListener('typing_indicator', (data) => {
                this.updateTypingIndicator(data);
            });
        }
    },

    toggleChat() {
        const chatPanel = document.querySelector('.chat-panel');
        if (chatPanel) {
            this.isVisible = !this.isVisible;
            chatPanel.classList.toggle('show', this.isVisible);
        }
    },

    showChat() {
        const chatPanel = document.querySelector('.chat-panel');
        if (chatPanel) {
            this.isVisible = true;
            chatPanel.classList.add('show');
        }
    },

    hideChat() {
        const chatPanel = document.querySelector('.chat-panel');
        if (chatPanel) {
            this.isVisible = false;
            chatPanel.classList.remove('show');
        }
    },

    async openConversation(user) {
        this.currentConversation = user;
        this.showChat();
        
        // Update chat header
        const chatHeader = document.querySelector('.chat-header h3');
        if (chatHeader) {
            chatHeader.textContent = `Chat with ${user.nickname}`;
        }

        // Load messages
        await this.loadMessages(user.userID);
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
            if (window.forumApp.notificationComponent) {
                window.forumApp.notificationComponent.error('Failed to load messages');
            }
        }
    },

    renderMessages() {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        messagesContainer.innerHTML = '';

        if (this.messages.length === 0) {
            messagesContainer.innerHTML = `
                <div class="no-messages">
                    <p>No messages yet. Start the conversation!</p>
                </div>
            `;
            return;
        }

        this.messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            messagesContainer.appendChild(messageElement);
        });

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },

    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        const isOwnMessage = window.forumApp.currentUser && 
                           message.senderID === window.forumApp.currentUser.id;
        
        messageDiv.className = `chat-message ${isOwnMessage ? 'own-message' : 'other-message'}`;
        
        // Format message as specified in prompt: [YYYY-MM-DD HH:MM] Username: Content
        const timestamp = window.utils.formatTime(message.createdAt);
        const senderName = isOwnMessage ? 'You' : message.senderName;
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-header">
                    <span class="message-time">${timestamp}</span>
                    <span class="message-sender">${window.utils.escapeHtml(senderName)}</span>
                </div>
                <div class="message-text">${window.utils.escapeHtml(message.content)}</div>
            </div>
        `;

        return messageDiv;
    },

    addMessage(message) {
        // Only add if it's for the current conversation
        if (!this.currentConversation) return;
        
        const isRelevant = (message.senderID === this.currentConversation.userID && 
                           message.receiverID === window.forumApp.currentUser.id) ||
                          (message.senderID === window.forumApp.currentUser.id && 
                           message.receiverID === this.currentConversation.userID);
        
        if (!isRelevant) return;

        this.messages.push(message);
        
        // Keep only last 50 messages in memory
        if (this.messages.length > 50) {
            this.messages = this.messages.slice(-50);
        }

        this.renderMessages();
    },

    async sendMessage() {
        const messageInput = document.getElementById('message-input');
        if (!messageInput || !this.currentConversation) return;

        const content = messageInput.value.trim();
        if (!content) return;

        try {
            const response = await window.api.sendMessage(this.currentConversation.userID, content);
            if (response.success) {
                messageInput.value = '';
                
                // Add message to local list
                this.addMessage(response.data);
                
                // Send via WebSocket for real-time delivery
                if (window.forumApp.websocket) {
                    window.forumApp.websocket.sendPrivateMessage(
                        this.currentConversation.userID, 
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

    updateTypingIndicator(data) {
        const { userID, isTyping } = data;
        
        if (!this.currentConversation || userID !== this.currentConversation.userID) {
            return;
        }

        if (isTyping) {
            this.typingUsers.add(userID);
        } else {
            this.typingUsers.delete(userID);
        }

        this.renderTypingIndicator();
    },

    renderTypingIndicator() {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        // Remove existing typing indicator
        const existingIndicator = messagesContainer.querySelector('.typing-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        // Add new typing indicator if someone is typing
        if (this.typingUsers.size > 0) {
            const typingDiv = document.createElement('div');
            typingDiv.className = 'typing-indicator';
            typingDiv.innerHTML = `
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <span class="typing-text">${this.currentConversation.nickname} is typing...</span>
            `;
            messagesContainer.appendChild(typingDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
};
