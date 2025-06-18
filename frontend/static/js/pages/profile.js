// Profile Page Component
window.ProfilePage = {
    currentUser: null,
    profileStats: null,
    recentActivity: [],

    async render() {
        window.forumApp.setCurrentPage('profile');

        // Require authentication
        if (!window.auth.requireAuth()) {
            return;
        }

        this.currentUser = window.auth.getCurrentUser();

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
                                 src="${this.currentUser.avatarUrl || '/static/images/default-avatar.png'}"
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

        this.bindEvents();
        await this.loadProfileStats();
    },

    bindEvents() {
        const profileForm = document.getElementById('profile-form');
        if (profileForm) {
            profileForm.addEventListener('submit', this.handleProfileUpdate.bind(this));
        }

        const changePasswordBtn = document.getElementById('change-password-btn');
        if (changePasswordBtn) {
            changePasswordBtn.addEventListener('click', this.showChangePasswordModal.bind(this));
        }
    },

    async handleProfileUpdate(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        
        const profileData = {
            firstName: formData.get('firstName').trim(),
            lastName: formData.get('lastName').trim(),
            age: parseInt(formData.get('age')),
            gender: formData.get('gender')
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
                
                // Update header UI
                if (window.forumApp.headerComponent) {
                    window.forumApp.headerComponent.updateUserInfo(updatedUser);
                }
                
                if (window.forumApp.notificationComponent) {
                    window.forumApp.notificationComponent.success('Profile updated successfully');
                }
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
    }
};
