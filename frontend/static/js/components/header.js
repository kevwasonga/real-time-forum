// Header Component
window.HeaderComponent = {
    init() {
        this.bindEvents();
        console.log('📋 Header component initialized');
    },

    bindEvents() {
        // User avatar dropdown toggle
        const userAvatarBtn = document.getElementById('user-avatar-btn');
        const userDropdown = document.getElementById('user-dropdown');
        
        if (userAvatarBtn && userDropdown) {
            userAvatarBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown.classList.toggle('show');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!userAvatarBtn.contains(e.target) && !userDropdown.contains(e.target)) {
                    userDropdown.classList.remove('show');
                }
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.handleLogout.bind(this));
        }
    },

    async handleLogout() {
        try {
            if (window.forumApp) {
                await window.forumApp.logout();
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
    },

    updateUserInfo(user) {
        const userNickname = document.getElementById('user-nickname');
        const userAvatar = document.getElementById('user-avatar');

        if (userNickname) {
            userNickname.textContent = user.nickname;
        }

        if (userAvatar) {
            if (user.avatarUrl) {
                userAvatar.src = user.avatarUrl;
            } else {
                userAvatar.src = '/static/images/default-avatar.png';
            }
            userAvatar.alt = `${user.nickname}'s avatar`;
        }
    }
};
