const Messages = {
    activeChats: new Map(),
    messages: new Map(),

    init() {
        this.messagesContainer = document.getElementById('messages-container');
        this.bindEvents();
    },

    async loadOnlineUsers() {
        try {
            const response = await fetch('/api/users/online');
            if (response.ok) {
                const users = await response.json();
                const onlineContacts = document.getElementById('online-contacts');
                onlineContacts.innerHTML = users.map(user => `
                    <div class="contact" data-user-id="${user.id}">
                         <img src="${user.gender &&
                        user.gender.toLowerCase() === "male"
                        ? "/static/img/maleavatar.jpeg"
                        : "/static/img/avatar.jpeg"}" 
            alt="Avatar" 
            class="comment-avatar">
                        <span class="name">${user.nickname}</span>
                    </div>
                `).join('');
            } else {
                this.showNotification('Failed to load online users', 'error');
            }
        } catch (error) {
            this.showNotification('Failed to load online users', 'error');
            console.error('Failed to load online users:', error);
        }
    },

    bindEvents() {
        // Load online users on page load
        this.loadOnlineUsers();

        // Open chat from contacts list
        document.getElementById('online-contacts').addEventListener('click', (e) => {
            const contact = e.target.closest('.contact');
            if (document.getElementById('chat-overlay')) {
                const chatOverlay = document.getElementById('chat-overlay');
                chatOverlay.remove();
            } else {
                if (contact) {
                    const userId = contact.dataset.userId;
                    this.toggleChatOverlay(userId);
                }
            }
        });

        // Messages icon click
        document.querySelector('.messages-icon').addEventListener('click', () => {
            this.toggleMessagesList();
        });

        // 
    },

    toggleMessagesList() {
        this.messagesContainer.classList.toggle('hidden');
        if (!this.messagesContainer.classList.contains('hidden')) {
            this.loadRecentChats();
        }
    },

    async loadRecentChats() {
        try {
            const response = await fetch('/api/ws/messages/recent');
            if (response.ok) {
                const chat_section = document.querySelector('.chat-section');
                chat_section.classList.toggle('hidden');
                const chats = await response.json();
                // chats.forEach(chat => {
                //     this.messages.set(chat.user.id, chat.messages);
                //     if (chat.unread > 0) {
                //         this.openChat(chat.user.id);
                //     }
                // });
                this.showNotification('Failed to load recent chats', 'error');
            }
        } catch (error) {
            this.showNotification('Failed to load recent chats', 'error');
            console.error('Failed to load recent chats:', error);
        }
    },

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    },

    async openChat(userId) {
        try {
            // Fetch user details and chat history
            const response = await fetch(`/api/users/${userId}`);//.then(res => res.json());
            if (response.ok) {
                const user = await response.json();
                try {

                    const response_msg = await fetch(`/api/messages/${userId}`);

                    if (response_msg.ok) {
                        const messages = await response_msg.json();
                        const chatOverlay = document.createElement('div');
                        chatOverlay.className = 'chat-overlay';
                        chatOverlay.dataset.userId = user.id;

                        if (messages) {
                            chatOverlay.innerHTML = `
                                <!-- Header -->
                                <div class="chat-header flex items-center justify-between p-4 border-b border-blue-700">
                                    <div class="flex items-center space-x-3">
                                        <img src="${user.gender &&
                                    user.gender.toLowerCase() === "male"
                                    ? "/static/img/maleavatar.jpeg"
                                    : "/static/img/avatar.jpeg"
                                }" alt="Avatar" class="comment-avatar">
                                        <div class="text-white font-bold">${user.nickname
                                }</div>
                                    </div>
                                    <button class="close-chat text-white hover:text-blue-300 text-xl">&times;</button>
                                </div>
 
                                <!-- Footer (Message Input) -->
                                ${this.renderMessages(userId, messages)}
                                <div class="chat-footer p-4 border-t border-blue-700">
                                    <div class="flex items-center space-x-2">
                                        <form class="chat-form w-full" data-user-id="${user.id
                                }">
                                            <input class="w-full" name="message" type="text" placeholder="Type your message..."
                                                class="chat-input flex-1 bg-blue-700 text-white placeholder-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" autocomplete="off"/>
                                            <button class="bg-blue-600 hover:bg-blue-500 text-white rounded-full p-2">
                                                <i class="fas fa-paper-plane"></i>
                                            </button>
                                        </form>
                                    </div>
                                </div>`;
                        } else {
                            chatOverlay.innerHTML = `
                       <!-- Header -->
                        <div class="flex items-center justify-between p-4 border-b border-blue-700">
                            <div class="flex items-center space-x-3">
                                <img src="${user.gender && user.gender.toLowerCase() === "male"
                                    ? "/static/img/maleavatar.jpeg"
                                    : "/static/img/avatar.jpeg"
                                }" alt="Avatar" class="comment-avatar">
                                <div class="text-white font-bold">${user.nickname}</div>
                            </div>
                            <button class="close-chat text-white hover:text-blue-300 text-xl">&times;</button>
                        </div>

                        <!-- Chat Area -->
                        <div class="chat-messages flex-1 overflow-y-auto p-4 space-y-4"></div>
            
                        <!-- Footer (Message Input) -->
                        <div class="p-4 border-t border-blue-700">
                            <div class="flex items-center space-x-2">
                            <form class="chat-form w-full" data-user-id="${user.id}">
                                <input name="message" type="text" placeholder="Type your message..."
                                    class="chat-input flex-1 bg-blue-700 text-white placeholder-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                <button class="bg-blue-600 hover:bg-blue-500 text-white rounded-full p-2">
                                    <i class="fas fa-paper-plane"></i>
                                </button>
                                </form>
                            </div>
                        </div>`;
                        }
                        // Add close button functionality
                        const closeButton = chatOverlay.querySelector('.close-chat');
                        closeButton.addEventListener('click', () => {
                            chatOverlay.remove();
                        });

                        const chatForm = chatOverlay.querySelector('.chat-form');
                        chatForm.addEventListener('submit', async (e) => {
                            e.preventDefault();
                            const inputField = chatForm.querySelector('input[name="message"]');
                            const content = inputField.value.trim();

                            if (!content) {
                                console.error('Message content is empty');
                                this.showNotification('Message cannot be empty', 'error');
                                return;
                            }

                            await this.sendMessage();
                        });

                        document.body.appendChild(chatOverlay);
                    } else {
                        this.showNotification("Messages not found", "info");
                    }
                } catch (error) {
                    this.showNotification('Failed to load messages', 'error');
                    console.error('Failed to open messages:', error);
                }
            }
        } catch (error) {
            this.showNotification('Failed to open chat', 'error');
            console.error('Failed to open chat:', error);
        }
    },

    renderMessages(userId, messages) {
        const chatMessages = document.createElement("div");
        chatMessages.classList.add("chat-messages");
        chatMessages.dataset.userId = userId;
    
        // Sort messages by timestamp
        messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
        let lastRenderedDate = null;
        const now = new Date();
    
        const formattedMessages = messages.map(msg => {
            const messageDate = new Date(msg.timestamp);
            const isSent = msg.receiverId === userId;
    
            // Format time (HH:MM)
            const timeStr = messageDate.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
            });
    
            // Check if a new date header is needed
            let dateHeader = '';
            const msgDateStr = messageDate.toDateString();
    
            if (msgDateStr !== lastRenderedDate) {
                lastRenderedDate = msgDateStr;
    
                const diffInDays = Math.floor((now - messageDate) / (1000 * 60 * 60 * 24));
    
                if (diffInDays === 0) {
                    dateHeader = `<div class="date-header">Today</div>`;
                } else if (diffInDays === 1) {
                    dateHeader = `<div class="date-header">Yesterday</div>`;
                } else if (diffInDays < 7) {
                    const weekday = messageDate.toLocaleDateString(undefined, { weekday: 'long' });
                    dateHeader = `<div class="date-header">${weekday}</div>`;
                } else {
                    const fullDate = messageDate.toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                    dateHeader = `<div class="date-header">${fullDate}</div>`;
                }
            }
    
            return `
                ${dateHeader}
                <div class="message ${isSent ? "sent" : "received"}">
                    <p class="message-text">${msg.content}</p>
                    <hr style="height: 2px; margin-top: 10px; background-color: ${isSent ? '#02113f' : 'gray'}; border: none; border-radius: 19px; margin: 5px 0;" />
                    <span class="message-time">${timeStr}</span>
                </div>
            `;
        }).join('');
    
        chatMessages.innerHTML = formattedMessages;
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return chatMessages.outerHTML;
    },
    

    async sendMessage() {
        const chatOverlay = document.querySelector('.chat-overlay');
        if (!chatOverlay) {
            console.error('Chat overlay not found');
            return;
        }

        const recipientId = chatOverlay.dataset.userId;
        const inputField = chatOverlay.querySelector('input[name="message"]');
        const content = inputField.value.trim();

        if (!content) {
            this.showNotification('Message cannot be empty', 'error');
            console.error('Message content is empty');
            return;
        }

        try {
            const response = await fetch(`/api/messages/send/${recipientId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content }),
            });

            if (response.ok) {
                const message = await response.json();
                this.handleNewMessage(recipientId, message);
                inputField.value = '';
            } else {
                this.showNotification('Failed to send message', 'error');
                console.error('Failed to send message:', response.statusText);
            }
        } catch (error) {
            this.showNotification('Failed to send message', 'error');
            console.error('Error sending message:', error);
        }
    },

    handleNewMessage(recipientId, message) {
        const userId = message.senderId === message.currentUserId ? message.senderId : message.receiverId;

        // Store message
        if (!this.messages.has(userId)) {
            this.messages.set(userId, []);
        }
        this.messages.get(userId).push(message);
        const chatMessages = document.querySelector('.chat-messages');
        const newMessage = `
            <div class="message sent">
                <p class="message-text">${message.content}</p>
                <hr style="height: 2px; margin-top: 10px; background-color: #02113f; border: none; border-radius: 19px; margin: 5px 0;" />
                <!-- <span class="message-time">${new Date(message.timestamp).toLocaleString()}</span> -->
                <span class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</span>
            </div>
        `;
        chatMessages.insertAdjacentHTML('beforeend', newMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Update message count if message is received
        if ((message.senderId !== message.currentUserId) && document.querySelector('.chat-overlay').className.includes('hidden')) {
            // location.reload();
            this.updateMessageCount(1);
            // Mark as read if chat is focused
            if (document.querySelector('.chat-overlay') && !document.querySelector('.chat-overlay').className.includes('hidden')) {
                this.markAsRead(userId);
            }
        }
    },

    updateMessageCount(increment = 1) {
        const badge = document.querySelector('.messages-count');
        if (badge) {
            const currentCount = parseInt(badge.textContent) || 0;
            badge.textContent = currentCount + increment;
            badge.classList.remove('hidden');
        }
    },

    async markAsRead(userId) {
        try {
            await fetch(`/api/messages/${userId}/read`, {
                method: 'POST',
            });
            this.updateMessageCount(-1);
        } catch (error) {
            this.showNotification("Could not get message notifications", 'error');
            console.error('Failed to mark messages as read:', error);
        }
    },


    toggleChatOverlay(userId) {
        let chatOverlay = document.querySelector('.chat-overlay');

        if (!chatOverlay) {
            // If the overlay doesn't exist, create and append it
            this.openChat(userId);
        } else {
            // Toggle visibility
            if (chatOverlay.className.includes("hidden") || chatOverlay.classList.contains('hidden')) {
                chatOverlay.classList.remove('hidden');
            } else {
                chatOverlay.remove();
            }
        }
    }
    ,

    focusChat(userId) {
        const chatWindow = this.activeChats.get(userId);
        if (!chatWindow) return;

        // Bring to front
        document.querySelectorAll('.chat-window').forEach(window => {
            window.style.zIndex = '1000';
        });
        chatWindow.style.zIndex = '1001';

        // Focus input
        chatWindow.querySelector('input[name="message"]').focus();
    },

    closeChat(userId) {
        const chatWindow = this.activeChats.get(userId);
        if (chatWindow) {
            chatWindow.classList.add('hidden');
            setTimeout(() => {
                chatWindow.remove();
                this.activeChats.delete(userId);
            }, 300); // Match the CSS transition duration
        }
    }
};
