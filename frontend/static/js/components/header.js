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
            console.log('Setting up dropdown events for:', userAvatarBtn, userDropdown);

            userAvatarBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Close any other open dropdowns first
                document.querySelectorAll('.user-dropdown.show').forEach(dropdown => {
                    if (dropdown !== userDropdown) {
                        dropdown.classList.remove('show');
                    }
                });

                userDropdown.classList.toggle('show');
                console.log('Dropdown toggled, show class:', userDropdown.classList.contains('show'));
                console.log('Dropdown computed style:', window.getComputedStyle(userDropdown).display);
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!userAvatarBtn.contains(e.target) && !userDropdown.contains(e.target)) {
                    userDropdown.classList.remove('show');
                }
            });
        } else {
            console.log('Could not find dropdown elements:', { userAvatarBtn, userDropdown });
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
                userAvatar.src = '/static/images/default-avatar.svg';
            }
            userAvatar.alt = `${user.nickname}'s avatar`;
        }
    }
};
