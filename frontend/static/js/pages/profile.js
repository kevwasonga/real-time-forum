// Profile Page Component
window.ProfilePage = {
    currentUser: null,
    profileStats: null,
    recentActivity: [],

    async render() {
        console.log('Profile page render called');
        window.forumApp.setCurrentPage('profile');

        // Require authentication
        if (!window.auth.requireAuth()) {
            console.log('Authentication required, redirecting');
            return;
        }

        this.currentUser = window.auth.getCurrentUser();
        console.log('Current user:', this.currentUser);

        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="profile-container">
                <!-- Profile Hero Section -->
                <div class="profile-hero">
                    <div class="profile-cover">
                        <div class="cover-overlay"></div>
                        <button class="change-cover-btn" title="Change Cover Photo">
                            <i class="icon-camera">📷</i>
                        </button>
                    </div>

                    <div class="profile-hero-content">
                        <div class="profile-avatar-wrapper">
                            <img id="profile-avatar"
                                 src="${this.currentUser.avatarUrl || '/static/images/default-avatar.svg'}"
                                 alt="Profile Avatar"
                                 class="profile-avatar">
                            <button class="change-avatar-btn" title="Change Avatar">
                                <i class="icon-camera">📷</i>
                            </button>
                            <div class="online-indicator ${this.currentUser.isOnline ? 'online' : 'offline'}"></div>
                        </div>

                        <div class="profile-hero-info">
                            <h1 class="profile-name">${window.utils.escapeHtml(this.currentUser.nickname)}</h1>
                            <p class="profile-title">${window.utils.escapeHtml(this.currentUser.firstName)} ${window.utils.escapeHtml(this.currentUser.lastName)}</p>
                            <p class="profile-email">
                                <i class="icon-email">📧</i>
                                ${window.utils.escapeHtml(this.currentUser.email)}
                            </p>
                            <p class="profile-joined">
                                <i class="icon-calendar">📅</i>
                                Member since ${window.utils.formatDate(this.currentUser.createdAt)}
                            </p>

                            <div class="profile-quick-stats">
                                <div class="quick-stat" id="posts-count">
                                    <span class="stat-number">0</span>
                                    <span class="stat-label">Posts</span>
                                </div>
                                <div class="quick-stat" id="comments-count">
                                    <span class="stat-number">0</span>
                                    <span class="stat-label">Comments</span>
                                </div>
                                <div class="quick-stat" id="likes-count">
                                    <span class="stat-number">0</span>
                                    <span class="stat-label">Likes</span>
                                </div>
                                <div class="quick-stat" id="friends-count">
                                    <span class="stat-number">0</span>
                                    <span class="stat-label">Friends</span>
                                </div>
                            </div>
                        </div>

                        <div class="profile-actions">
                            <button class="btn btn-primary edit-profile-btn">
                                <i class="icon-edit">✏️</i>
                                Edit Profile
                            </button>
                            <button class="btn btn-outline settings-btn">
                                <i class="icon-settings">⚙️</i>
                                Settings
                            </button>

                        </div>
                    </div>
                </div>

                <!-- Profile Navigation Tabs -->
                <div class="profile-tabs">
                    <button class="tab-btn active" data-tab="overview">
                        <i class="icon-overview">📊</i>
                        Overview
                    </button>
                    <button class="tab-btn" data-tab="activity">
                        <i class="icon-activity">📈</i>
                        Activity
                    </button>
                    <button class="tab-btn" data-tab="posts">
                        <i class="icon-posts">📝</i>
                        My Posts
                    </button>
                    <button class="tab-btn" data-tab="achievements">
                        <i class="icon-achievements">🏆</i>
                        Achievements
                    </button>
                    <button class="tab-btn" data-tab="settings">
                        <i class="icon-settings">⚙️</i>
                        Settings
                    </button>
                </div>

                <!-- Tab Content -->
                <div class="profile-tab-content">
                    <!-- Overview Tab -->
                    <div id="overview-tab" class="tab-content active">
                        <div class="overview-grid">
                            <div class="overview-card stats-card">
                                <h3>
                                    <i class="icon-stats">📊</i>
                                    Statistics
                                </h3>
                                <div id="detailed-stats" class="detailed-stats">
                                    <div class="loading-placeholder">Loading statistics...</div>
                                </div>
                            </div>

                            <div class="overview-card achievements-preview">
                                <h3>
                                    <i class="icon-trophy">🏆</i>
                                    Recent Achievements
                                </h3>
                                <div id="achievements-preview" class="achievements-list">
                                    <div class="loading-placeholder">Loading achievements...</div>
                                </div>
                            </div>

                            <div class="overview-card activity-preview">
                                <h3>
                                    <i class="icon-activity">📈</i>
                                    Recent Activity
                                </h3>
                                <div id="activity-preview" class="activity-timeline">
                                    <div class="loading-placeholder">Loading activity...</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Activity Tab -->
                    <div id="activity-tab" class="tab-content">
                        <div class="activity-container">
                            <div class="activity-filters">
                                <button class="filter-btn active" data-filter="all">All Activity</button>
                                <button class="filter-btn" data-filter="posts">Posts</button>
                                <button class="filter-btn" data-filter="comments">Comments</button>
                                <button class="filter-btn" data-filter="likes">Likes</button>
                            </div>
                            <div id="activity-timeline" class="activity-timeline-full">
                                <div class="loading-placeholder">Loading activity...</div>
                            </div>
                        </div>
                    </div>

                    <!-- Posts Tab -->
                    <div id="posts-tab" class="tab-content">
                        <div class="posts-container">
                            <div class="posts-header">
                                <h3>My Posts</h3>
                                <div class="posts-filters">
                                    <select id="posts-sort">
                                        <option value="newest">Newest First</option>
                                        <option value="oldest">Oldest First</option>
                                        <option value="popular">Most Popular</option>
                                    </select>
                                </div>
                            </div>
                            <div id="user-posts" class="user-posts-grid">
                                <div class="loading-placeholder">Loading posts...</div>
                            </div>
                        </div>
                    </div>

                    <!-- Achievements Tab -->
                    <div id="achievements-tab" class="tab-content">
                        <div class="achievements-container">
                            <div class="achievements-header">
                                <h3>Achievements & Badges</h3>
                                <p>Unlock achievements by being active in the community</p>
                            </div>
                            <div id="achievements-grid" class="achievements-grid">
                                <div class="loading-placeholder">Loading achievements...</div>
                            </div>
                        </div>
                    </div>

                    <!-- Settings Tab -->
                    <div id="settings-tab" class="tab-content">
                        <div class="settings-container">
                            <form id="profile-form" class="profile-form">
                                <div class="form-section">
                                    <h3>
                                        <i class="icon-user">👤</i>
                                        Personal Information
                                    </h3>

                                    <div class="form-row">
                                        <div class="form-group">
                                            <label for="firstName">First Name</label>
                                            <input
                                                type="text"
                                                id="firstName"
                                                name="firstName"
                                                required
                                                value="${window.utils.escapeHtml(this.currentUser.firstName)}"
                                            >
                                        </div>
                                        <div class="form-group">
                                            <label for="lastName">Last Name</label>
                                            <input
                                                type="text"
                                                id="lastName"
                                                name="lastName"
                                                required
                                                value="${window.utils.escapeHtml(this.currentUser.lastName)}"
                                            >
                                        </div>
                                    </div>

                                    <div class="form-row">
                                        <div class="form-group">
                                            <label for="age">Age</label>
                                            <input
                                                type="number"
                                                id="age"
                                                name="age"
                                                required
                                                min="13"
                                                max="120"
                                                value="${this.currentUser.age}"
                                            >
                                        </div>
                                        <div class="form-group">
                                            <label for="gender">Gender</label>
                                            <select id="gender" name="gender" required>
                                                <option value="male" ${this.currentUser.gender === 'male' ? 'selected' : ''}>Male</option>
                                                <option value="female" ${this.currentUser.gender === 'female' ? 'selected' : ''}>Female</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div class="form-group">
                                        <label for="bio">Bio</label>
                                        <textarea
                                            id="bio"
                                            name="bio"
                                            rows="4"
                                            placeholder="Tell us about yourself..."
                                            maxlength="500"
                                        >${this.currentUser.bio || ''}</textarea>
                                        <small class="form-help">Maximum 500 characters</small>
                                    </div>
                                </div>

                                <div class="form-section">
                                    <h3>
                                        <i class="icon-account">🔐</i>
                                        Account Information
                                    </h3>

                                    <div class="form-group">
                                        <label for="email">Email</label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            value="${window.utils.escapeHtml(this.currentUser.email)}"
                                            disabled
                                        >
                                        <small class="form-help">Email cannot be changed</small>
                                    </div>

                                    <div class="form-group">
                                        <label for="nickname">Nickname</label>
                                        <input
                                            type="text"
                                            id="nickname"
                                            name="nickname"
                                            value="${window.utils.escapeHtml(this.currentUser.nickname)}"
                                            disabled
                                        >
                                        <small class="form-help">Nickname cannot be changed</small>
                                    </div>
                                </div>

                                <div class="form-section">
                                    <h3>
                                        <i class="icon-privacy">🔒</i>
                                        Privacy Settings
                                    </h3>

                                    <div class="form-group checkbox-group">
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="showEmail" name="showEmail" ${this.currentUser.showEmail ? 'checked' : ''}>
                                            <span class="checkbox-custom"></span>
                                            Show email to other users
                                        </label>
                                    </div>

                                    <div class="form-group checkbox-group">
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="allowMessages" name="allowMessages" ${this.currentUser.allowMessages !== false ? 'checked' : ''}>
                                            <span class="checkbox-custom"></span>
                                            Allow private messages from other users
                                        </label>
                                    </div>

                                    <div class="form-group checkbox-group">
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="showOnlineStatus" name="showOnlineStatus" ${this.currentUser.showOnlineStatus !== false ? 'checked' : ''}>
                                            <span class="checkbox-custom"></span>
                                            Show online status to other users
                                        </label>
                                    </div>
                                </div>

                                <div class="form-actions">
                                    <button type="submit" class="btn btn-primary">
                                        <i class="icon-save">💾</i>
                                        Update Profile
                                    </button>
                                    <button type="button" id="change-password-btn" class="btn btn-outline">
                                        <i class="icon-lock">🔒</i>
                                        Change Password
                                    </button>
                                    <button type="button" id="delete-account-btn" class="btn btn-danger">
                                        <i class="icon-delete">🗑️</i>
                                        Delete Account
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;

        console.log('About to bind events');
        this.bindEvents();
        console.log('Events bound, loading profile data');
        await this.loadProfileData();
    },

    handleTabSwitch(event) {
        const clickedTab = event.target.closest('.tab-btn');
        const tabName = clickedTab.dataset.tab;
        this.switchToTab(tabName);
    },

    switchToTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Load tab-specific data
        this.loadTabData(tabName);
    },

    async loadTabData(tabName) {
        switch (tabName) {
            case 'overview':
                await this.loadOverviewData();
                break;
            case 'activity':
                await this.loadActivityData();
                break;
            case 'posts':
                await this.loadUserPosts();
                break;
            case 'achievements':
                await this.loadAchievements();
                break;
            case 'settings':
                // Settings tab is already loaded
                break;
        }
    },

    async loadProfileData() {
        // Load all initial data
        await Promise.all([
            this.loadProfileStats(),
            this.loadOverviewData()
        ]);
    },

    async loadOverviewData() {
        await Promise.all([
            this.loadDetailedStats(),
            this.loadRecentAchievements(),
            this.loadRecentActivity()
        ]);
    },

    async loadDetailedStats() {
        const container = document.getElementById('detailed-stats');
        if (!container) return;

        try {
            // For now, we'll use mock data. In a real app, this would be an API call
            const stats = {
                postsCount: 12,
                commentsCount: 45,
                likesReceived: 89,
                friendsCount: 23,
                joinDate: this.currentUser.createdAt,
                lastActive: new Date().toISOString()
            };

            container.innerHTML = `
                <div class="stat-row">
                    <div class="stat-item">
                        <span class="stat-icon">📝</span>
                        <div class="stat-info">
                            <span class="stat-value">${stats.postsCount}</span>
                            <span class="stat-label">Posts Created</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <span class="stat-icon">💬</span>
                        <div class="stat-info">
                            <span class="stat-value">${stats.commentsCount}</span>
                            <span class="stat-label">Comments Made</span>
                        </div>
                    </div>
                </div>
                <div class="stat-row">
                    <div class="stat-item">
                        <span class="stat-icon">👍</span>
                        <div class="stat-info">
                            <span class="stat-value">${stats.likesReceived}</span>
                            <span class="stat-label">Likes Received</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <span class="stat-icon">👥</span>
                        <div class="stat-info">
                            <span class="stat-value">${stats.friendsCount}</span>
                            <span class="stat-label">Friends</span>
                        </div>
                    </div>
                </div>
                <div class="stat-row">
                    <div class="stat-item">
                        <span class="stat-icon">📅</span>
                        <div class="stat-info">
                            <span class="stat-value">${window.utils.formatDate(stats.joinDate)}</span>
                            <span class="stat-label">Member Since</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <span class="stat-icon">🕒</span>
                        <div class="stat-info">
                            <span class="stat-value">${window.utils.formatDate(stats.lastActive)}</span>
                            <span class="stat-label">Last Active</span>
                        </div>
                    </div>
                </div>
            `;

            // Update quick stats in hero section
            document.querySelector('#posts-count .stat-number').textContent = stats.postsCount;
            document.querySelector('#comments-count .stat-number').textContent = stats.commentsCount;
            document.querySelector('#likes-count .stat-number').textContent = stats.likesReceived;
            document.querySelector('#friends-count .stat-number').textContent = stats.friendsCount;

        } catch (error) {
            console.error('Failed to load detailed stats:', error);
            container.innerHTML = '<div class="error-message">Failed to load statistics</div>';
        }
    },

    async loadRecentAchievements() {
        const container = document.getElementById('achievements-preview');
        if (!container) return;

        try {
            // Mock achievements data
            const achievements = [
                { id: 1, name: 'First Post', description: 'Created your first post', icon: '🎉', earned: true },
                { id: 2, name: 'Social Butterfly', description: 'Made 10 friends', icon: '🦋', earned: true },
                { id: 3, name: 'Conversation Starter', description: 'Received 50 likes', icon: '💬', earned: false }
            ];

            container.innerHTML = achievements.map(achievement => `
                <div class="achievement-item ${achievement.earned ? 'earned' : 'locked'}">
                    <span class="achievement-icon">${achievement.icon}</span>
                    <div class="achievement-info">
                        <h4 class="achievement-name">${achievement.name}</h4>
                        <p class="achievement-desc">${achievement.description}</p>
                    </div>
                    ${achievement.earned ? '<span class="achievement-badge">✓</span>' : '<span class="achievement-lock">🔒</span>'}
                </div>
            `).join('');

        } catch (error) {
            console.error('Failed to load achievements:', error);
            container.innerHTML = '<div class="error-message">Failed to load achievements</div>';
        }
    },

    async loadRecentActivity() {
        const container = document.getElementById('activity-preview');
        if (!container) return;

        try {
            // Mock activity data
            const activities = [
                { type: 'post', action: 'Created a new post', title: 'My thoughts on technology', time: new Date(Date.now() - 2 * 60 * 60 * 1000) },
                { type: 'comment', action: 'Commented on', title: 'Discussion about AI', time: new Date(Date.now() - 5 * 60 * 60 * 1000) },
                { type: 'like', action: 'Liked a post', title: 'Best programming practices', time: new Date(Date.now() - 8 * 60 * 60 * 1000) }
            ];

            container.innerHTML = activities.map(activity => `
                <div class="activity-item">
                    <div class="activity-icon ${activity.type}">
                        ${activity.type === 'post' ? '📝' : activity.type === 'comment' ? '💬' : '👍'}
                    </div>
                    <div class="activity-content">
                        <p class="activity-text">
                            ${activity.action} <strong>${activity.title}</strong>
                        </p>
                        <span class="activity-time">${window.utils.formatDate(activity.time)}</span>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Failed to load recent activity:', error);
            container.innerHTML = '<div class="error-message">Failed to load activity</div>';
        }
    },

    bindEvents() {
        console.log('bindEvents called');
        // Tab switching
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', this.handleTabSwitch.bind(this));
        });

        // Profile form
        const profileForm = document.getElementById('profile-form');
        if (profileForm) {
            profileForm.addEventListener('submit', this.handleProfileUpdate.bind(this));
        }

        // Change password button
        const changePasswordBtn = document.getElementById('change-password-btn');
        if (changePasswordBtn) {
            changePasswordBtn.addEventListener('click', this.showChangePasswordModal.bind(this));
        }

        // Delete account button
        const deleteAccountBtn = document.getElementById('delete-account-btn');
        if (deleteAccountBtn) {
            deleteAccountBtn.addEventListener('click', this.showDeleteAccountModal.bind(this));
        }

        // Edit profile button
        const editProfileBtn = document.querySelector('.edit-profile-btn');
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', () => {
                this.switchToTab('settings');
            });
        }

        // Activity filters
        const activityFilters = document.querySelectorAll('.filter-btn');
        activityFilters.forEach(btn => {
            btn.addEventListener('click', this.handleActivityFilter.bind(this));
        });

        // Posts sort
        const postsSort = document.getElementById('posts-sort');
        if (postsSort) {
            postsSort.addEventListener('change', this.handlePostsSort.bind(this));
        }

        // Bio character counter
        const bioTextarea = document.getElementById('bio');
        if (bioTextarea) {
            bioTextarea.addEventListener('input', this.updateBioCounter.bind(this));
            this.updateBioCounter({ target: bioTextarea });
        }

        // Avatar change button
        const changeAvatarBtn = document.querySelector('.change-avatar-btn');
        console.log('Looking for change avatar button:', changeAvatarBtn);
        if (changeAvatarBtn) {
            console.log('Found change avatar button, adding event listener');
            changeAvatarBtn.addEventListener('click', (e) => {
                console.log('Avatar button clicked!', e);
                e.preventDefault();
                e.stopPropagation();
                this.showAvatarUploadModal();
            });
        } else {
            console.log('Change avatar button not found!');
        }

        // Cover photo change button
        const changeCoverBtn = document.querySelector('.change-cover-btn');
        if (changeCoverBtn) {
            changeCoverBtn.addEventListener('click', this.showCoverUploadModal.bind(this));
        }

        // Test avatar button
        const testAvatarBtn = document.getElementById('test-avatar-btn');
        console.log('Looking for test avatar button:', testAvatarBtn);
        if (testAvatarBtn) {
            console.log('Found test avatar button, adding event listener');
            testAvatarBtn.addEventListener('click', (e) => {
                console.log('Test avatar button clicked!');
                e.preventDefault();
                this.showAvatarUploadModal();
            });
        }
    },

    async loadActivityData(filter = 'all') {
        const container = document.getElementById('activity-timeline');
        if (!container) return;

        try {
            container.innerHTML = '<div class="loading-placeholder">Loading activity...</div>';

            // Mock activity data - in a real app, this would be an API call
            const allActivities = [
                { type: 'post', action: 'Created a new post', title: 'My thoughts on technology', time: new Date(Date.now() - 2 * 60 * 60 * 1000), id: 1 },
                { type: 'comment', action: 'Commented on', title: 'Discussion about AI', time: new Date(Date.now() - 5 * 60 * 60 * 1000), id: 2 },
                { type: 'like', action: 'Liked a post', title: 'Best programming practices', time: new Date(Date.now() - 8 * 60 * 60 * 1000), id: 3 },
                { type: 'post', action: 'Created a new post', title: 'Learning JavaScript', time: new Date(Date.now() - 24 * 60 * 60 * 1000), id: 4 },
                { type: 'comment', action: 'Commented on', title: 'React vs Vue', time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), id: 5 }
            ];

            const filteredActivities = filter === 'all' ? allActivities : allActivities.filter(a => a.type === filter);

            if (filteredActivities.length === 0) {
                container.innerHTML = '<div class="no-activity">No activity found for this filter</div>';
                return;
            }

            container.innerHTML = filteredActivities.map(activity => `
                <div class="activity-item-full">
                    <div class="activity-timeline-dot ${activity.type}"></div>
                    <div class="activity-card">
                        <div class="activity-header">
                            <div class="activity-icon ${activity.type}">
                                ${activity.type === 'post' ? '📝' : activity.type === 'comment' ? '💬' : '👍'}
                            </div>
                            <div class="activity-meta">
                                <p class="activity-text">
                                    ${activity.action} <strong>${activity.title}</strong>
                                </p>
                                <span class="activity-time">${window.utils.formatDate(activity.time)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Failed to load activity data:', error);
            container.innerHTML = '<div class="error-message">Failed to load activity</div>';
        }
    },

    async loadUserPosts(sort = 'newest') {
        const container = document.getElementById('user-posts');
        if (!container) return;

        try {
            container.innerHTML = '<div class="loading-placeholder">Loading posts...</div>';

            // In a real app, this would be an API call to get user's posts
            const response = await window.api.getPosts({ userId: this.currentUser.id, sort });

            if (response.success && response.data.length > 0) {
                container.innerHTML = response.data.map(post => `
                    <div class="user-post-card">
                        <div class="post-header">
                            <h4><a href="/post/${post.id}" data-route="/post/${post.id}">${window.utils.escapeHtml(post.title)}</a></h4>
                            <span class="post-date">${window.utils.formatDate(post.createdAt)}</span>
                        </div>
                        <div class="post-excerpt">
                            ${window.utils.escapeHtml(post.content.substring(0, 150))}${post.content.length > 150 ? '...' : ''}
                        </div>
                        <div class="post-categories">
                            ${post.categories.map(cat => `<span class="category-tag">${window.utils.escapeHtml(cat)}</span>`).join('')}
                        </div>
                        <div class="post-stats">
                            <span class="stat">👍 ${post.likeCount}</span>
                            <span class="stat">💬 ${post.commentCount}</span>
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<div class="no-posts">You haven\'t created any posts yet. <a href="/create-post" data-route="/create-post">Create your first post!</a></div>';
            }

        } catch (error) {
            console.error('Failed to load user posts:', error);
            container.innerHTML = '<div class="error-message">Failed to load posts</div>';
        }
    },

    async loadAchievements() {
        const container = document.getElementById('achievements-grid');
        if (!container) return;

        try {
            container.innerHTML = '<div class="loading-placeholder">Loading achievements...</div>';

            // Mock achievements data
            const achievements = [
                { id: 1, name: 'First Post', description: 'Created your first post', icon: '🎉', earned: true, earnedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                { id: 2, name: 'Social Butterfly', description: 'Made 10 friends', icon: '🦋', earned: true, earnedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
                { id: 3, name: 'Conversation Starter', description: 'Received 50 likes', icon: '💬', earned: false },
                { id: 4, name: 'Prolific Writer', description: 'Created 25 posts', icon: '✍️', earned: false },
                { id: 5, name: 'Community Helper', description: 'Made 100 helpful comments', icon: '🤝', earned: false },
                { id: 6, name: 'Popular Creator', description: 'Received 200 likes', icon: '⭐', earned: false }
            ];

            container.innerHTML = achievements.map(achievement => `
                <div class="achievement-card ${achievement.earned ? 'earned' : 'locked'}">
                    <div class="achievement-icon-large">${achievement.icon}</div>
                    <h4 class="achievement-name">${achievement.name}</h4>
                    <p class="achievement-description">${achievement.description}</p>
                    <div class="achievement-status">
                        ${achievement.earned
                            ? `<span class="earned-badge">✓ Earned ${window.utils.formatDate(achievement.earnedDate)}</span>`
                            : '<span class="locked-badge">🔒 Not earned yet</span>'
                        }
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Failed to load achievements:', error);
            container.innerHTML = '<div class="error-message">Failed to load achievements</div>';
        }
    },

    handleActivityFilter(event) {
        const filterBtn = event.target;
        const filter = filterBtn.dataset.filter;

        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        filterBtn.classList.add('active');

        // Load filtered activity
        this.loadActivityData(filter);
    },

    handlePostsSort(event) {
        const sort = event.target.value;
        this.loadUserPosts(sort);
    },

    updateBioCounter(event) {
        const textarea = event.target;
        const maxLength = textarea.maxLength;
        const currentLength = textarea.value.length;

        let counter = textarea.parentNode.querySelector('.bio-counter');
        if (!counter) {
            counter = document.createElement('small');
            counter.className = 'bio-counter form-help';
            textarea.parentNode.appendChild(counter);
        }

        counter.textContent = `${currentLength}/${maxLength} characters`;
        counter.style.color = currentLength > maxLength * 0.9 ? 'var(--warning-color)' : 'var(--text-muted)';
    },

    async handleProfileUpdate(event) {
        event.preventDefault();

        const form = event.target;
        const formData = new FormData(form);

        const profileData = {
            firstName: formData.get('firstName').trim(),
            lastName: formData.get('lastName').trim(),
            age: parseInt(formData.get('age')),
            gender: formData.get('gender'),
            bio: formData.get('bio').trim(),
            showEmail: formData.get('showEmail') === 'on',
            allowMessages: formData.get('allowMessages') === 'on',
            showOnlineStatus: formData.get('showOnlineStatus') === 'on'
        };

        const submitBtn = form.querySelector('button[type="submit"]');

        try {
            window.utils.setLoading(submitBtn, true, 'Updating...');

            const response = await window.api.updateProfile(profileData);

            if (response.success) {
                // Update local user data
                const updatedUser = response.data;
                window.auth.currentUser = updatedUser;
                window.forumApp.currentUser = updatedUser;
                this.currentUser = updatedUser;

                // Update header UI
                if (window.forumApp.headerComponent) {
                    window.forumApp.headerComponent.updateUserInfo(updatedUser);
                }

                if (window.forumApp.notificationComponent) {
                    window.forumApp.notificationComponent.success('Profile updated successfully');
                }

                // Refresh profile display
                await this.loadProfileData();
            }

        } catch (error) {
            console.error('Failed to update profile:', error);
            if (window.forumApp.notificationComponent) {
                window.forumApp.notificationComponent.error(error.message || 'Failed to update profile');
            }
        } finally {
            window.utils.setLoading(submitBtn, false);
        }
    },

    async loadProfileStats() {
        try {
            // This would typically be a separate API endpoint
            // For now, we'll show placeholder stats
            const statsContainer = document.getElementById('profile-stats');
            if (statsContainer) {
                statsContainer.innerHTML = `
                    <div class="stat-item">
                        <div class="stat-value">0</div>
                        <div class="stat-label">Posts Created</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">0</div>
                        <div class="stat-label">Comments Made</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">0</div>
                        <div class="stat-label">Likes Received</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">0</div>
                        <div class="stat-label">Friends</div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Failed to load profile stats:', error);
        }
    },

    showChangePasswordModal() {
        // Create modal for password change
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Change Password</h3>
                    <button class="modal-close">&times;</button>
                </div>
                
                <form id="change-password-form" class="modal-form">
                    <div class="form-group">
                        <label for="current-password">Current Password</label>
                        <input type="password" id="current-password" name="currentPassword" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="new-password">New Password</label>
                        <input type="password" id="new-password" name="newPassword" required minlength="8">
                    </div>
                    
                    <div class="form-group">
                        <label for="confirm-password">Confirm New Password</label>
                        <input type="password" id="confirm-password" name="confirmPassword" required>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="button" class="btn btn-outline modal-cancel">Cancel</button>
                        <button type="submit" class="btn btn-primary">Change Password</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Bind modal events
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('.modal-cancel');
        const form = modal.querySelector('#change-password-form');

        const closeModal = () => {
            document.body.removeChild(modal);
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(form);
            const newPassword = formData.get('newPassword');
            const confirmPassword = formData.get('confirmPassword');
            
            if (newPassword !== confirmPassword) {
                if (window.forumApp.notificationComponent) {
                    window.forumApp.notificationComponent.error('Passwords do not match');
                }
                return;
            }

            // Here you would typically call an API to change the password
            // For now, just show a success message
            if (window.forumApp.notificationComponent) {
                window.forumApp.notificationComponent.info('Password change functionality not implemented yet');
            }
            
            closeModal();
        });

        // Focus first input
        modal.querySelector('#current-password').focus();
    },

    showDeleteAccountModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content danger-modal">
                <div class="modal-header">
                    <h3>⚠️ Delete Account</h3>
                    <button class="modal-close">&times;</button>
                </div>

                <div class="modal-body">
                    <div class="warning-message">
                        <p><strong>This action cannot be undone!</strong></p>
                        <p>Deleting your account will permanently remove:</p>
                        <ul>
                            <li>Your profile and personal information</li>
                            <li>All your posts and comments</li>
                            <li>Your friend connections</li>
                            <li>Your message history</li>
                            <li>All your achievements and activity</li>
                        </ul>
                    </div>

                    <form id="delete-account-form" class="modal-form">
                        <div class="form-group">
                            <label for="delete-password">Enter your password to confirm:</label>
                            <input type="password" id="delete-password" name="password" required>
                        </div>

                        <div class="form-group">
                            <label for="delete-confirmation">Type "DELETE" to confirm:</label>
                            <input type="text" id="delete-confirmation" name="confirmation" required placeholder="DELETE">
                        </div>

                        <div class="modal-actions">
                            <button type="button" class="btn btn-outline modal-cancel">Cancel</button>
                            <button type="submit" class="btn btn-danger">Delete My Account</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Bind modal events
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('.modal-cancel');
        const form = modal.querySelector('#delete-account-form');

        const closeModal = () => {
            document.body.removeChild(modal);
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(form);
            const confirmation = formData.get('confirmation');

            if (confirmation !== 'DELETE') {
                if (window.forumApp.notificationComponent) {
                    window.forumApp.notificationComponent.error('Please type "DELETE" to confirm');
                }
                return;
            }

            // Here you would typically call an API to delete the account
            if (window.forumApp.notificationComponent) {
                window.forumApp.notificationComponent.info('Account deletion functionality not implemented yet');
            }

            closeModal();
        });

        // Focus first input
        modal.querySelector('#delete-password').focus();
    },

    showAvatarUploadModal() {
        console.log('showAvatarUploadModal called!');
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Change Profile Picture</h3>
                    <button class="modal-close">&times;</button>
                </div>

                <div class="modal-body">
                    <div class="avatar-upload-container">
                        <div class="current-avatar">
                            <img id="current-avatar-preview"
                                 src="${this.currentUser.avatarUrl || '/static/images/default-avatar.svg'}"
                                 alt="Current Avatar">
                            <p>Current Avatar</p>
                        </div>

                        <div class="avatar-upload-section">
                            <div class="upload-area" id="avatar-upload-area">
                                <div class="upload-placeholder">
                                    <i class="upload-icon">📷</i>
                                    <p>Click to upload or drag & drop</p>
                                    <small>JPG, PNG, GIF up to 5MB</small>
                                </div>
                                <input type="file" id="avatar-file-input" accept="image/*" style="display: none;">
                            </div>

                            <div class="avatar-preview" id="avatar-preview" style="display: none;">
                                <img id="new-avatar-preview" alt="New Avatar Preview">
                                <div class="preview-actions">
                                    <button type="button" class="btn btn-outline" id="remove-avatar-btn">Remove</button>
                                    <button type="button" class="btn btn-secondary" id="change-avatar-file-btn">Change File</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="avatar-options">
                        <h4>Or choose a default avatar:</h4>
                        <div class="default-avatars">
                            <div class="default-avatar" data-avatar="/static/images/default-avatar.svg">
                                <img src="/static/images/default-avatar.svg" alt="Default Avatar" onerror="this.style.display='none'">
                            </div>
                            <div class="default-avatar" data-avatar="/static/images/1.jpg">
                                <img src="/static/images/1.jpg" alt="Avatar 1" onerror="this.style.display='none'">
                            </div>
                        </div>
                        <p class="avatar-note">More avatar options will be available soon!</p>
                    </div>
                </div>

                <div class="modal-actions">
                    <button type="button" class="btn btn-outline modal-cancel">Cancel</button>
                    <button type="button" class="btn btn-primary" id="save-avatar-btn" disabled>Save Avatar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.bindAvatarModalEvents(modal);
    },

    bindAvatarModalEvents(modal) {
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('.modal-cancel');
        const saveBtn = modal.querySelector('#save-avatar-btn');
        const fileInput = modal.querySelector('#avatar-file-input');
        const uploadArea = modal.querySelector('#avatar-upload-area');
        const avatarPreview = modal.querySelector('#avatar-preview');
        const newAvatarPreview = modal.querySelector('#new-avatar-preview');
        const removeAvatarBtn = modal.querySelector('#remove-avatar-btn');
        const changeFileBtn = modal.querySelector('#change-avatar-file-btn');
        const defaultAvatars = modal.querySelectorAll('.default-avatar');

        let selectedFile = null;
        let selectedDefaultAvatar = null;

        const closeModal = () => {
            document.body.removeChild(modal);
        };

        // Close modal events
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // File upload events
        uploadArea.addEventListener('click', () => fileInput.click());
        changeFileBtn.addEventListener('click', () => fileInput.click());

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFileSelect(files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileSelect(e.target.files[0]);
            }
        });

        const handleFileSelect = (file) => {
            // Validate file
            if (!file.type.startsWith('image/')) {
                if (window.forumApp.notificationComponent) {
                    window.forumApp.notificationComponent.error('Please select an image file');
                }
                return;
            }

            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                if (window.forumApp.notificationComponent) {
                    window.forumApp.notificationComponent.error('File size must be less than 5MB');
                }
                return;
            }

            selectedFile = file;
            selectedDefaultAvatar = null;

            // Show preview
            const reader = new FileReader();
            reader.onload = (e) => {
                newAvatarPreview.src = e.target.result;
                uploadArea.style.display = 'none';
                avatarPreview.style.display = 'block';
                saveBtn.disabled = false;

                // Clear default avatar selection
                defaultAvatars.forEach(avatar => avatar.classList.remove('selected'));
            };
            reader.readAsDataURL(file);
        };

        // Remove avatar
        removeAvatarBtn.addEventListener('click', () => {
            selectedFile = null;
            selectedDefaultAvatar = null;
            uploadArea.style.display = 'block';
            avatarPreview.style.display = 'none';
            saveBtn.disabled = true;
            fileInput.value = '';

            // Clear default avatar selection
            defaultAvatars.forEach(avatar => avatar.classList.remove('selected'));
        });

        // Default avatar selection
        defaultAvatars.forEach(avatar => {
            avatar.addEventListener('click', () => {
                selectedFile = null;
                selectedDefaultAvatar = avatar.dataset.avatar;

                // Update UI
                defaultAvatars.forEach(a => a.classList.remove('selected'));
                avatar.classList.add('selected');

                uploadArea.style.display = 'block';
                avatarPreview.style.display = 'none';
                saveBtn.disabled = false;
                fileInput.value = '';
            });
        });

        // Save avatar
        saveBtn.addEventListener('click', async () => {
            console.log('Save avatar button clicked!');
            console.log('Selected file:', selectedFile);
            console.log('Selected default avatar:', selectedDefaultAvatar);

            try {
                window.utils.setLoading(saveBtn, true, 'Saving...');

                let newAvatarUrl;

                if (selectedFile) {
                    console.log('Processing custom file...');
                    // For now, use a data URL for preview (temporary solution)
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        newAvatarUrl = e.target.result;
                        console.log('File converted to data URL');

                        // Update user data
                        this.currentUser.avatarUrl = newAvatarUrl;
                        if (window.auth.currentUser) {
                            window.auth.currentUser.avatarUrl = newAvatarUrl;
                        }
                        if (window.forumApp.currentUser) {
                            window.forumApp.currentUser.avatarUrl = newAvatarUrl;
                        }

                        // Update UI
                        this.updateAvatarInUI(newAvatarUrl);

                        if (window.forumApp.notificationComponent) {
                            window.forumApp.notificationComponent.success('Avatar updated! (Note: This is temporary until backend is implemented)');
                        } else {
                            alert('Avatar updated successfully!');
                        }

                        window.utils.setLoading(saveBtn, false);
                        closeModal();
                    };
                    reader.readAsDataURL(selectedFile);
                    return;

                } else if (selectedDefaultAvatar) {
                    console.log('Using default avatar:', selectedDefaultAvatar);
                    newAvatarUrl = selectedDefaultAvatar;
                }

                if (newAvatarUrl) {
                    console.log('Updating UI with new avatar URL:', newAvatarUrl);
                    // Update user data
                    this.currentUser.avatarUrl = newAvatarUrl;
                    if (window.auth.currentUser) {
                        window.auth.currentUser.avatarUrl = newAvatarUrl;
                    }
                    if (window.forumApp.currentUser) {
                        window.forumApp.currentUser.avatarUrl = newAvatarUrl;
                    }

                    // Update UI
                    this.updateAvatarInUI(newAvatarUrl);

                    if (window.forumApp.notificationComponent) {
                        window.forumApp.notificationComponent.success('Avatar updated! (Note: This is temporary until backend is implemented)');
                    } else {
                        alert('Avatar updated successfully!');
                    }

                    closeModal();
                }

            } catch (error) {
                console.error('Failed to update avatar:', error);
                if (window.forumApp.notificationComponent) {
                    window.forumApp.notificationComponent.error(error.message || 'Failed to update avatar');
                } else {
                    alert('Failed to update avatar: ' + error.message);
                }
            } finally {
                window.utils.setLoading(saveBtn, false);
            }
        });
    },

    updateAvatarInUI(newAvatarUrl) {
        console.log('Updating avatar in UI with URL:', newAvatarUrl);

        // Update profile page avatar
        const profileAvatar = document.getElementById('profile-avatar');
        if (profileAvatar) {
            console.log('Updating profile avatar');
            profileAvatar.src = newAvatarUrl;
        } else {
            console.log('Profile avatar element not found');
        }

        // Update header avatar
        const headerAvatar = document.getElementById('user-avatar');
        if (headerAvatar) {
            console.log('Updating header avatar');
            headerAvatar.src = newAvatarUrl;
        } else {
            console.log('Header avatar element not found');
        }

        // Update current avatar preview in modal if still open
        const currentAvatarPreview = document.getElementById('current-avatar-preview');
        if (currentAvatarPreview) {
            console.log('Updating current avatar preview');
            currentAvatarPreview.src = newAvatarUrl;
        }

        // Update header component if available
        if (window.forumApp.headerComponent) {
            console.log('Updating header component');
            window.forumApp.headerComponent.updateUserInfo(this.currentUser);
        }
    },

    showCoverUploadModal() {
        // Placeholder for cover photo upload functionality
        if (window.forumApp.notificationComponent) {
            window.forumApp.notificationComponent.info('Cover photo upload functionality coming soon!');
        }
    }
};
