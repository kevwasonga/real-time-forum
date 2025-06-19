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
                            <p>Discover and connect with other users</p>
                        </div>

                        <div class="find-friends-container">
                            <!-- Search Section -->
                            <div class="search-section">
                                <div class="search-input-wrapper">
                                    <input type="text" id="friend-search" placeholder="Search by name or nickname..." class="search-input">
                                    <div class="search-icon">🔍</div>
                                </div>
                                <div id="search-suggestions" class="search-suggestions"></div>
                                <div id="search-results" class="search-results"></div>
                            </div>

                            <!-- Browse Users Section -->
                            <div class="browse-section">
                                <div class="browse-header">
                                    <h3>Browse Users</h3>
                                    <div class="browse-filters">
                                        <select id="sort-users">
                                            <option value="newest">Newest Members</option>
                                            <option value="active">Most Active</option>
                                            <option value="alphabetical">Alphabetical</option>
                                        </select>
                                        <button id="load-more-users" class="btn btn-outline btn-sm">Load More</button>
                                    </div>
                                </div>
                                <div id="browse-results" class="browse-results">
                                    <div class="loading-placeholder">Loading users...</div>
                                </div>
                            </div>

                            <!-- Suggested Friends Section -->
                            <div class="suggestions-section">
                                <div class="suggestions-header">
                                    <h3>Suggested Friends</h3>
                                    <p>Based on mutual connections and activity</p>
                                </div>
                                <div id="suggested-friends" class="suggested-friends">
                                    <div class="loading-placeholder">Loading suggestions...</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await this.loadFriendsData();
        await this.loadBrowseUsers();
        await this.loadSuggestedFriends();
        this.bindEvents();
    },

    bindEvents() {
        // Tab switching
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', this.switchTab.bind(this));
        });

        // Friend search with suggestions
        const friendSearch = document.getElementById('friend-search');
        if (friendSearch) {
            friendSearch.addEventListener('input', window.utils.debounce(this.handleSearchInput.bind(this), 300));
            friendSearch.addEventListener('focus', this.showSearchSuggestions.bind(this));
            friendSearch.addEventListener('blur', () => {
                // Delay hiding suggestions to allow clicking
                setTimeout(() => this.hideSearchSuggestions(), 200);
            });
        }

        // Sort users dropdown
        const sortUsers = document.getElementById('sort-users');
        if (sortUsers) {
            sortUsers.addEventListener('change', this.handleSortChange.bind(this));
        }

        // Load more users button
        const loadMoreBtn = document.getElementById('load-more-users');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', this.loadMoreUsers.bind(this));
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

    async handleSearchInput(event) {
        const query = event.target.value.trim();
        const resultsContainer = document.getElementById('search-results');
        const suggestionsContainer = document.getElementById('search-suggestions');

        if (!resultsContainer) return;

        if (query.length === 0) {
            resultsContainer.innerHTML = '';
            suggestionsContainer.innerHTML = '';
            return;
        }

        if (query.length < 2) {
            this.showSearchSuggestions();
            return;
        }

        try {
            const response = await window.api.getUsers({ search: query });
            if (response.success) {
                this.renderSearchResults(response.data || []);
                suggestionsContainer.innerHTML = '';
            }
        } catch (error) {
            console.error('Failed to search users:', error);
            resultsContainer.innerHTML = '<div class="error-message">Search failed</div>';
        }
    },

    async showSearchSuggestions() {
        const suggestionsContainer = document.getElementById('search-suggestions');
        const searchInput = document.getElementById('friend-search');

        if (!suggestionsContainer || !searchInput) return;

        const query = searchInput.value.trim();
        if (query.length >= 2) return; // Don't show suggestions if already searching

        try {
            // Get recent users or popular users as suggestions
            const response = await window.api.getUsers({ limit: 8, sort: 'recent' });
            if (response.success && response.data.length > 0) {
                this.renderSearchSuggestions(response.data);
            }
        } catch (error) {
            console.error('Failed to load search suggestions:', error);
        }
    },

    hideSearchSuggestions() {
        const suggestionsContainer = document.getElementById('search-suggestions');
        if (suggestionsContainer) {
            suggestionsContainer.innerHTML = '';
        }
    },

    renderSearchSuggestions(users) {
        const container = document.getElementById('search-suggestions');
        if (!container) return;

        // Filter out current user and existing friends
        const currentUserID = window.auth.getCurrentUser().id;
        const friendIDs = this.friends.map(f => f.userID);
        const pendingIDs = this.pendingRequests.map(r => r.userID);

        const filteredUsers = users.filter(user =>
            user.id !== currentUserID &&
            !friendIDs.includes(user.id) &&
            !pendingIDs.includes(user.id)
        ).slice(0, 5);

        if (filteredUsers.length === 0) return;

        container.innerHTML = `
            <div class="suggestions-header-small">
                <span>Recent users:</span>
            </div>
            ${filteredUsers.map(user => `
                <div class="suggestion-item" data-user-name="${user.nickname}">
                    <img src="${user.avatarURL || '/static/images/default-avatar.png'}"
                         alt="${window.utils.escapeHtml(user.nickname)}'s avatar"
                         class="suggestion-avatar">
                    <span class="suggestion-name">${window.utils.escapeHtml(user.nickname)}</span>
                </div>
            `).join('')}
        `;

        // Bind click events for suggestions
        const suggestionItems = container.querySelectorAll('.suggestion-item');
        suggestionItems.forEach(item => {
            item.addEventListener('click', () => {
                const userName = item.dataset.userName;
                const searchInput = document.getElementById('friend-search');
                if (searchInput) {
                    searchInput.value = userName;
                    this.handleSearchInput({ target: searchInput });
                }
            });
        });
    },

    async loadBrowseUsers() {
        const container = document.getElementById('browse-results');
        if (!container) return;

        try {
            const sortBy = document.getElementById('sort-users')?.value || 'newest';
            const response = await window.api.getUsers({
                limit: 12,
                sort: sortBy,
                offset: 0
            });

            if (response.success) {
                this.renderBrowseUsers(response.data || []);
            }
        } catch (error) {
            console.error('Failed to load browse users:', error);
            container.innerHTML = '<div class="error-message">Failed to load users</div>';
        }
    },

    renderBrowseUsers(users) {
        const container = document.getElementById('browse-results');
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
            container.innerHTML = '<div class="no-users">No new users to discover</div>';
            return;
        }

        container.innerHTML = filteredUsers.map(user => `
            <div class="browse-user-card">
                <img src="${user.avatarURL || '/static/images/default-avatar.png'}"
                     alt="${window.utils.escapeHtml(user.nickname)}'s avatar"
                     class="browse-avatar">
                <div class="browse-info">
                    <h4 class="browse-name">${window.utils.escapeHtml(user.nickname)}</h4>
                    <p class="browse-full-name">${window.utils.escapeHtml(user.firstName)} ${window.utils.escapeHtml(user.lastName)}</p>
                    <span class="browse-joined">Joined ${window.utils.formatDate(user.createdAt)}</span>
                </div>
                <div class="browse-actions">
                    <button class="btn btn-primary btn-sm add-friend-btn" data-user-id="${user.id}">
                        Add Friend
                    </button>
                </div>
            </div>
        `).join('');

        this.bindBrowseActions();
    },

    async loadSuggestedFriends() {
        const container = document.getElementById('suggested-friends');
        if (!container) return;

        try {
            // For now, get random users as suggestions
            // In a real app, this would be based on mutual friends, interests, etc.
            const response = await window.api.getUsers({
                limit: 6,
                sort: 'random'
            });

            if (response.success) {
                this.renderSuggestedFriends(response.data || []);
            }
        } catch (error) {
            console.error('Failed to load suggested friends:', error);
            container.innerHTML = '<div class="error-message">Failed to load suggestions</div>';
        }
    },

    renderSuggestedFriends(users) {
        const container = document.getElementById('suggested-friends');
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
            container.innerHTML = '<div class="no-suggestions">No suggestions available</div>';
            return;
        }

        container.innerHTML = filteredUsers.map(user => `
            <div class="suggested-friend-card">
                <img src="${user.avatarURL || '/static/images/default-avatar.png'}"
                     alt="${window.utils.escapeHtml(user.nickname)}'s avatar"
                     class="suggested-avatar">
                <div class="suggested-info">
                    <h4 class="suggested-name">${window.utils.escapeHtml(user.nickname)}</h4>
                    <p class="suggested-reason">Suggested for you</p>
                </div>
                <div class="suggested-actions">
                    <button class="btn btn-primary btn-sm add-friend-btn" data-user-id="${user.id}">
                        Add
                    </button>
                    <button class="btn btn-outline btn-sm dismiss-btn" data-user-id="${user.id}">
                        Dismiss
                    </button>
                </div>
            </div>
        `).join('');

        this.bindSuggestedActions();
    },

    async handleSortChange(event) {
        await this.loadBrowseUsers();
    },

    async loadMoreUsers() {
        const container = document.getElementById('browse-results');
        const currentUsers = container.querySelectorAll('.browse-user-card').length;

        try {
            const sortBy = document.getElementById('sort-users')?.value || 'newest';
            const response = await window.api.getUsers({
                limit: 12,
                sort: sortBy,
                offset: currentUsers
            });

            if (response.success && response.data.length > 0) {
                const newUsersHtml = this.renderBrowseUsersHtml(response.data);
                container.insertAdjacentHTML('beforeend', newUsersHtml);
                this.bindBrowseActions();
            } else {
                const loadMoreBtn = document.getElementById('load-more-users');
                if (loadMoreBtn) {
                    loadMoreBtn.textContent = 'No more users';
                    loadMoreBtn.disabled = true;
                }
            }
        } catch (error) {
            console.error('Failed to load more users:', error);
        }
    },

    bindBrowseActions() {
        const addFriendButtons = document.querySelectorAll('.browse-user-card .add-friend-btn');
        addFriendButtons.forEach(btn => {
            btn.addEventListener('click', this.handleAddFriend.bind(this));
        });
    },

    bindSuggestedActions() {
        const addFriendButtons = document.querySelectorAll('.suggested-friend-card .add-friend-btn');
        addFriendButtons.forEach(btn => {
            btn.addEventListener('click', this.handleAddFriend.bind(this));
        });

        const dismissButtons = document.querySelectorAll('.dismiss-btn');
        dismissButtons.forEach(btn => {
            btn.addEventListener('click', this.handleDismissSuggestion.bind(this));
        });
    },

    handleDismissSuggestion(event) {
        const button = event.target;
        const card = button.closest('.suggested-friend-card');
        if (card) {
            card.style.opacity = '0';
            card.style.transform = 'translateX(100px)';
            setTimeout(() => {
                card.remove();
            }, 300);
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

        if (!userID) {
            console.error('No user ID found on button');
            if (window.forumApp.notificationComponent) {
                window.forumApp.notificationComponent.error('Invalid user selection');
            }
            return;
        }

        try {
            window.utils.setLoading(button, true, 'Sending...');

            const response = await window.api.sendFriendRequest(userID);

            if (response.success) {
                if (window.forumApp.notificationComponent) {
                    window.forumApp.notificationComponent.success('Friend request sent successfully');
                }

                // Update button state
                button.textContent = 'Request Sent';
                button.disabled = true;
                button.classList.remove('btn-primary');
                button.classList.add('btn-outline');

                // Optionally remove the user card after a delay
                setTimeout(() => {
                    const userCard = button.closest('.search-result-item, .browse-user-card, .suggested-friend-card');
                    if (userCard) {
                        userCard.style.opacity = '0';
                        userCard.style.transform = 'translateX(100px)';
                        setTimeout(() => {
                            userCard.remove();
                        }, 300);
                    }
                }, 1000);
            }

        } catch (error) {
            console.error('Failed to send friend request:', error);
            if (window.forumApp.notificationComponent) {
                window.forumApp.notificationComponent.error(error.message || 'Failed to send friend request');
            }
        } finally {
            window.utils.setLoading(button, false);
        }
    }
};
