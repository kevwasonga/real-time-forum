/**
 * Community Nexus - Enhanced Profile Component
 * Handles user profile management and settings
 */

class NexusProfile {
    constructor() {
        this.currentProfile = null;
        this.isEditing = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        console.log('👤 Profile component initialized');
    }

    setupEventListeners() {
        // Listen for page changes
        nexusCore.on('page:change', (event) => {
            if (event.detail.page === 'profile') {
                this.renderProfilePage();
            } else if (event.detail.page === 'settings') {
                this.renderSettingsPage();
            }
        });
    }

    /**
     * Render profile page
     */
    async renderProfilePage() {
        nexusNavigation.setPageTitle('Profile');
        
        const template = `
            <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pt-20">
                <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <!-- Profile Header -->
                    <div class="nexus-card mb-8">
                        <div class="nexus-card-body">
                            <div class="flex flex-col md:flex-row items-center gap-6">
                                <div class="relative">
                                    <img 
                                        src="/static/img/default-avatar.png" 
                                        alt="${nexusCore.currentUser?.firstName || 'User'}"
                                        class="nexus-avatar nexus-avatar-xl"
                                        id="profile-avatar"
                                    >
                                    <button 
                                        class="absolute bottom-0 right-0 nexus-btn nexus-btn-primary rounded-full p-2"
                                        onclick="nexusProfile.changeAvatar()"
                                        title="Change Avatar"
                                    >
                                        <i class="fas fa-camera"></i>
                                    </button>
                                </div>
                                
                                <div class="flex-1 text-center md:text-left">
                                    <h1 class="nexus-heading-2 mb-2">
                                        ${nexusCore.currentUser?.firstName || ''} ${nexusCore.currentUser?.lastName || ''}
                                    </h1>
                                    <p class="nexus-text-secondary mb-4">
                                        @${nexusCore.currentUser?.username || ''}
                                    </p>
                                    <div class="flex flex-wrap gap-2 justify-center md:justify-start">
                                        <span class="nexus-badge nexus-badge-primary">
                                            ${nexusCore.currentUser?.age || 0} years old
                                        </span>
                                        <span class="nexus-badge nexus-badge-secondary">
                                            ${nexusCore.currentUser?.gender || 'Not specified'}
                                        </span>
                                    </div>
                                </div>
                                
                                <div class="flex gap-3">
                                    <button 
                                        class="nexus-btn nexus-btn-secondary"
                                        onclick="nexusProfile.toggleEditMode()"
                                        id="edit-profile-btn"
                                    >
                                        <i class="fas fa-edit mr-2"></i>
                                        Edit Profile
                                    </button>
                                    <button 
                                        class="nexus-btn nexus-btn-ghost"
                                        onclick="nexusNavigation.navigateTo('settings')"
                                    >
                                        <i class="fas fa-cog mr-2"></i>
                                        Settings
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Profile Content -->
                    <div class="grid md:grid-cols-3 gap-6">
                        <!-- Profile Information -->
                        <div class="md:col-span-2">
                            <div class="nexus-card">
                                <div class="nexus-card-header">
                                    <h2 class="nexus-heading-3">Profile Information</h2>
                                </div>
                                <div class="nexus-card-body" id="profile-info">
                                    ${this.renderProfileInfo()}
                                </div>
                            </div>
                        </div>

                        <!-- Activity Summary -->
                        <div>
                            <div class="nexus-card">
                                <div class="nexus-card-header">
                                    <h3 class="nexus-heading-3">Activity</h3>
                                </div>
                                <div class="nexus-card-body">
                                    <div class="space-y-4">
                                        <div class="flex justify-between items-center">
                                            <span class="nexus-text-secondary">Discussions</span>
                                            <span class="font-semibold">12</span>
                                        </div>
                                        <div class="flex justify-between items-center">
                                            <span class="nexus-text-secondary">Comments</span>
                                            <span class="font-semibold">45</span>
                                        </div>
                                        <div class="flex justify-between items-center">
                                            <span class="nexus-text-secondary">Likes Received</span>
                                            <span class="font-semibold">128</span>
                                        </div>
                                        <div class="flex justify-between items-center">
                                            <span class="nexus-text-secondary">Member Since</span>
                                            <span class="font-semibold">Jan 2024</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Quick Actions -->
                            <div class="nexus-card mt-6">
                                <div class="nexus-card-header">
                                    <h3 class="nexus-heading-3">Quick Actions</h3>
                                </div>
                                <div class="nexus-card-body">
                                    <div class="space-y-3">
                                        <button 
                                            class="w-full nexus-btn nexus-btn-ghost text-left"
                                            onclick="nexusNavigation.navigateTo('discussions')"
                                        >
                                            <i class="fas fa-plus mr-3"></i>
                                            Start Discussion
                                        </button>
                                        <button 
                                            class="w-full nexus-btn nexus-btn-ghost text-left"
                                            onclick="nexusNavigation.navigateTo('messages')"
                                        >
                                            <i class="fas fa-envelope mr-3"></i>
                                            Send Message
                                        </button>
                                        <button 
                                            class="w-full nexus-btn nexus-btn-ghost text-left"
                                            onclick="nexusProfile.exportData()"
                                        >
                                            <i class="fas fa-download mr-3"></i>
                                            Export Data
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.renderToMainContent(template);
    }

    /**
     * Render settings page
     */
    renderSettingsPage() {
        nexusNavigation.setPageTitle('Settings');
        
        const template = `
            <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pt-20">
                <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div class="mb-8">
                        <h1 class="nexus-heading-1 mb-2">Settings</h1>
                        <p class="nexus-text-secondary">Manage your account preferences and privacy settings</p>
                    </div>

                    <!-- Settings Sections -->
                    <div class="space-y-6">
                        <!-- Account Settings -->
                        <div class="nexus-card">
                            <div class="nexus-card-header">
                                <h2 class="nexus-heading-3">Account Settings</h2>
                            </div>
                            <div class="nexus-card-body">
                                <div class="space-y-4">
                                    <div class="flex items-center justify-between">
                                        <div>
                                            <h4 class="font-medium">Email Notifications</h4>
                                            <p class="text-sm nexus-text-secondary">Receive email notifications for new messages and mentions</p>
                                        </div>
                                        <label class="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" class="sr-only peer" checked>
                                            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>
                                    
                                    <div class="flex items-center justify-between">
                                        <div>
                                            <h4 class="font-medium">Two-Factor Authentication</h4>
                                            <p class="text-sm nexus-text-secondary">Add an extra layer of security to your account</p>
                                        </div>
                                        <button class="nexus-btn nexus-btn-secondary">
                                            Enable 2FA
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Privacy Settings -->
                        <div class="nexus-card">
                            <div class="nexus-card-header">
                                <h2 class="nexus-heading-3">Privacy Settings</h2>
                            </div>
                            <div class="nexus-card-body">
                                <div class="space-y-4">
                                    <div class="flex items-center justify-between">
                                        <div>
                                            <h4 class="font-medium">Profile Visibility</h4>
                                            <p class="text-sm nexus-text-secondary">Control who can see your profile information</p>
                                        </div>
                                        <select class="nexus-select w-48">
                                            <option>Everyone</option>
                                            <option>Friends Only</option>
                                            <option>Private</option>
                                        </select>
                                    </div>
                                    
                                    <div class="flex items-center justify-between">
                                        <div>
                                            <h4 class="font-medium">Online Status</h4>
                                            <p class="text-sm nexus-text-secondary">Show when you're online to other users</p>
                                        </div>
                                        <label class="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" class="sr-only peer" checked>
                                            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Danger Zone -->
                        <div class="nexus-card border-red-200">
                            <div class="nexus-card-header bg-red-50">
                                <h2 class="nexus-heading-3 text-red-700">Danger Zone</h2>
                            </div>
                            <div class="nexus-card-body">
                                <div class="space-y-4">
                                    <div class="flex items-center justify-between">
                                        <div>
                                            <h4 class="font-medium text-red-700">Delete Account</h4>
                                            <p class="text-sm text-red-600">Permanently delete your account and all associated data</p>
                                        </div>
                                        <button 
                                            class="nexus-btn bg-red-600 text-white hover:bg-red-700"
                                            onclick="nexusProfile.confirmDeleteAccount()"
                                        >
                                            Delete Account
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.renderToMainContent(template);
    }

    /**
     * Render profile information
     */
    renderProfileInfo() {
        if (this.isEditing) {
            return this.renderEditForm();
        }

        const user = nexusCore.currentUser;
        return `
            <div class="space-y-4">
                <div class="grid md:grid-cols-2 gap-4">
                    <div>
                        <label class="nexus-label">First Name</label>
                        <p class="nexus-text-primary">${user?.firstName || 'Not provided'}</p>
                    </div>
                    <div>
                        <label class="nexus-label">Last Name</label>
                        <p class="nexus-text-primary">${user?.lastName || 'Not provided'}</p>
                    </div>
                </div>
                
                <div class="grid md:grid-cols-2 gap-4">
                    <div>
                        <label class="nexus-label">Username</label>
                        <p class="nexus-text-primary">@${user?.username || 'Not provided'}</p>
                    </div>
                    <div>
                        <label class="nexus-label">Email</label>
                        <p class="nexus-text-primary">${user?.email || 'Not provided'}</p>
                    </div>
                </div>
                
                <div class="grid md:grid-cols-2 gap-4">
                    <div>
                        <label class="nexus-label">Age</label>
                        <p class="nexus-text-primary">${user?.age || 'Not provided'}</p>
                    </div>
                    <div>
                        <label class="nexus-label">Gender</label>
                        <p class="nexus-text-primary">${user?.gender || 'Not provided'}</p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render edit form
     */
    renderEditForm() {
        const user = nexusCore.currentUser;
        return `
            <form id="profile-edit-form" class="space-y-4">
                <div class="grid md:grid-cols-2 gap-4">
                    <div class="nexus-form-group">
                        <label class="nexus-label">First Name</label>
                        <input 
                            type="text" 
                            name="firstName" 
                            class="nexus-input" 
                            value="${user?.firstName || ''}"
                            required
                        >
                    </div>
                    <div class="nexus-form-group">
                        <label class="nexus-label">Last Name</label>
                        <input 
                            type="text" 
                            name="lastName" 
                            class="nexus-input" 
                            value="${user?.lastName || ''}"
                            required
                        >
                    </div>
                </div>
                
                <div class="grid md:grid-cols-2 gap-4">
                    <div class="nexus-form-group">
                        <label class="nexus-label">Username</label>
                        <input 
                            type="text" 
                            name="username" 
                            class="nexus-input" 
                            value="${user?.username || ''}"
                            required
                        >
                    </div>
                    <div class="nexus-form-group">
                        <label class="nexus-label">Email</label>
                        <input 
                            type="email" 
                            name="email" 
                            class="nexus-input" 
                            value="${user?.email || ''}"
                            required
                        >
                    </div>
                </div>
                
                <div class="grid md:grid-cols-2 gap-4">
                    <div class="nexus-form-group">
                        <label class="nexus-label">Age</label>
                        <input 
                            type="number" 
                            name="age" 
                            class="nexus-input" 
                            value="${user?.age || ''}"
                            min="13"
                            max="120"
                            required
                        >
                    </div>
                    <div class="nexus-form-group">
                        <label class="nexus-label">Gender</label>
                        <select name="gender" class="nexus-select" required>
                            <option value="male" ${user?.gender === 'male' ? 'selected' : ''}>Male</option>
                            <option value="female" ${user?.gender === 'female' ? 'selected' : ''}>Female</option>
                            <option value="other" ${user?.gender === 'other' ? 'selected' : ''}>Other</option>
                            <option value="prefer-not-to-say" ${user?.gender === 'prefer-not-to-say' ? 'selected' : ''}>Prefer not to say</option>
                        </select>
                    </div>
                </div>
                
                <div class="flex gap-3 pt-4">
                    <button 
                        type="submit" 
                        class="nexus-btn nexus-btn-primary"
                    >
                        <i class="fas fa-save mr-2"></i>
                        Save Changes
                    </button>
                    <button 
                        type="button" 
                        class="nexus-btn nexus-btn-secondary"
                        onclick="nexusProfile.cancelEdit()"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        `;
    }

    /**
     * Toggle edit mode
     */
    toggleEditMode() {
        this.isEditing = !this.isEditing;
        
        const container = document.getElementById('profile-info');
        const button = document.getElementById('edit-profile-btn');
        
        if (container) {
            container.innerHTML = this.renderProfileInfo();
        }
        
        if (button) {
            if (this.isEditing) {
                button.innerHTML = '<i class="fas fa-times mr-2"></i>Cancel Edit';
            } else {
                button.innerHTML = '<i class="fas fa-edit mr-2"></i>Edit Profile';
            }
        }
        
        if (this.isEditing) {
            this.setupEditForm();
        }
    }

    /**
     * Setup edit form handlers
     */
    setupEditForm() {
        const form = document.getElementById('profile-edit-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveProfile(new FormData(form));
            });
        }
    }

    /**
     * Save profile changes
     */
    async saveProfile(formData) {
        try {
            const profileData = {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                username: formData.get('username'),
                email: formData.get('email'),
                age: parseInt(formData.get('age')),
                gender: formData.get('gender')
            };

            const response = await nexusCore.apiRequest('/profile/manage', 'PUT', profileData);

            if (response.ok) {
                const updatedUser = await response.json();
                nexusCore.currentUser = updatedUser;
                
                nexusCore.showNotification('Profile updated successfully!', 'success');
                this.isEditing = false;
                this.renderProfilePage();
            } else {
                const error = await response.text();
                nexusCore.showNotification(error || 'Failed to update profile', 'error');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            nexusCore.showNotification('Network error. Please try again.', 'error');
        }
    }

    /**
     * Cancel edit mode
     */
    cancelEdit() {
        this.isEditing = false;
        this.toggleEditMode();
    }

    /**
     * Change avatar
     */
    changeAvatar() {
        // Create file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // For now, just show a preview
                const reader = new FileReader();
                reader.onload = (e) => {
                    const avatarImg = document.querySelector('.nexus-profile-avatar img');
                    if (avatarImg) {
                        avatarImg.src = e.target.result;
                    }
                    nexusCore.showNotification('Avatar updated! (Note: This is a preview only)', 'success');
                };
                reader.readAsDataURL(file);
            }
        });

        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    }

    /**
     * Export user data
     */
    exportData() {
        try {
            const userData = {
                profile: this.userProfile,
                exportDate: new Date().toISOString(),
                exportedBy: 'Forum'
            };

            const dataStr = JSON.stringify(userData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `nexus-profile-data-${new Date().toISOString().split('T')[0]}.json`;
            link.style.display = 'none';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            nexusCore.showNotification('Profile data exported successfully!', 'success');
        } catch (error) {
            console.error('Export error:', error);
            nexusCore.showNotification('Failed to export data', 'error');
        }
    }

    /**
     * Confirm account deletion
     */
    confirmDeleteAccount() {
        if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            if (confirm('This will permanently delete all your data. Are you absolutely sure?')) {
                this.deleteAccount();
            }
        }
    }

    /**
     * Delete user account
     */
    async deleteAccount() {
        try {
            const response = await nexusCore.apiRequest('/profile/manage', 'DELETE');

            if (response.ok) {
                nexusCore.showNotification('Account deleted successfully', 'success');
                nexusAuth.logout();
            } else {
                const error = await response.text();
                nexusCore.showNotification(error || 'Failed to delete account', 'error');
            }
        } catch (error) {
            console.error('Error deleting account:', error);
            nexusCore.showNotification('Network error. Please try again.', 'error');
        }
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

// Initialize profile component
document.addEventListener('DOMContentLoaded', () => {
    window.nexusProfile = new NexusProfile();
    nexusCore.registerComponent('profile', NexusProfile);
});
