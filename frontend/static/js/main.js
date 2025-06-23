// Main application entry point

window.forumApp = {
    // Core components
    router: null,
    websocket: null,
    currentUser: null,
    isAuthenticated: false,
    currentPage: null,

    // UI components
    headerComponent: null,
    sidebarComponent: null,
    chatComponent: null,
    notificationComponent: null,

    // Page components
    pages: {},

    /**
     * Initialize the application
     */
    async init() {
        console.log('🚀 Initializing Forum Application...');
        
        try {
            // Show loading screen
            this.showLoading();

            // Initialize authentication
            await this.initAuth();

            // Initialize components
            this.initComponents();

            // Initialize WebSocket if authenticated
            if (this.isAuthenticated) {
                this.initWebSocket();
            }

            // Update UI based on auth state
            this.updateAuthUI();

            // Hide loading screen and show app
            this.hideLoading();

            console.log('✅ Forum Application initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    },

    /**
     * Initialize authentication
     */
    async initAuth() {
        const isAuthenticated = await window.auth.init();
        this.currentUser = window.auth.getCurrentUser();
        this.isAuthenticated = isAuthenticated;
        
        if (isAuthenticated) {
            console.log('✅ User authenticated:', this.currentUser.nickname);
        } else {
            console.log('ℹ️ User not authenticated');
        }
    },

    /**
     * Initialize UI components
     */
    initComponents() {
        // Initialize notification component first (other components may use it)
        if (window.NotificationComponent) {
            this.notificationComponent = window.NotificationComponent;
            this.notificationComponent.init();
        }

        // Initialize header component
        if (window.HeaderComponent) {
            this.headerComponent = window.HeaderComponent;
            this.headerComponent.init();
        }

        // Initialize sidebar component
        if (window.SidebarComponent) {
            this.sidebarComponent = window.SidebarComponent;
            this.sidebarComponent.init();
        }

        // Initialize chat component
        if (window.ChatComponent) {
            this.chatComponent = window.ChatComponent;
            this.chatComponent.init();
        }

        // Initialize page components
        this.initPages();
    },

    /**
     * Initialize page components
     */
    initPages() {
        this.pages = {
            home: window.HomePage ? window.HomePage.render.bind(window.HomePage) : this.defaultPageHandler('Home'),
            login: window.LoginPage ? window.LoginPage.render.bind(window.LoginPage) : this.defaultPageHandler('Login'),
            register: window.RegisterPage ? window.RegisterPage.render.bind(window.RegisterPage) : this.defaultPageHandler('Register'),
            posts: window.PostsPage ? window.PostsPage.render.bind(window.PostsPage) : this.defaultPageHandler('Posts'),
            post: window.PostPage ? window.PostPage.render.bind(window.PostPage) : this.defaultPageHandler('Post'),
            createPost: window.CreatePostPage ? window.CreatePostPage.render.bind(window.CreatePostPage) : this.defaultPageHandler('Create Post'),
            messages: window.MessagesPage ? window.MessagesPage.render.bind(window.MessagesPage) : this.defaultPageHandler('Messages'),
            profile: window.ProfilePage ? window.ProfilePage.render.bind(window.ProfilePage) : this.defaultPageHandler('Profile'),
            friends: window.FriendsPage ? window.FriendsPage.render.bind(window.FriendsPage) : this.defaultPageHandler('Friends')
        };

        // Initialize router after pages are set up
        this.initRouter();
    },

    /**
     * Default page handler for missing pages
     */
    defaultPageHandler(pageName) {
        return () => {
            const mainContent = document.getElementById('main-content');
            mainContent.innerHTML = `
                <div class="text-center">
                    <h1>${pageName}</h1>
                    <p>This page is under development.</p>
                </div>
            `;
        };
    },

    /**
     * Initialize router
     */
    initRouter() {
        this.router = new window.Router();

        // Register routes
        this.router.addRoute('/', this.pages.home, {
            title: 'Forum - Home'
        });

        this.router.addRoute('/login', this.pages.login, {
            title: 'Forum - Login',
            redirectIfAuth: true
        });

        this.router.addRoute('/register', this.pages.register, {
            title: 'Forum - Register',
            redirectIfAuth: true
        });

        this.router.addRoute('/posts', this.pages.posts, {
            title: 'Forum - Posts'
        });

        this.router.addRoute('/post/:id', this.pages.post, {
            title: 'Forum - Post'
        });

        this.router.addRoute('/create-post', this.pages.createPost, {
            title: 'Forum - Create Post',
            requiresAuth: true
        });

        this.router.addRoute('/messages', this.pages.messages, {
            title: 'Forum - Messages',
            requiresAuth: true
        });

        this.router.addRoute('/profile', this.pages.profile, {
            title: 'Forum - Profile',
            requiresAuth: true
        });

        this.router.addRoute('/friends', this.pages.friends, {
            title: 'Forum - Friends',
            requiresAuth: true
        });

        // 404 route
        this.router.addRoute('/404', () => {
            const mainContent = document.getElementById('main-content');
            mainContent.innerHTML = `
                <div class="text-center">
                    <h1>404 - Page Not Found</h1>
                    <p>The page you're looking for doesn't exist.</p>
                    <a href="/" data-route="/" class="btn btn-primary">Go Home</a>
                </div>
            `;
        }, {
            title: 'Forum - Page Not Found'
        });

        // Initialize router
        this.router.init();
    },

    /**
     * Initialize WebSocket connection
     */
    initWebSocket() {
        if (!this.isAuthenticated) {
            console.log('ℹ️ Skipping WebSocket initialization - user not authenticated');
            return;
        }

        this.websocket = new window.WebSocketClient();
        
        // Set up event listeners
        this.websocket.addEventListener('connected', () => {
            console.log('✅ WebSocket connected');
            if (this.notificationComponent) {
                this.notificationComponent.success('Connected to real-time updates');
            }
        });

        this.websocket.addEventListener('disconnected', () => {
            console.log('🔌 WebSocket disconnected');
            if (this.notificationComponent) {
                this.notificationComponent.warning('Lost connection to real-time updates');
            }
        });

        this.websocket.addEventListener('error', (error) => {
            console.error('❌ WebSocket error:', error);
        });

        // Connect to WebSocket
        this.websocket.connect();
    },

    /**
     * Update UI based on authentication state
     */
    updateAuthUI() {
        const header = document.getElementById('header');
        const mainContent = document.getElementById('main-content');
        const sidebar = document.getElementById('sidebar');
        const userMenu = document.getElementById('user-menu');
        const authButtons = document.getElementById('auth-buttons');
        const userNickname = document.getElementById('user-nickname');
        const userAvatar = document.getElementById('user-avatar');

        // Show main UI elements
        if (header) header.style.display = 'block';
        if (mainContent) mainContent.style.display = 'block';

        if (this.isAuthenticated && this.currentUser) {
            // Show authenticated UI
            if (userMenu) userMenu.style.display = 'block';
            if (authButtons) authButtons.style.display = 'none';
            if (sidebar) sidebar.style.display = 'block';
            
            // Update user info
            if (userNickname) userNickname.textContent = this.currentUser.nickname;
            if (userAvatar) {
                userAvatar.src = this.currentUser.avatarUrl || '/static/images/default-avatar.svg';
            }
            
        } else {
            // Show unauthenticated UI
            if (userMenu) userMenu.style.display = 'none';
            if (authButtons) authButtons.style.display = 'flex';
            if (sidebar) sidebar.style.display = 'none';
        }

        // Set up logout handler
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.onclick = () => this.logout();
        }
    },

    /**
     * Handle user logout
     */
    async logout() {
        try {
            await window.auth.logout();
            this.currentUser = null;
            this.isAuthenticated = false;
            
            // Disconnect WebSocket
            if (this.websocket) {
                this.websocket.disconnect();
                this.websocket = null;
            }
            
            // Update UI
            this.updateAuthUI();
            
        } catch (error) {
            console.error('Logout error:', error);
            if (this.notificationComponent) {
                this.notificationComponent.error('Failed to logout');
            }
        }
    },

    /**
     * Handle successful login/registration
     */
    onAuthSuccess(user) {
        this.currentUser = user;
        this.isAuthenticated = true;
        
        // Initialize WebSocket
        this.initWebSocket();
        
        // Update UI
        this.updateAuthUI();
        
        // Navigate to home page
        if (this.router) {
            this.router.navigate('/');
        }
    },

    /**
     * Show loading screen
     */
    showLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        }
    },

    /**
     * Hide loading screen
     */
    hideLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    },

    /**
     * Show error message
     */
    showError(message) {
        this.hideLoading();
        
        if (this.notificationComponent) {
            this.notificationComponent.error(message);
        } else {
            alert(message);
        }
    },

    /**
     * Set current page
     */
    setCurrentPage(pageName) {
        this.currentPage = pageName;
    }
};

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.forumApp.init();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (window.forumApp.websocket) {
        if (document.hidden) {
            // Page is hidden, could pause some activities
            console.log('📱 Page hidden');
        } else {
            // Page is visible, resume activities
            console.log('📱 Page visible');
            // Reconnect WebSocket if needed
            if (!window.forumApp.websocket.isConnected) {
                window.forumApp.websocket.connect();
            }
        }
    }
});

// Handle online/offline events
window.addEventListener('online', () => {
    console.log('🌐 Back online');
    if (window.forumApp.websocket && !window.forumApp.websocket.isConnected) {
        window.forumApp.websocket.connect();
    }
    if (window.forumApp.notificationComponent) {
        window.forumApp.notificationComponent.success('Connection restored');
    }
});

window.addEventListener('offline', () => {
    console.log('📴 Gone offline');
    if (window.forumApp.notificationComponent) {
        window.forumApp.notificationComponent.warning('You are offline');
    }
});
