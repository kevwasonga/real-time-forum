/**
 * Community Nexus - Enhanced Navigation Component
 * Handles responsive navigation, sidebar, and routing
 */

class NexusNavigation {
    constructor() {
        this.isMobile = false;
        this.sidebarOpen = false;
        this.currentPage = 'dashboard';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderNavigation();
        this.setupRouting();
        console.log('🧭 Navigation component initialized');
    }

    setupEventListeners() {
        // Only setup event listeners if nexusCore is available
        if (!window.nexusCore || !nexusCore.on) {
            console.warn('nexusCore not available, skipping event listeners setup');
            return;
        }

        try {
            // Listen for authentication changes
            nexusCore.on('user:authenticated', (event) => {
                this.renderNavigation();
            });

            nexusCore.on('user:logout', () => {
                this.renderNavigation();
            });

            // Listen for responsive changes
            nexusCore.on('responsive:change', (event) => {
                this.isMobile = event.detail.isMobile;
                this.handleResponsiveChange();
            });

            // Listen for navigation events
            nexusCore.on('navigate', (event) => {
                this.navigateTo(event.detail.page);
            });
        } catch (error) {
            console.error('Error setting up navigation event listeners:', error);
        }
    }

    /**
     * Render main navigation
     */
    renderNavigation() {
        // Only render authenticated navigation if user is actually authenticated
        if (!nexusCore || !nexusCore.isAuthenticated || !nexusCore.currentUser) {
            this.renderGuestNavigation();
            return;
        }

        const template = `
            <nav class="nexus-navbar">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between items-center h-16">
                        <!-- Brand -->
                        <div class="flex items-center">
                            <button
                                class="nexus-btn nexus-btn-ghost p-2 mr-3 md:hidden"
                                onclick="window.nexusNavigation?.toggleSidebar()"
                            >
                                <i class="fas fa-bars"></i>
                            </button>
                            <a href="#" class="nexus-nav-brand" onclick="safeNavigate('dashboard')">
                                <i class="fas fa-comments nexus-gradient-text"></i>
                                Forum
                            </a>
                        </div>

                        <!-- Desktop Navigation -->
                        <div class="hidden md:flex items-center space-x-8">
                            <a href="#" class="nexus-nav-link" data-page="dashboard" onclick="safeNavigate('dashboard')">
                                <i class="fas fa-home mr-2"></i>Dashboard
                            </a>
                            <a href="#" class="nexus-nav-link" data-page="discussions" onclick="safeNavigate('discussions')">
                                <i class="fas fa-comments mr-2"></i>Discussions
                            </a>
                            <a href="#" class="nexus-nav-link" data-page="messages" onclick="safeNavigate('messages')">
                                <i class="fas fa-envelope mr-2"></i>Messages
                            </a>
                            <a href="#" class="nexus-nav-link" data-page="community" onclick="safeNavigate('community')">
                                <i class="fas fa-users mr-2"></i>Community
                            </a>
                        </div>

                        <!-- User Menu -->
                        <div class="flex items-center space-x-4">
                            <!-- Search -->
                            <button
                                class="nexus-btn nexus-btn-ghost p-2"
                                onclick="window.nexusNavigation?.openSearch()"
                                title="Search (Ctrl+K)"
                            >
                                <i class="fas fa-search"></i>
                            </button>

                            <!-- Notifications -->
                            <div class="relative">
                                <button
                                    class="nexus-btn nexus-btn-ghost p-2 relative"
                                    onclick="window.nexusNavigation?.toggleNotifications()"
                                >
                                    <i class="fas fa-bell"></i>
                                    <span class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                        3
                                    </span>
                                </button>
                            </div>

                            <!-- User Avatar -->
                            <div class="relative">
                                <button
                                    class="flex items-center space-x-2 nexus-btn nexus-btn-ghost"
                                    onclick="window.nexusNavigation?.toggleUserMenu()"
                                >
                                    <img 
                                        src="/static/img/default-avatar.png" 
                                        alt="${nexusCore.currentUser?.firstName || 'User'}"
                                        class="nexus-avatar nexus-avatar-sm"
                                        onerror="this.src='/static/img/default-avatar.png'"
                                    >
                                    <span class="hidden sm:block font-medium">
                                        ${nexusCore.currentUser?.firstName || 'User'}
                                    </span>
                                    <i class="fas fa-chevron-down text-xs"></i>
                                </button>
                                
                                <!-- User Dropdown -->
                                <div id="user-menu" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                                    <div class="py-2">
                                        <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onclick="safeNavigate('profile')">
                                            <i class="fas fa-user mr-2"></i>Profile
                                        </a>
                                        <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onclick="safeNavigate('settings')">
                                            <i class="fas fa-cog mr-2"></i>Settings
                                        </a>
                                        <hr class="my-1">
                                        <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onclick="nexusAuth.logout()">
                                            <i class="fas fa-sign-out-alt mr-2"></i>Sign Out
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            <!-- Mobile Sidebar -->
            <div id="mobile-sidebar" class="nexus-sidebar md:hidden ${this.sidebarOpen ? 'open' : 'collapsed'}">
                <div class="nexus-sidebar-section">
                    <div class="nexus-sidebar-title">Navigation</div>
                    <ul class="nexus-sidebar-menu">
                        <li class="nexus-sidebar-item">
                            <a href="#" class="nexus-sidebar-link" data-page="dashboard" onclick="safeNavigate('dashboard')">
                                <i class="fas fa-home"></i>Dashboard
                            </a>
                        </li>
                        <li class="nexus-sidebar-item">
                            <a href="#" class="nexus-sidebar-link" data-page="discussions" onclick="safeNavigate('discussions')">
                                <i class="fas fa-comments"></i>Discussions
                            </a>
                        </li>
                        <li class="nexus-sidebar-item">
                            <a href="#" class="nexus-sidebar-link" data-page="messages" onclick="safeNavigate('messages')">
                                <i class="fas fa-envelope"></i>Messages
                            </a>
                        </li>
                        <li class="nexus-sidebar-item">
                            <a href="#" class="nexus-sidebar-link" data-page="community" onclick="safeNavigate('community')">
                                <i class="fas fa-users"></i>Community
                            </a>
                        </li>
                    </ul>
                </div>
                
                <div class="nexus-sidebar-section">
                    <div class="nexus-sidebar-title">Account</div>
                    <ul class="nexus-sidebar-menu">
                        <li class="nexus-sidebar-item">
                            <a href="#" class="nexus-sidebar-link" onclick="safeNavigate('profile')">
                                <i class="fas fa-user"></i>Profile
                            </a>
                        </li>
                        <li class="nexus-sidebar-item">
                            <a href="#" class="nexus-sidebar-link" onclick="safeNavigate('settings')">
                                <i class="fas fa-cog"></i>Settings
                            </a>
                        </li>
                        <li class="nexus-sidebar-item">
                            <a href="#" class="nexus-sidebar-link" onclick="nexusAuth.logout()">
                                <i class="fas fa-sign-out-alt"></i>Sign Out
                            </a>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Sidebar Overlay -->
            <div
                id="sidebar-overlay"
                class="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden ${this.sidebarOpen ? 'block' : 'hidden'}"
                onclick="window.nexusNavigation?.closeSidebar()"
            ></div>
        `;

        this.renderTemplate(template);
        this.updateActiveNavigation();
    }

    /**
     * Render guest navigation
     */
    renderGuestNavigation() {
        const template = `
            <nav class="nexus-navbar">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between items-center h-16">
                        <a href="#" class="nexus-nav-brand">
                            <i class="fas fa-comments nexus-gradient-text"></i>
                            Community Nexus
                        </a>
                        
                        <div class="flex items-center space-x-4">
                            <button 
                                class="nexus-btn nexus-btn-secondary"
                                onclick="nexusAuth.showLoginForm()"
                            >
                                Sign In
                            </button>
                            <button 
                                class="nexus-btn nexus-btn-primary"
                                onclick="nexusAuth.showRegisterForm()"
                            >
                                Join Now
                            </button>
                        </div>
                    </div>
                </div>
            </nav>
        `;

        this.renderTemplate(template);
    }

    /**
     * Render template to DOM
     */
    renderTemplate(template) {
        // Remove existing navigation
        const existingNav = document.querySelector('.nexus-navbar');
        if (existingNav) existingNav.remove();

        const existingSidebar = document.querySelector('#mobile-sidebar');
        if (existingSidebar) existingSidebar.remove();

        const existingOverlay = document.querySelector('#sidebar-overlay');
        if (existingOverlay) existingOverlay.remove();

        // Add new navigation
        document.body.insertAdjacentHTML('afterbegin', template);

        // Setup click outside handlers
        this.setupClickOutsideHandlers();
    }

    /**
     * Setup routing
     */
    setupRouting() {
        // Only setup routing if nexusCore and router are available
        if (!window.nexusCore || !nexusCore.router) {
            console.warn('nexusCore.router not available, skipping routing setup');
            return;
        }

        try {
            nexusCore.router.add('/', () => this.navigateTo('dashboard'));
            nexusCore.router.add('/dashboard', () => this.navigateTo('dashboard'));
            nexusCore.router.add('/discussions', () => this.navigateTo('discussions'));
            nexusCore.router.add('/messages', () => this.navigateTo('messages'));
            nexusCore.router.add('/community', () => this.navigateTo('community'));
            nexusCore.router.add('/profile', () => this.navigateTo('profile'));
            nexusCore.router.add('/settings', () => this.navigateTo('settings'));
            nexusCore.router.add('*', () => this.navigateTo('dashboard'));
        } catch (error) {
            console.error('Error setting up navigation routing:', error);
        }
    }

    /**
     * Navigate to page
     */
    navigateTo(page) {
        this.currentPage = page;
        this.updateActiveNavigation();
        this.closeSidebar();
        this.closeUserMenu();

        // Emit navigation event if nexusCore is available
        if (window.nexusCore && nexusCore.emit) {
            try {
                nexusCore.emit('page:change', { page });
            } catch (error) {
                console.error('Error emitting navigation event:', error);
            }
        }

        // Update URL
        const path = page === 'dashboard' ? '/' : `/${page}`;
        history.pushState(null, '', path);

        console.log(`📍 Navigated to: ${page}`);
    }

    /**
     * Update active navigation state
     */
    updateActiveNavigation() {
        // Remove all active states
        document.querySelectorAll('.nexus-nav-link, .nexus-sidebar-link').forEach(link => {
            link.classList.remove('active');
        });

        // Add active state to current page
        document.querySelectorAll(`[data-page="${this.currentPage}"]`).forEach(link => {
            link.classList.add('active');
        });
    }

    /**
     * Toggle mobile sidebar
     */
    toggleSidebar() {
        this.sidebarOpen = !this.sidebarOpen;
        
        const sidebar = document.getElementById('mobile-sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        
        if (this.sidebarOpen) {
            sidebar?.classList.remove('collapsed');
            sidebar?.classList.add('open');
            overlay?.classList.remove('hidden');
        } else {
            sidebar?.classList.remove('open');
            sidebar?.classList.add('collapsed');
            overlay?.classList.add('hidden');
        }
    }

    /**
     * Close sidebar
     */
    closeSidebar() {
        this.sidebarOpen = false;
        const sidebar = document.getElementById('mobile-sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        
        sidebar?.classList.remove('open');
        sidebar?.classList.add('collapsed');
        overlay?.classList.add('hidden');
    }

    /**
     * Toggle user menu
     */
    toggleUserMenu() {
        const menu = document.getElementById('user-menu');
        if (menu) {
            menu.classList.toggle('hidden');
        }
    }

    /**
     * Close user menu
     */
    closeUserMenu() {
        const menu = document.getElementById('user-menu');
        if (menu) {
            menu.classList.add('hidden');
        }
    }

    /**
     * Toggle notifications
     */
    toggleNotifications() {
        const existingPanel = document.getElementById('notifications-panel');
        if (existingPanel) {
            existingPanel.remove();
            return;
        }

        this.renderNotificationsPanel();
        this.loadNotifications();
    }

    /**
     * Render notifications panel
     */
    renderNotificationsPanel() {
        const template = `
            <div id="notifications-panel" class="nexus-dropdown-panel" style="position: fixed; top: 70px; right: 20px; width: 350px; z-index: 1000;">
                <div class="nexus-card">
                    <div class="nexus-card-header">
                        <h3 class="nexus-heading-4">Notifications</h3>
                        <button onclick="document.getElementById('notifications-panel').remove()" class="text-gray-400 hover:text-gray-600">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="nexus-card-body p-0" style="max-height: 400px; overflow-y: auto;">
                        <div id="notifications-list">
                            <div class="text-center py-8">
                                <i class="fas fa-spinner fa-spin text-2xl text-gray-400"></i>
                                <p class="nexus-text-secondary mt-2">Loading notifications...</p>
                            </div>
                        </div>
                    </div>
                    <div class="nexus-card-footer">
                        <button class="nexus-btn nexus-btn-ghost nexus-btn-sm w-full" onclick="nexusNavigation.markAllNotificationsRead()">
                            Mark all as read
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', template);

        // Close panel when clicking outside
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                const panel = document.getElementById('notifications-panel');
                const button = e.target.closest('[onclick*="toggleNotifications"]');
                if (panel && !panel.contains(e.target) && !button) {
                    panel.remove();
                }
            }, { once: true });
        }, 100);
    }

    /**
     * Load notifications
     */
    async loadNotifications() {
        try {
            // For now, create mock notifications based on recent activity
            const notifications = [
                {
                    id: 1,
                    type: 'like',
                    message: 'Someone liked your discussion',
                    time: new Date(Date.now() - 5 * 60 * 1000),
                    read: false
                },
                {
                    id: 2,
                    type: 'comment',
                    message: 'New comment on your discussion',
                    time: new Date(Date.now() - 15 * 60 * 1000),
                    read: false
                },
                {
                    id: 3,
                    type: 'message',
                    message: 'You have a new private message',
                    time: new Date(Date.now() - 30 * 60 * 1000),
                    read: true
                }
            ];

            this.renderNotifications(notifications);
        } catch (error) {
            console.error('Error loading notifications:', error);
            this.renderNotificationsError();
        }
    }

    /**
     * Render notifications
     */
    renderNotifications(notifications) {
        const container = document.getElementById('notifications-list');
        if (!container) return;

        if (notifications.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-bell-slash text-4xl text-gray-300 mb-4"></i>
                    <p class="nexus-text-secondary">No notifications yet</p>
                </div>
            `;
            return;
        }

        container.innerHTML = notifications.map(notification => `
            <div class="notification-item ${notification.read ? 'read' : 'unread'} p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                <div class="flex items-start gap-3">
                    <div class="notification-icon">
                        <i class="fas fa-${this.getNotificationIcon(notification.type)} text-blue-500"></i>
                    </div>
                    <div class="flex-1">
                        <p class="text-sm text-gray-900">${notification.message}</p>
                        <p class="text-xs text-gray-500 mt-1">${nexusCore.formatDate(notification.time)}</p>
                    </div>
                    ${!notification.read ? '<div class="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>' : ''}
                </div>
            </div>
        `).join('');
    }

    /**
     * Get notification icon
     */
    getNotificationIcon(type) {
        const icons = {
            like: 'heart',
            comment: 'comment',
            message: 'envelope',
            mention: 'at',
            follow: 'user-plus'
        };
        return icons[type] || 'bell';
    }

    /**
     * Mark all notifications as read
     */
    markAllNotificationsRead() {
        const unreadItems = document.querySelectorAll('.notification-item.unread');
        unreadItems.forEach(item => {
            item.classList.remove('unread');
            item.classList.add('read');
            const indicator = item.querySelector('.w-2.h-2.bg-blue-500');
            if (indicator) indicator.remove();
        });

        // Update notification badge
        const badge = document.querySelector('.fa-bell + span');
        if (badge) {
            badge.textContent = '0';
            badge.style.display = 'none';
        }

        nexusCore.showNotification('All notifications marked as read', 'success');
    }

    /**
     * Render notifications error
     */
    renderNotificationsError() {
        const container = document.getElementById('notifications-list');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-exclamation-circle text-2xl text-red-400 mb-2"></i>
                    <p class="nexus-text-secondary">Failed to load notifications</p>
                </div>
            `;
        }
    }

    /**
     * Open search
     */
    openSearch() {
        const existingModal = document.getElementById('search-modal');
        if (existingModal) {
            existingModal.remove();
            return;
        }

        const template = `
            <div class="nexus-modal-overlay active" id="search-modal">
                <div class="nexus-modal nexus-animate-scale-in" style="max-width: 600px;">
                    <div class="nexus-modal-header">
                        <h2 class="nexus-modal-title">
                            <i class="fas fa-search mr-2 nexus-gradient-text"></i>
                            Search Forum
                        </h2>
                        <button class="nexus-modal-close" onclick="document.getElementById('search-modal').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="nexus-modal-body">
                        <div class="nexus-form-group mb-4">
                            <input
                                type="text"
                                id="search-input"
                                class="nexus-input"
                                placeholder="Search discussions, users, or content..."
                                autocomplete="off"
                            >
                        </div>
                        <div id="search-results">
                            <div class="text-center py-8">
                                <i class="fas fa-search text-4xl text-gray-300 mb-4"></i>
                                <p class="nexus-text-secondary">Start typing to search...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', template);

        // Setup search functionality
        const searchInput = document.getElementById('search-input');
        let searchTimeout;

        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();

            if (query.length < 2) {
                document.getElementById('search-results').innerHTML = `
                    <div class="text-center py-8">
                        <i class="fas fa-search text-4xl text-gray-300 mb-4"></i>
                        <p class="nexus-text-secondary">Start typing to search...</p>
                    </div>
                `;
                return;
            }

            searchTimeout = setTimeout(() => {
                this.performSearch(query);
            }, 300);
        });

        // Focus search input
        setTimeout(() => searchInput.focus(), 100);

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.getElementById('search-modal')?.remove();
            }
        }, { once: true });
    }

    /**
     * Perform search
     */
    async performSearch(query) {
        const resultsContainer = document.getElementById('search-results');

        // Show loading
        resultsContainer.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-spinner fa-spin text-2xl text-gray-400"></i>
                <p class="nexus-text-secondary mt-2">Searching...</p>
            </div>
        `;

        try {
            // Search discussions
            const response = await nexusCore.apiRequest(`/discussions?search=${encodeURIComponent(query)}`);

            if (response.ok) {
                const discussions = await response.json();
                this.renderSearchResults(discussions, query);
            } else {
                throw new Error('Search failed');
            }
        } catch (error) {
            console.error('Search error:', error);
            resultsContainer.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-exclamation-circle text-2xl text-red-400 mb-2"></i>
                    <p class="nexus-text-secondary">Search failed. Please try again.</p>
                </div>
            `;
        }
    }

    /**
     * Render search results
     */
    renderSearchResults(discussions, query) {
        const resultsContainer = document.getElementById('search-results');

        if (discussions.length === 0) {
            resultsContainer.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-search text-4xl text-gray-300 mb-4"></i>
                    <p class="nexus-text-secondary">No results found for "${query}"</p>
                </div>
            `;
            return;
        }

        resultsContainer.innerHTML = `
            <div class="space-y-3">
                <p class="text-sm text-gray-500 mb-4">Found ${discussions.length} result(s) for "${query}"</p>
                ${discussions.map(discussion => `
                    <div class="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                         onclick="nexusDiscussions.viewDiscussion(${discussion.id}); document.getElementById('search-modal').remove();">
                        <div class="flex items-start gap-3">
                            <i class="fas fa-comment text-blue-500 mt-1"></i>
                            <div class="flex-1">
                                <h4 class="font-medium text-gray-900 mb-1">${this.highlightSearchTerm(discussion.title, query)}</h4>
                                <p class="text-sm text-gray-600 mb-2">${this.highlightSearchTerm(this.truncateText(discussion.content, 100), query)}</p>
                                <div class="flex items-center gap-2 text-xs text-gray-500">
                                    <span>${discussion.authorFirstName} ${discussion.authorLastName}</span>
                                    <span>•</span>
                                    <span>${nexusCore.formatDate(discussion.createdAt)}</span>
                                    <span>•</span>
                                    <span class="nexus-badge nexus-badge-primary">${discussion.category}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Highlight search term in text
     */
    highlightSearchTerm(text, term) {
        if (!term) return text;
        const regex = new RegExp(`(${term})`, 'gi');
        return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
    }

    /**
     * Truncate text
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Handle responsive changes
     */
    handleResponsiveChange() {
        if (!this.isMobile) {
            this.closeSidebar();
        }
    }

    /**
     * Setup click outside handlers
     */
    setupClickOutsideHandlers() {
        document.addEventListener('click', (event) => {
            // Close user menu if clicking outside
            const userMenu = document.getElementById('user-menu');
            const userButton = event.target.closest('[onclick*="toggleUserMenu"]');
            
            if (userMenu && !userMenu.contains(event.target) && !userButton) {
                this.closeUserMenu();
            }
        });
    }

    /**
     * Get current page
     */
    getCurrentPage() {
        return this.currentPage;
    }

    /**
     * Set page title
     */
    setPageTitle(title) {
        document.title = `${title} - Community Nexus`;
    }
}

// Initialize navigation component after core is ready
function initializeNavigation() {
    if (window.nexusCore) {
        try {
            window.nexusNavigation = new NexusNavigation();
            if (nexusCore.registerComponent) {
                nexusCore.registerComponent('navigation', NexusNavigation);
            }
            console.log('🧭 Navigation component registered globally');
            return true;
        } catch (error) {
            console.error('Error initializing navigation component:', error);
            return false;
        }
    }
    return false;
}

document.addEventListener('DOMContentLoaded', () => {
    // Try immediate initialization
    if (!initializeNavigation()) {
        // Wait for nexusCore to be ready
        let attempts = 0;
        const maxAttempts = 20;
        const checkInterval = setInterval(() => {
            attempts++;
            if (initializeNavigation()) {
                clearInterval(checkInterval);
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                console.error('Failed to initialize navigation component - nexusCore not available');
            }
        }, 50);
    }
});
