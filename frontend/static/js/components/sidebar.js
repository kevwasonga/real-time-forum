// Sidebar Component for Online Users
window.SidebarComponent = {
    onlineUsers: [],
    updateInterval: null,

    init() {
        this.bindEvents();
        this.startUpdating();
        console.log('👥 Sidebar component initialized');
    },

    bindEvents() {
        // Listen for WebSocket user status updates
        if (window.forumApp?.websocket) {
            window.forumApp.websocket.addEventListener('user_status', (data) => {
                this.updateUserStatus(data);
            });
        }
    },

    startUpdating() {
        // Only update if user is authenticated
        if (window.auth && window.auth.isLoggedIn()) {
            this.updateOnlineUsers();
            this.updateInterval = setInterval(() => {
                if (window.auth && window.auth.isLoggedIn()) {
                    this.updateOnlineUsers();
                }
            }, 30000);
        }
    },

    stopUpdating() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    },

    async updateOnlineUsers() {
        try {
            const response = await window.api.getOnlineUsers();
            if (response.success) {
                this.onlineUsers = response.data || [];
                this.render();
            }
        } catch (error) {
            console.error('Failed to fetch online users:', error);
        }
    },

    updateUserStatus(statusData) {
        const { userID, nickname, status } = statusData;
        
        if (status === 'online') {
            // Add user if not already in list
            if (!this.onlineUsers.find(user => user.userID === userID)) {
                this.onlineUsers.push({
                    userID,
                    nickname,
                    firstName: '',
                    lastName: '',
                    avatarURL: null,
                    lastSeen: new Date().toISOString()
                });
            }
        } else if (status === 'offline') {
            // Remove user from list
            this.onlineUsers = this.onlineUsers.filter(user => user.userID !== userID);
        }
        
        this.render();
    },

    render() {
        const onlineUsersContainer = document.getElementById('online-users');
        const onlineCountElement = document.getElementById('online-count');
        
        if (!onlineUsersContainer || !onlineCountElement) return;

        // Update count
        onlineCountElement.textContent = this.onlineUsers.length;

        // Sort users alphabetically by nickname as specified in prompt
        const sortedUsers = [...this.onlineUsers].sort((a, b) => {
            return a.nickname.localeCompare(b.nickname);
        });

        // Render users list
        onlineUsersContainer.innerHTML = '';
        
        if (sortedUsers.length === 0) {
            onlineUsersContainer.innerHTML = `
                <div class="no-online-users">
                    <p>No users online</p>
                </div>
            `;
            return;
        }

        sortedUsers.forEach(user => {
            const userElement = this.createUserElement(user);
            onlineUsersContainer.appendChild(userElement);
        });
    },

    createUserElement(user) {
        const userDiv = document.createElement('div');
        userDiv.className = 'online-user';
        userDiv.setAttribute('data-user-id', user.userID);
        
        const avatarUrl = user.avatarURL || '/static/images/default-avatar.png';
        const displayName = user.nickname;
        
        userDiv.innerHTML = `
            <img src="${avatarUrl}" alt="${displayName}'s avatar" class="online-user-avatar">
            <span class="online-user-name">${window.utils.escapeHtml(displayName)}</span>
            <div class="online-indicator"></div>
        `;

        // Add click handler to start conversation
        userDiv.addEventListener('click', () => {
            this.startConversation(user);
        });

        return userDiv;
    },

    startConversation(user) {
        // Don't start conversation with self
        if (window.forumApp.currentUser && user.userID === window.forumApp.currentUser.id) {
            return;
        }

        // Navigate to messages page with this user
        if (window.forumApp.router) {
            window.forumApp.router.navigate('/messages');
            
            // Set the selected user for messaging
            setTimeout(() => {
                if (window.forumApp.messagesComponent) {
                    window.forumApp.messagesComponent.selectUser(user);
                }
            }, 100);
        }
    },

    destroy() {
        this.stopUpdating();
    }
};
