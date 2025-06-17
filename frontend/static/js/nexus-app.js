/**
 * Forum - Main Application Controller
 * Orchestrates all components and manages application state
 */

class NexusApp {
    constructor() {
        this.isInitialized = false;
        this.currentPage = null;
        this.components = {};
        this.authenticationInProgress = false;
        this.init();
    }

    async init() {
        console.log('🚀 Starting Forum Application...');
        
        // Wait for core to be ready
        await this.waitForCore();
        
        // Initialize components
        this.initializeComponents();
        
        // Setup application event listeners
        this.setupEventListeners();
        
        // Handle initial route
        this.handleInitialRoute();
        
        // Hide loading overlay
        this.hideLoadingOverlay();
        
        this.isInitialized = true;
        console.log('✅ Forum Application initialized successfully');
    }

    /**
     * Wait for core to be ready
     */
    async waitForCore() {
        return new Promise((resolve) => {
            const checkCore = () => {
                if (window.nexusCore) {
                    resolve();
                } else {
                    setTimeout(checkCore, 50);
                }
            };
            checkCore();
        });
    }

    /**
     * Initialize all components
     */
    initializeComponents() {
        // Components are auto-registered by their respective files
        // We just need to ensure they're all loaded
        this.components = {
            auth: window.nexusAuth,
            navigation: window.nexusNavigation,
            discussions: window.nexusDiscussions,
            // messaging: window.nexusMessaging,
            // profile: window.nexusProfile,
            // realtime: window.nexusRealtime
        };
        
        console.log('📦 Components initialized:', Object.keys(this.components));
    }

    /**
     * Setup application-wide event listeners
     */
    setupEventListeners() {
        // Listen for authentication state changes
        nexusCore.on('user:authenticated', (event) => {
            this.handleUserAuthenticated(event.detail);
        });

        nexusCore.on('user:unauthenticated', () => {
            this.handleUserUnauthenticated();
        });

        nexusCore.on('user:logout', () => {
            this.handleUserLogout();
        });

        // Listen for page changes
        nexusCore.on('page:change', (event) => {
            this.handlePageChange(event.detail.page);
        });

        // Listen for keyboard shortcuts
        nexusCore.on('shortcut:search', () => {
            this.handleSearchShortcut();
        });

        // Listen for responsive changes
        nexusCore.on('responsive:change', (event) => {
            this.handleResponsiveChange(event.detail);
        });

        // Handle browser navigation
        window.addEventListener('popstate', () => {
            this.handleBrowserNavigation();
        });

        // Handle online/offline status
        window.addEventListener('online', () => {
            nexusCore.showNotification('Connection restored', 'success');
        });

        window.addEventListener('offline', () => {
            nexusCore.showNotification('Connection lost', 'warning');
        });
    }

    /**
     * Handle initial route
     */
    handleInitialRoute() {
        const path = window.location.pathname;
        
        if (nexusCore.isAuthenticated) {
            // User is authenticated, route to appropriate page
            this.routeToPage(path);
        } else {
            // User not authenticated, show login
            this.showWelcomePage();
        }
    }

    /**
     * Route to appropriate page based on path
     */
    routeToPage(path) {
        const routes = {
            '/': 'dashboard',
            '/dashboard': 'dashboard',
            '/discussions': 'discussions',
            '/messages': 'messages',
            '/community': 'community',
            '/profile': 'profile',
            '/settings': 'settings'
        };

        const page = routes[path] || 'dashboard';

        // Ensure navigation component is available
        if (window.nexusNavigation && typeof window.nexusNavigation.navigateTo === 'function') {
            nexusNavigation.navigateTo(page);
        } else {
            // Fallback: wait for navigation to be ready
            setTimeout(() => {
                if (window.nexusNavigation) {
                    nexusNavigation.navigateTo(page);
                }
            }, 100);
        }
    }

    /**
     * Show welcome page for unauthenticated users
     */
    showWelcomePage() {
        const template = `
            <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
                <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div class="nexus-animate-fade-in-up">
                        <!-- Hero Icon -->
                        <div class="mb-8">
                            <i class="fas fa-comments text-8xl nexus-gradient-text nexus-animate-float"></i>
                        </div>
                        
                        <!-- Hero Content -->
                        <h1 class="nexus-heading-1 mb-6">
                            Welcome to Forum
                        </h1>
                        <p class="text-xl nexus-text-secondary mb-8 max-w-2xl mx-auto">
                            Connect, discuss, and build meaningful relationships in our modern forum community. 
                            Share ideas, ask questions, and discover new perspectives.
                        </p>
                        
                        <!-- Features Grid -->
                        <div class="grid md:grid-cols-3 gap-8 mb-12">
                            <div class="nexus-card nexus-hover-lift nexus-stagger-1">
                                <div class="nexus-card-body text-center">
                                    <i class="fas fa-users text-3xl nexus-gradient-text mb-4"></i>
                                    <h3 class="nexus-heading-3 mb-2">Connect</h3>
                                    <p class="nexus-text-secondary">
                                        Build meaningful connections with like-minded individuals
                                    </p>
                                </div>
                            </div>
                            
                            <div class="nexus-card nexus-hover-lift nexus-stagger-2">
                                <div class="nexus-card-body text-center">
                                    <i class="fas fa-comments text-3xl nexus-gradient-text mb-4"></i>
                                    <h3 class="nexus-heading-3 mb-2">Discuss</h3>
                                    <p class="nexus-text-secondary">
                                        Engage in thoughtful discussions on topics you care about
                                    </p>
                                </div>
                            </div>
                            
                            <div class="nexus-card nexus-hover-lift nexus-stagger-3">
                                <div class="nexus-card-body text-center">
                                    <i class="fas fa-lightbulb text-3xl nexus-gradient-text mb-4"></i>
                                    <h3 class="nexus-heading-3 mb-2">Discover</h3>
                                    <p class="nexus-text-secondary">
                                        Explore new ideas and expand your knowledge
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- CTA Buttons -->
                        <div class="flex flex-col sm:flex-row gap-4 justify-center">
                            <button 
                                class="nexus-btn nexus-btn-primary nexus-btn-lg"
                                onclick="nexusAuth.showRegisterForm()"
                            >
                                <i class="fas fa-user-plus mr-2"></i>
                                Join Community
                            </button>
                            <button 
                                class="nexus-btn nexus-btn-secondary nexus-btn-lg"
                                onclick="nexusAuth.showLoginForm()"
                            >
                                <i class="fas fa-sign-in-alt mr-2"></i>
                                Sign In
                            </button>
                        </div>
                        
                        <!-- Stats -->
                        <div class="mt-16 grid grid-cols-3 gap-8 max-w-md mx-auto">
                            <div class="text-center">
                                <div class="nexus-heading-2 nexus-gradient-text">1K+</div>
                                <div class="nexus-text-secondary text-sm">Members</div>
                            </div>
                            <div class="text-center">
                                <div class="nexus-heading-2 nexus-gradient-text">5K+</div>
                                <div class="nexus-text-secondary text-sm">Discussions</div>
                            </div>
                            <div class="text-center">
                                <div class="nexus-heading-2 nexus-gradient-text">24/7</div>
                                <div class="nexus-text-secondary text-sm">Active</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.renderToMainContent(template);
    }

    /**
     * Handle user authenticated
     */
    handleUserAuthenticated(user) {
        // Prevent multiple authentication handling
        if (this.authenticationInProgress) {
            return;
        }
        this.authenticationInProgress = true;

        console.log('👤 User authenticated:', user.username);

        // Store user data
        this.currentUser = user;
        this.isAuthenticated = true;

        // Wait for navigation to be ready before proceeding
        this.waitForNavigation(() => {
            // Navigate to dashboard
            if (window.nexusNavigation && typeof window.nexusNavigation.navigateTo === 'function') {
                nexusNavigation.navigateTo('dashboard');
            } else {
                // Fallback: show dashboard directly
                this.renderDashboard();
            }

            // Show welcome notification
            nexusCore.showNotification(`Welcome back, ${user.firstName}!`, 'success');

            // Reset authentication flag
            this.authenticationInProgress = false;
        });
    }

    /**
     * Handle user unauthenticated
     */
    handleUserUnauthenticated() {
        console.log('🔓 User not authenticated');

        // Clear any existing user data
        this.currentUser = null;
        this.isAuthenticated = false;

        // Only show welcome page if we're not already showing it
        if (this.currentPage !== 'welcome') {
            this.currentPage = 'welcome';
            this.showWelcomePage();
        }
    }

    /**
     * Handle user logout
     */
    handleUserLogout() {
        console.log('👋 User logged out');
        this.showWelcomePage();
    }

    /**
     * Handle page change
     */
    handlePageChange(page) {
        this.currentPage = page;
        console.log(`📄 Page changed to: ${page}`);
        
        // Update page-specific content
        switch (page) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'discussions':
                // Handled by discussions component
                break;
            case 'messages':
                this.renderMessages();
                break;
            case 'community':
                this.renderCommunity();
                break;
            case 'profile':
                this.renderProfile();
                break;
            case 'settings':
                this.renderSettings();
                break;
            default:
                this.renderDashboard();
        }
    }

    /**
     * Render dashboard
     */
    renderDashboard() {
        // Set page title with safety check
        if (window.nexusNavigation && typeof window.nexusNavigation.setPageTitle === 'function') {
            nexusNavigation.setPageTitle('Dashboard');
        }
        
        const template = `
            <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pt-20">
                <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div class="mb-8">
                        <h1 class="nexus-heading-1 mb-2">
                            Welcome back, ${nexusCore.currentUser?.firstName || 'User'}!
                        </h1>
                        <p class="nexus-text-secondary">Here's what's happening in your community</p>
                    </div>
                    
                    <!-- Quick Actions -->
                    <div class="grid md:grid-cols-3 gap-6 mb-8">
                        <div class="nexus-card nexus-hover-lift cursor-pointer" onclick="nexusApp.safeNavigate('discussions')">
                            <div class="nexus-card-body text-center">
                                <i class="fas fa-plus-circle text-3xl nexus-gradient-text mb-3"></i>
                                <h3 class="nexus-heading-3 mb-2">Start Discussion</h3>
                                <p class="nexus-text-secondary">Share your thoughts with the community</p>
                            </div>
                        </div>

                        <div class="nexus-card nexus-hover-lift cursor-pointer" onclick="nexusApp.safeNavigate('messages')">
                            <div class="nexus-card-body text-center">
                                <i class="fas fa-envelope text-3xl nexus-gradient-text mb-3"></i>
                                <h3 class="nexus-heading-3 mb-2">Messages</h3>
                                <p class="nexus-text-secondary">Connect with other members</p>
                            </div>
                        </div>

                        <div class="nexus-card nexus-hover-lift cursor-pointer" onclick="nexusApp.safeNavigate('community')">
                            <div class="nexus-card-body text-center">
                                <i class="fas fa-users text-3xl nexus-gradient-text mb-3"></i>
                                <h3 class="nexus-heading-3 mb-2">Community</h3>
                                <p class="nexus-text-secondary">Discover new members</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Recent Activity -->
                    <div class="nexus-card">
                        <div class="nexus-card-header">
                            <h2 class="nexus-heading-3">Recent Activity</h2>
                        </div>
                        <div class="nexus-card-body">
                            <div id="recent-activity-container">
                                <div class="text-center py-8">
                                    <i class="fas fa-spinner fa-spin text-2xl text-gray-400"></i>
                                    <p class="nexus-text-secondary mt-2">Loading recent activity...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.renderToMainContent(template);

        // Load recent activity
        this.loadRecentActivity();
    }

    /**
     * Render placeholder pages
     */
    renderMessages() {
        this.renderPlaceholderPage('Messages', 'envelope', 'Your conversations will appear here');
    }

    renderCommunity() {
        this.renderPlaceholderPage('Community', 'users', 'Discover and connect with community members');
    }

    renderProfile() {
        this.renderPlaceholderPage('Profile', 'user', 'Manage your profile and preferences');
    }

    renderSettings() {
        this.renderPlaceholderPage('Settings', 'cog', 'Customize your experience');
    }

    /**
     * Render placeholder page
     */
    renderPlaceholderPage(title, icon, description) {
        // Set page title with safety check
        if (window.nexusNavigation && typeof window.nexusNavigation.setPageTitle === 'function') {
            nexusNavigation.setPageTitle(title);
        }
        
        const template = `
            <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pt-20">
                <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div class="text-center">
                        <i class="fas fa-${icon} text-6xl nexus-gradient-text mb-6"></i>
                        <h1 class="nexus-heading-1 mb-4">${title}</h1>
                        <p class="nexus-text-secondary text-lg mb-8">${description}</p>
                        <div class="nexus-card max-w-md mx-auto">
                            <div class="nexus-card-body text-center">
                                <i class="fas fa-rocket text-3xl text-gray-300 mb-4"></i>
                                <h3 class="nexus-heading-3 mb-2">Feature Available</h3>
                                <p class="nexus-text-secondary">This feature is ready to use</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.renderToMainContent(template);
    }

    /**
     * Handle search shortcut
     */
    handleSearchShortcut() {
        // Use the navigation search functionality
        if (window.nexusNavigation && typeof window.nexusNavigation.openSearch === 'function') {
            nexusNavigation.openSearch();
        } else {
            nexusCore.showNotification('Search not available', 'error');
        }
    }

    /**
     * Handle responsive changes
     */
    handleResponsiveChange(data) {
        console.log('📱 Responsive change:', data.isMobile ? 'Mobile' : 'Desktop');
    }

    /**
     * Handle browser navigation
     */
    handleBrowserNavigation() {
        const path = window.location.pathname;
        this.routeToPage(path);
    }

    /**
     * Hide loading overlay
     */
    hideLoadingOverlay() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 500);
        }
    }

    /**
     * Load recent activity
     */
    async loadRecentActivity() {
        try {
            const response = await nexusCore.apiRequest('/discussions');

            if (response.ok) {
                const discussions = await response.json();
                this.renderRecentActivity(discussions.slice(0, 5)); // Show last 5 activities
            } else {
                this.renderRecentActivityError();
            }
        } catch (error) {
            console.error('Error loading recent activity:', error);
            this.renderRecentActivityError();
        }
    }

    /**
     * Render recent activity
     */
    renderRecentActivity(activities) {
        const container = document.getElementById('recent-activity-container');
        if (!container) return;

        if (!activities || activities.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-clock text-4xl text-gray-300 mb-4"></i>
                    <p class="nexus-text-secondary">No recent activity yet</p>
                </div>
            `;
            return;
        }

        container.innerHTML = activities.map(activity => `
            <div class="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors duration-200">
                <img
                    src="/static/img/default-avatar.png"
                    alt="${activity.authorFirstName}"
                    class="nexus-avatar nexus-avatar-sm flex-shrink-0"
                    onerror="this.src='/static/img/default-avatar.png'"
                >
                <div class="flex-1 min-w-0">
                    <div class="text-sm">
                        <span class="font-medium">${activity.authorId === nexusCore.currentUser?.id ? 'You' : `${activity.authorFirstName} ${activity.authorLastName}`}</span>
                        <span class="text-gray-500">${activity.authorId === nexusCore.currentUser?.id ? 'posted' : 'posted'} a new discussion</span>
                    </div>
                    <div class="text-sm font-medium text-gray-900 truncate mt-1">
                        ${nexusCore.sanitizeHtml(activity.title)}
                    </div>
                    <div class="text-xs text-gray-500 mt-1">
                        ${nexusCore.formatDate(activity.createdAt)}
                    </div>
                </div>
                <button
                    class="nexus-btn nexus-btn-ghost nexus-btn-sm"
                    onclick="nexusDiscussions.viewDiscussion(${activity.id})"
                >
                    View
                </button>
            </div>
        `).join('');
    }

    /**
     * Render recent activity error
     */
    renderRecentActivityError() {
        const container = document.getElementById('recent-activity-container');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-exclamation-circle text-2xl text-red-400 mb-2"></i>
                    <p class="nexus-text-secondary">Failed to load recent activity</p>
                </div>
            `;
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

    /**
     * Get current page
     */
    getCurrentPage() {
        return this.currentPage;
    }

    /**
     * Check if app is initialized
     */
    isReady() {
        return this.isInitialized;
    }

    /**
     * Safe navigation function for inline handlers
     */
    safeNavigate(page) {
        if (window.nexusNavigation && typeof window.nexusNavigation.navigateTo === 'function') {
            nexusNavigation.navigateTo(page);
        } else {
            console.warn('Navigation not ready, retrying...');
            setTimeout(() => {
                if (window.nexusNavigation) {
                    nexusNavigation.navigateTo(page);
                }
            }, 100);
        }
    }

    /**
     * Wait for navigation component to be ready
     */
    waitForNavigation(callback, maxWait = 5000) {
        const startTime = Date.now();
        const checkNavigation = () => {
            if (window.nexusNavigation && typeof window.nexusNavigation.navigateTo === 'function') {
                callback();
            } else if (Date.now() - startTime < maxWait) {
                setTimeout(checkNavigation, 100);
            } else {
                console.warn('Navigation component not ready after timeout, proceeding anyway');
                callback();
            }
        };
        checkNavigation();
    }

    /**
     * Fallback navigation when main navigation component is not available
     */
    fallbackNavigate(page) {
        console.log(`🔄 Using fallback navigation to: ${page}`);

        // Update current page
        this.currentPage = page;

        // Render the appropriate page directly
        switch (page) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'discussions':
                this.renderPlaceholderPage('Discussions', 'fas fa-comments', 'Share your thoughts with the community');
                break;
            case 'messages':
                this.renderPlaceholderPage('Messages', 'fas fa-envelope', 'Connect with other members');
                break;
            case 'community':
                this.renderPlaceholderPage('Community', 'fas fa-users', 'Discover new members');
                break;
            case 'profile':
                this.renderPlaceholderPage('Profile', 'fas fa-user', 'Manage your profile');
                break;
            case 'settings':
                this.renderPlaceholderPage('Settings', 'fas fa-cog', 'Customize your experience');
                break;
            default:
                this.renderDashboard();
        }

        // Update URL
        const path = page === 'dashboard' ? '/' : `/${page}`;
        history.pushState(null, '', path);

        // Update page title
        document.title = `${page.charAt(0).toUpperCase() + page.slice(1)} - Forum`;
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.nexusApp = new NexusApp();

    // Add global safe navigation function
    window.safeNavigate = (page) => {
        if (window.nexusNavigation && typeof window.nexusNavigation.navigateTo === 'function') {
            nexusNavigation.navigateTo(page);
        } else {
            // Use the app's waitForNavigation method instead of infinite retries
            if (window.nexusApp && typeof window.nexusApp.waitForNavigation === 'function') {
                nexusApp.waitForNavigation(() => {
                    if (window.nexusNavigation) {
                        nexusNavigation.navigateTo(page);
                    } else {
                        console.warn('Navigation component not available, using fallback navigation to:', page);
                        // Fallback: use app's direct navigation
                        nexusApp.fallbackNavigate(page);
                    }
                });
            } else {
                console.error('Navigation system not available, cannot navigate to:', page);
            }
        }
    };
});
