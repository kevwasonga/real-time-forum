// Profile Page Component
window.ProfilePage = {
    async render() {
        window.forumApp.setCurrentPage('profile');
        
        // Require authentication
        if (!window.auth.requireAuth()) {
            return;
        }

        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="profile-container">
                <div class="profile-header">
                    <h1>My Profile</h1>
                    <p>Manage your account information</p>
                </div>
                
                <div class="profile-content">
                    <div class="profile-card">
                        <div class="profile-avatar-section">
                            <img id="profile-avatar" 
                                 src="${window.auth.getCurrentUser().avatarUrl || '/static/images/default-avatar.png'}" 
                                 alt="Profile Avatar" 
                                 class="profile-avatar">
                            <div class="avatar-info">
                                <h2>${window.utils.escapeHtml(window.auth.getCurrentUser().nickname)}</h2>
                                <p class="profile-email">${window.utils.escapeHtml(window.auth.getCurrentUser().email)}</p>
                                <p class="profile-joined">Joined ${window.utils.formatDate(window.auth.getCurrentUser().createdAt)}</p>
                            </div>
                        </div>
                        
                        <form id="profile-form" class="profile-form">
                            <div class="form-section">
                                <h3>Personal Information</h3>
                                
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="firstName">First Name</label>
                                        <input 
                                            type="text" 
                                            id="firstName" 
                                            name="firstName" 
                                            required 
                                            value="${window.utils.escapeHtml(window.auth.getCurrentUser().firstName)}"
                                        >
                                    </div>
                                    <div class="form-group">
                                        <label for="lastName">Last Name</label>
                                        <input 
                                            type="text" 
                                            id="lastName" 
                                            name="lastName" 
                                            required 
                                            value="${window.utils.escapeHtml(window.auth.getCurrentUser().lastName)}"
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
                                            value="${window.auth.getCurrentUser().age}"
                                        >
                                    </div>
                                    <div class="form-group">
                                        <label for="gender">Gender</label>
                                        <select id="gender" name="gender" required>
                                            <option value="male" ${window.auth.getCurrentUser().gender === 'male' ? 'selected' : ''}>Male</option>
                                            <option value="female" ${window.auth.getCurrentUser().gender === 'female' ? 'selected' : ''}>Female</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="form-section">
                                <h3>Account Information</h3>
                                
                                <div class="form-group">
                                    <label for="email">Email</label>
                                    <input 
                                        type="email" 
                                        id="email" 
                                        name="email" 
                                        value="${window.utils.escapeHtml(window.auth.getCurrentUser().email)}"
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
                                        value="${window.utils.escapeHtml(window.auth.getCurrentUser().nickname)}"
                                        disabled
                                    >
                                    <small class="form-help">Nickname cannot be changed</small>
                                </div>
                            </div>
                            
                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary">
                                    Update Profile
                                </button>
                                <button type="button" id="change-password-btn" class="btn btn-outline">
                                    Change Password
                                </button>
                            </div>
                        </form>
                    </div>
                    
                    <div class="profile-stats">
                        <h3>Activity Statistics</h3>
                        <div id="profile-stats" class="stats-grid">
                            <div class="loading-placeholder">Loading statistics...</div>
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
