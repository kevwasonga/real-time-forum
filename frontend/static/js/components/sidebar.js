// Sidebar Component for Online Users
window.SidebarComponent = {
    onlineUsers: [],
    updateInterval: null,
    eventsBound: false,

    init() {
        console.log('👥 Initializing sidebar component...');
        this.bindEvents();
        this.startUpdating();
        console.log('👥 Sidebar component initialized');
    },

    bindEvents() {
        console.log('👥 Binding sidebar events...');
        // Listen for WebSocket user status updates
        if (window.forumApp?.websocket) {
            console.log('👥 WebSocket found, adding user_status listener');
            window.forumApp.websocket.addEventListener('user_status', (data) => {
                console.log('👥 Received user_status event:', data);
                this.updateUserStatus(data);
            });
        } else {
            console.log('👥 WebSocket not found, will retry later');
            // Retry binding events after a delay if WebSocket isn't ready yet
            setTimeout(() => {
                if (window.forumApp?.websocket && !this.eventsBound) {
                    console.log('👥 Retrying WebSocket event binding...');
                    this.bindEvents();
                    this.eventsBound = true;
                }
            }, 2000);
        }
    },

    startUpdating() {
        console.log('👥 Starting online users updates...');
        // Only update if user is authenticated
        if (window.auth && window.auth.isLoggedIn()) {
            console.log('👥 User is authenticated, starting updates');
            this.updateOnlineUsers();
            this.updateInterval = setInterval(() => {
                if (window.auth && window.auth.isLoggedIn()) {
                    console.log('👥 Periodic update of online users');
                    this.updateOnlineUsers();
                }
            }, 30000);
        } else {
            console.log('👥 User not authenticated, skipping updates');
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
            console.log('👥 Fetching online users from API...');
            const response = await window.api.getOnlineUsers();
            console.log('👥 API response:', response);
            if (response.success) {
                this.onlineUsers = response.data || [];
                console.log('👥 Online users updated:', this.onlineUsers);
                this.render();
            } else {
                console.log('👥 API response not successful:', response);
            }
        } catch (error) {
            console.error('👥 Failed to fetch online users:', error);
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
        console.log('👥 Rendering online users...', this.onlineUsers);
        const onlineUsersContainer = document.getElementById('online-users');
        const onlineCountElement = document.getElementById('online-count');

        if (!onlineUsersContainer || !onlineCountElement) {
            console.log('👥 Missing DOM elements:', { onlineUsersContainer, onlineCountElement });
            return;
        }

        // Update count
        onlineCountElement.textContent = this.onlineUsers.length;
        console.log('👥 Updated online count to:', this.onlineUsers.length);

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
                    <div class="test-buttons">
                        <button class="btn btn-sm btn-outline" id="test-api-btn">Test API</button>
                        <button class="btn btn-sm btn-secondary" id="add-fake-users-btn">Add Fake Users</button>
                        <button class="btn btn-sm btn-primary" id="debug-sidebar-btn">Debug Info</button>
                    </div>
                </div>
            `;

            // Bind test button events
            const testApiBtn = document.getElementById('test-api-btn');
            const addFakeUsersBtn = document.getElementById('add-fake-users-btn');
            const debugSidebarBtn = document.getElementById('debug-sidebar-btn');

            if (testApiBtn) {
                testApiBtn.addEventListener('click', () => this.testAPI());
            }

            if (addFakeUsersBtn) {
                addFakeUsersBtn.addEventListener('click', () => this.addFakeUsers());
            }

            if (debugSidebarBtn) {
                debugSidebarBtn.addEventListener('click', () => this.debugSidebar());
            }

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
    },

    // Test functions (temporary for debugging)
    async testAPI() {
        console.log('👥 Testing online users API...');
        try {
            const response = await fetch('/api/online-users', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('👥 Raw API response status:', response.status);
            const data = await response.json();
            console.log('👥 Raw API response data:', data);

            if (window.forumApp.notificationComponent) {
                window.forumApp.notificationComponent.info(`API Test: ${response.status} - Check console for details`);
            }
        } catch (error) {
            console.error('👥 API test failed:', error);
            if (window.forumApp.notificationComponent) {
                window.forumApp.notificationComponent.error('API test failed - Check console');
            }
        }
    },

    addFakeUsers() {
        console.log('👥 Adding fake users for testing...');
        this.onlineUsers = [
            {
                userID: 'user1',
                nickname: 'TestUser1',
                firstName: 'Test',
                lastName: 'User1',
                avatarURL: '/static/images/default-avatar.svg',
                lastSeen: new Date().toISOString()
            },
            {
                userID: 'user2',
                nickname: 'TestUser2',
                firstName: 'Test',
                lastName: 'User2',
                avatarURL: '/static/images/default-avatar.svg',
                lastSeen: new Date().toISOString()
            },
            {
                userID: 'user3',
                nickname: 'TestUser3',
                firstName: 'Test',
                lastName: 'User3',
                avatarURL: '/static/images/default-avatar.svg',
                lastSeen: new Date().toISOString()
            }
        ];

        this.render();

        if (window.forumApp.notificationComponent) {
            window.forumApp.notificationComponent.success('Added 3 fake users for testing');
        }
    },

    // Debug function to check sidebar status
    debugSidebar() {
        console.log('=== SIDEBAR DEBUG INFO ===');
        console.log('Sidebar component:', this);
        console.log('Online users:', this.onlineUsers);
        console.log('Update interval:', this.updateInterval);

        const sidebar = document.getElementById('sidebar');
        const onlineUsers = document.getElementById('online-users');
        const onlineCount = document.getElementById('online-count');

        console.log('Sidebar element:', sidebar);
        console.log('Sidebar visible:', sidebar ? sidebar.style.display : 'N/A');
        console.log('Online users container:', onlineUsers);
        console.log('Online count element:', onlineCount);
        console.log('Current count text:', onlineCount ? onlineCount.textContent : 'N/A');

        console.log('Auth status:', window.auth ? window.auth.isLoggedIn() : 'Auth not available');
        console.log('Current user:', window.forumApp ? window.forumApp.currentUser : 'ForumApp not available');
        console.log('WebSocket:', window.forumApp ? window.forumApp.websocket : 'WebSocket not available');
        console.log('=== END DEBUG INFO ===');

        // Force a render
        this.render();
    }
};
