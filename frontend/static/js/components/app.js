const App = {
    async init() {
        // Create and insert the app container
        const appContainer = document.createElement('div');
        appContainer.className = 'app-container';
        appContainer.innerHTML = `
            <!-- Header -->
            <header class="header">
                <div class="logo">
                    <img src="/static/img/forum.png" alt="Forum" class="logo-img">
                    <span class="logo-text">Forum</span>
                </div>
                <div class="header-right">
                    <button class="create-post-btn">
                        <i class="fas fa-plus"></i> Create Post
                    </button>
                    <div class="icon-button messages-icon">
                        <span class="notification-badge messages-count hidden">0</span>
                        <i class="fas fa-envelope"></i>
                    </div>
                    <div class="icon-button notifications-icon">
                        <span class="notification-badge notifications-count hidden">0</span>
                        <i class="fas fa-bell"></i>
                    </div>
                    <div class="user-profile" id="user-profile-trigger">
                        <img src="/static/img/avatar.jpeg" alt="Profile" class="profile-pic" id="header-profile-pic">
                    </div>
                </div>
            </header>

            <div class="main-content">
                <!-- Left Sidebar -->
                <aside class="sidebar left-sidebar">
                    <nav class="categories-nav">
                        <ul>
                            <li>
                                <a href="#" data-category="all" class="active">
                                    <i class="fas fa-home"></i>
                                    <span>All Posts</span>
                                </a>
                            </li>
                            <li>
                                <a href="#" data-category="my-posts">
                                    <i class="fas fa-user-edit"></i>
                                    <span>My Posts</span>
                                </a>
                            </li>
                            <li>
                                <a href="#" data-category="general">
                                    <i class="fas fa-comments"></i>
                                    <span>General</span>
                                </a>
                            </li>
                            <li>
                                <a href="#" data-category="tech">
                                    <i class="fas fa-microchip"></i>
                                    <span>Technology</span>
                                </a>
                            </li>
                            <li>
                                <a href="#" data-category="creative">
                                    <i class="fas fa-palette"></i>
                                    <span>Creative Corner</span>
                                </a>
                            </li>
                            <li>
                                <a href="#" data-category="help">
                                    <i class="fas fa-question-circle"></i>
                                    <span>Help & Support</span>
                                </a>
                            </li>
                            <li>
                                <a href="#" data-category="food">
                                    <i class="fas fa-utensils"></i>
                                    <span>Food</span>
                                </a>
                            </li>
                            <li>
                                <a href="#" data-category="sports">
                                    <i class="fas fa-running"></i>
                                    <span>Sports</span>
                                </a>
                            </li>
                            <li>
                                <a href="#" data-category="lifestyle">
                                    <i class="fas fa-heart"></i>
                                    <span>Lifestyle</span>
                                </a>
                            </li>
                            <li>
                                <a href="#" data-category="beauty">
                                    <i class="fas fa-spa"></i>
                                    <span>Beauty</span>
                                </a>
                            </li>
                            <li>
                                <a href="#" data-category="health">
                                    <i class="fas fa-heartbeat"></i>
                                    <span>Health</span>
                                </a>
                            </li>
                        </ul>
                    </nav>
                    <div class="btns">
                    <button class="logout-btn">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </button>
                    </div>
                </aside>

                <!-- Main Content Area -->
                <main class="content-area">
                    <div id="auth-container" class="hidden">
                        <!-- Login/Register forms will be injected here -->
                    </div>
                    <div id="posts-container" class="hidden">
                        <!-- Posts will be injected here -->
                    </div>
                    <div id="messages-container" class="hidden">
                        <!-- Messages will be injected here -->
                    </div>
                </main>

                <!-- Right Sidebar -->
                <aside class="sidebar right-sidebar">
                    <div class="requests-section">
                        <h3 style="margin: 10px;">Requests</h3>
                        <div id="friend-requests">
                            <!-- Friend requests will be injected here -->
                        </div>
                    </div>
                    <div class="contacts-section">
                    <hr/>
                        <h3 style="margin: 10px; font-weight: bold">People</h3>
                        <div id="online-contacts">
                            <!-- Online contacts will be injected here -->
                        </div>
                    </div>
                </aside>
            </div>
        `;

        // Insert the app container into the body
        document.body.appendChild(appContainer);

        // Initialize other components
        this.initializeComponents();

        // Initialize user profile
        await UserProfile.updateUserProfileData();
    },

    initializeComponents() {
        // Add event listeners for buttons
        const createPostBtn = document.querySelector('.create-post-btn');
        const logoutBtn = document.querySelector('.logout-btn');
        const userProfileTrigger = document.getElementById('user-profile-trigger');

        if (createPostBtn) {
            createPostBtn.addEventListener('click', () => {
                // Handle create post button click
                console.log('Create post clicked');
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await Auth.logout();
                } catch (error) {
                    console.error('Error during logout:', error);
                }
            });
        }

        // Add event listener for user profile
        if (userProfileTrigger) {
            userProfileTrigger.addEventListener('click', () => {
                UserProfile.showUserProfile();
            });
        }

        // Add event listeners for category navigation
        const categoryLinks = document.querySelectorAll('.categories-nav a');
        categoryLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const category = e.target.closest('a').dataset.category;
                // Remove active class from all links
                categoryLinks.forEach(l => l.classList.remove('active'));
                // Add active class to clicked link
                e.target.closest('a').classList.add('active');
                // Load posts for selected category
                Posts.loadPosts(category);
            });
        });
    },

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        // Add to the DOM
        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
};

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    App.init();
    // WebSocketManager.connect();
}); 