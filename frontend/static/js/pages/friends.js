// Friends Page Component
window.FriendsPage = {
    friends: [],
    pendingRequests: [],

    async render() {
        window.forumApp.setCurrentPage('friends');
        
        // Require authentication
        if (!window.auth.requireAuth()) {
            return;
        }

        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="friends-container">
                <div class="friends-header">
                    <h1>Friends</h1>
                    <p>Manage your friend connections</p>
                </div>
                
                <div class="friends-tabs">
                    <button class="tab-btn active" data-tab="friends">Friends</button>
                    <button class="tab-btn" data-tab="requests">Friend Requests</button>
                    <button class="tab-btn" data-tab="find">Find Friends</button>
                </div>
                
                <div class="friends-content">
                    <div id="friends-tab" class="tab-content active">
                        <div class="section-header">
                            <h2>My Friends</h2>
                        </div>
                        <div id="friends-list" class="friends-list">
                            <div class="loading-placeholder">Loading friends...</div>
                        </div>
                    </div>
                    
                    <div id="requests-tab" class="tab-content">
                        <div class="section-header">
                            <h2>Friend Requests</h2>
                        </div>
                        <div id="requests-list" class="friends-list">
                            <div class="loading-placeholder">Loading requests...</div>
                        </div>
                    </div>
                    
                    <div id="find-tab" class="tab-content">
                        <div class="section-header">
                            <h2>Find Friends</h2>
                        </div>
                        <div class="search-section">
                            <input type="text" id="friend-search" placeholder="Search for users..." class="search-input">
                            <div id="search-results" class="search-results"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await this.loadFriendsData();
        this.bindEvents();
    },

    bindEvents() {
        // Tab switching
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', this.switchTab.bind(this));
        });

        // Friend search
        const friendSearch = document.getElementById('friend-search');
        if (friendSearch) {
            friendSearch.addEventListener('input', window.utils.debounce(this.searchUsers.bind(this), 300));
        }
    },

    switchTab(event) {
        const tabName = event.target.dataset.tab;
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');
    },

    async loadFriendsData() {
        try {
            const response = await window.api.getFriends();
            if (response.success) {
                this.friends = response.data.friends || [];
                this.pendingRequests = response.data.pendingRequests || [];
                this.renderFriends();
                this.renderRequests();
            }
        } catch (error) {
            console.error('Failed to load friends data:', error);
            const friendsList = document.getElementById('friends-list');
            const requestsList = document.getElementById('requests-list');
            if (friendsList) {
                friendsList.innerHTML = '<div class="error-message">Failed to load friends</div>';
            }
            if (requestsList) {
                requestsList.innerHTML = '<div class="error-message">Failed to load requests</div>';
            }
        }
    },

    renderFriends() {
        const container = document.getElementById('friends-list');
        if (!container) return;

        if (this.friends.length === 0) {
            container.innerHTML = '<div class="no-friends">No friends yet. Start by finding and adding some!</div>';
            return;
        }

        container.innerHTML = this.friends.map(friend => `
            <div class="friend-item">
                <img src="${friend.avatarURL || '/static/images/default-avatar.png'}" 
                     alt="${window.utils.escapeHtml(friend.nickname)}'s avatar" 
                     class="friend-avatar">
                <div class="friend-info">
                    <h3 class="friend-name">${window.utils.escapeHtml(friend.nickname)}</h3>
                    <p class="friend-full-name">${window.utils.escapeHtml(friend.firstName)} ${window.utils.escapeHtml(friend.lastName)}</p>
                    <span class="friend-status ${friend.isOnline ? 'online' : 'offline'}">
                        ${friend.isOnline ? 'Online' : 'Offline'}
                    </span>
                </div>
                <div class="friend-actions">
                    <button class="btn btn-primary btn-sm message-btn" data-user-id="${friend.userID}">
                        Message
                    </button>
                    <button class="btn btn-outline btn-sm remove-btn" data-user-id="${friend.userID}">
                        Remove
                    </button>
                </div>
            </div>
        `).join('');

        this.bindFriendActions();
    },

    renderRequests() {
        const container = document.getElementById('requests-list');
        if (!container) return;

        if (this.pendingRequests.length === 0) {
            container.innerHTML = '<div class="no-requests">No pending friend requests</div>';
            return;
        }

        container.innerHTML = this.pendingRequests.map(request => `
            <div class="friend-item request-item">
                <img src="${request.avatarURL || '/static/images/default-avatar.png'}" 
                     alt="${window.utils.escapeHtml(request.nickname)}'s avatar" 
                     class="friend-avatar">
                <div class="friend-info">
                    <h3 class="friend-name">${window.utils.escapeHtml(request.nickname)}</h3>
                    <p class="friend-full-name">${window.utils.escapeHtml(request.firstName)} ${window.utils.escapeHtml(request.lastName)}</p>
                    <span class="request-date">Requested ${window.utils.formatDate(request.createdAt)}</span>
                </div>
                <div class="friend-actions">
                    <button class="btn btn-success btn-sm accept-btn" data-user-id="${request.userID}">
                        Accept
                    </button>
                    <button class="btn btn-outline btn-sm decline-btn" data-user-id="${request.userID}">
                        Decline
                    </button>
                </div>
            </div>
        `).join('');

        this.bindRequestActions();
    },

    bindFriendActions() {
        const messageButtons = document.querySelectorAll('.message-btn');
        messageButtons.forEach(btn => {
            btn.addEventListener('click', this.handleMessage.bind(this));
        });

        const removeButtons = document.querySelectorAll('.remove-btn');
        removeButtons.forEach(btn => {
            btn.addEventListener('click', this.handleRemoveFriend.bind(this));
        });
    },

    bindRequestActions() {
        const acceptButtons = document.querySelectorAll('.accept-btn');
        acceptButtons.forEach(btn => {
            btn.addEventListener('click', this.handleAcceptRequest.bind(this));
        });

        const declineButtons = document.querySelectorAll('.decline-btn');
        declineButtons.forEach(btn => {
            btn.addEventListener('click', this.handleDeclineRequest.bind(this));
        });
    },

    handleMessage(event) {
        const userID = event.target.dataset.userId;
        const friend = this.friends.find(f => f.userID === userID);
        
        if (friend && window.forumApp.router) {
            // Navigate to messages and select this user
            window.forumApp.router.navigate('/messages');
            
            setTimeout(() => {
                if (window.forumApp.messagesComponent) {
                    window.forumApp.messagesComponent.selectUser(friend);
                }
            }, 100);
        }
    },

    async handleRemoveFriend(event) {
        const userID = event.target.dataset.userId;
        const friend = this.friends.find(f => f.userID === userID);
        
        if (!friend) return;
        
        const confirmed = confirm(`Are you sure you want to remove ${friend.nickname} from your friends?`);
        if (!confirmed) return;

        try {
            // This would typically be a separate API endpoint
            // For now, just show a message
            if (window.forumApp.notificationComponent) {
                window.forumApp.notificationComponent.info('Remove friend functionality not implemented yet');
            }
        } catch (error) {
            console.error('Failed to remove friend:', error);
        }
    },

    async handleAcceptRequest(event) {
        const userID = event.target.dataset.userId;
        
        try {
            await window.api.updateFriendRequest(userID, 'accept');
            
            if (window.forumApp.notificationComponent) {
                window.forumApp.notificationComponent.success('Friend request accepted');
            }
            
            // Reload friends data
            await this.loadFriendsData();
            
        } catch (error) {
            console.error('Failed to accept friend request:', error);
            if (window.forumApp.notificationComponent) {
                window.forumApp.notificationComponent.error('Failed to accept friend request');
            }
        }
    },

    async handleDeclineRequest(event) {
        const userID = event.target.dataset.userId;
        
        try {
            await window.api.updateFriendRequest(userID, 'decline');
            
            if (window.forumApp.notificationComponent) {
                window.forumApp.notificationComponent.info('Friend request declined');
            }
            
            // Reload friends data
            await this.loadFriendsData();
            
        } catch (error) {
            console.error('Failed to decline friend request:', error);
            if (window.forumApp.notificationComponent) {
                window.forumApp.notificationComponent.error('Failed to decline friend request');
            }
        }
    },

    async searchUsers(event) {
        const query = event.target.value.trim();
        const resultsContainer = document.getElementById('search-results');
        
        if (!resultsContainer) return;
        
        if (query.length < 2) {
            resultsContainer.innerHTML = '';
            return;
        }

        try {
            const response = await window.api.getUsers({ search: query });
            if (response.success) {
                this.renderSearchResults(response.data || []);
            }
        } catch (error) {
            console.error('Failed to search users:', error);
            resultsContainer.innerHTML = '<div class="error-message">Search failed</div>';
        }
    },

    renderSearchResults(users) {
        const container = document.getElementById('search-results');
        if (!container) return;

        // Filter out current user and existing friends
        const currentUserID = window.auth.getCurrentUser().id;
        const friendIDs = this.friends.map(f => f.userID);
        const pendingIDs = this.pendingRequests.map(r => r.userID);
        
        const filteredUsers = users.filter(user => 
            user.id !== currentUserID && 
            !friendIDs.includes(user.id) && 
            !pendingIDs.includes(user.id)
        );

        if (filteredUsers.length === 0) {
            container.innerHTML = '<div class="no-results">No users found</div>';
            return;
        }

        container.innerHTML = filteredUsers.map(user => `
            <div class="search-result-item">
                <img src="${user.avatarURL || '/static/images/default-avatar.png'}" 
                     alt="${window.utils.escapeHtml(user.nickname)}'s avatar" 
                     class="search-avatar">
                <div class="search-info">
                    <h4 class="search-name">${window.utils.escapeHtml(user.nickname)}</h4>
                    <p class="search-full-name">${window.utils.escapeHtml(user.firstName)} ${window.utils.escapeHtml(user.lastName)}</p>
                </div>
                <div class="search-actions">
                    <button class="btn btn-primary btn-sm add-friend-btn" data-user-id="${user.id}">
                        Add Friend
                    </button>
                </div>
            </div>
        `).join('');

        this.bindSearchActions();
    },

    bindSearchActions() {
        const addFriendButtons = document.querySelectorAll('.add-friend-btn');
        addFriendButtons.forEach(btn => {
            btn.addEventListener('click', this.handleAddFriend.bind(this));
        });
    },

    async handleAddFriend(event) {
        const userID = event.target.dataset.userId;
        const button = event.target;
        
        try {
            window.utils.setLoading(button, true, 'Sending...');
            
            await window.api.sendFriendRequest(userID);
            
            if (window.forumApp.notificationComponent) {
                window.forumApp.notificationComponent.success('Friend request sent');
            }
            
            // Remove from search results
            button.closest('.search-result-item').remove();
            
        } catch (error) {
            console.error('Failed to send friend request:', error);
            if (window.forumApp.notificationComponent) {
                window.forumApp.notificationComponent.error('Failed to send friend request');
            }
        } finally {
            window.utils.setLoading(button, false);
        }
    }
};
