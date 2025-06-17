/**
 * Community Nexus - Core Application Framework
 * Enhanced modern forum experience with comprehensive functionality
 */

class NexusCore {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.eventListeners = new Map();
        this.components = new Map();
        this.config = {
            apiBaseUrl: '/api',
            wsUrl: `ws://${window.location.host}/ws`,
            version: '2.0.0',
            appName: 'Community Nexus'
        };
        
        this.init();
    }

    /**
     * Initialize the core application
     */
    async init() {
        console.log(`🚀 Initializing ${this.config.appName} v${this.config.version}`);
        
        // Setup global error handling
        this.setupErrorHandling();
        
        // Setup event system
        this.setupEventSystem();
        
        // Check authentication status
        await this.checkAuthenticationStatus();
        
        // Initialize router
        this.initializeRouter();
        
        // Setup global utilities
        this.setupUtilities();
        
        console.log('✅ Core initialization complete');
    }

    /**
     * Setup global error handling
     */
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.showNotification('An unexpected error occurred', 'error');
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.showNotification('A network error occurred', 'error');
        });
    }

    /**
     * Setup custom event system
     */
    setupEventSystem() {
        this.eventBus = new EventTarget();
    }

    /**
     * Emit custom event
     */
    emit(eventName, data = null) {
        const event = new CustomEvent(eventName, { detail: data });
        this.eventBus.dispatchEvent(event);
    }

    /**
     * Listen to custom event
     */
    on(eventName, callback) {
        this.eventBus.addEventListener(eventName, callback);
    }

    /**
     * Remove event listener
     */
    off(eventName, callback) {
        this.eventBus.removeEventListener(eventName, callback);
    }

    /**
     * Check user authentication status
     */
    async checkAuthenticationStatus() {
        try {
            const response = await this.apiRequest('/check-session', 'GET');
            if (response.ok) {
                this.currentUser = await response.json();
                this.isAuthenticated = true;
                this.emit('user:authenticated', this.currentUser);
                console.log('✅ User authenticated:', this.currentUser.username);
            } else {
                this.isAuthenticated = false;
                this.emit('user:unauthenticated');
                console.log('ℹ️ User not authenticated');
            }
        } catch (error) {
            console.error('Authentication check failed:', error);
            this.isAuthenticated = false;
            this.emit('user:unauthenticated');
        }
    }

    /**
     * Initialize client-side routing
     */
    initializeRouter() {
        this.router = {
            routes: new Map(),
            currentRoute: null,
            
            add(path, handler) {
                this.routes.set(path, handler);
            },
            
            navigate(path, pushState = true) {
                if (pushState) {
                    history.pushState(null, '', path);
                }
                this.handleRoute(path);
            },
            
            handleRoute(path) {
                const route = this.routes.get(path) || this.routes.get('*');
                if (route) {
                    this.currentRoute = path;
                    route();
                }
            }
        };

        // Handle browser navigation
        window.addEventListener('popstate', () => {
            this.router.handleRoute(window.location.pathname);
        });
    }

    /**
     * Setup global utilities
     */
    setupUtilities() {
        // Add utility methods to window for global access
        window.nexus = this;
        
        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Setup responsive handlers
        this.setupResponsiveHandlers();
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Ctrl/Cmd + K for search
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault();
                this.emit('shortcut:search');
            }
            
            // Escape key for closing modals
            if (event.key === 'Escape') {
                this.emit('shortcut:escape');
            }
        });
    }

    /**
     * Setup responsive handlers
     */
    setupResponsiveHandlers() {
        const mediaQuery = window.matchMedia('(max-width: 768px)');
        
        const handleResponsive = (e) => {
            this.emit('responsive:change', { isMobile: e.matches });
        };
        
        mediaQuery.addListener(handleResponsive);
        handleResponsive(mediaQuery);
    }

    /**
     * Enhanced API request method with better error handling
     */
    async apiRequest(endpoint, method = 'GET', data = null, options = {}) {
        const url = `${this.config.apiBaseUrl}${endpoint}`;
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            credentials: 'include',
            ...options
        };

        if (data && method !== 'GET') {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, config);
            
            // Handle authentication errors
            if (response.status === 401) {
                this.isAuthenticated = false;
                this.currentUser = null;
                this.emit('user:unauthenticated');
            }
            
            return response;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    /**
     * Show notification to user
     */
    showNotification(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `nexus-notification ${type}`;
        notification.innerHTML = `
            <div class="flex items-center gap-3">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
                <button class="nexus-modal-close ml-auto" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Trigger show animation
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, duration);
        }
    }

    /**
     * Get notification icon based on type
     */
    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    /**
     * Format date for display
     */
    formatDate(date, format = 'relative') {
        const d = new Date(date);
        const now = new Date();
        const diff = now - d;
        
        if (format === 'relative') {
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);
            
            if (minutes < 1) return 'Just now';
            if (minutes < 60) return `${minutes}m ago`;
            if (hours < 24) return `${hours}h ago`;
            if (days < 7) return `${days}d ago`;
            
            return d.toLocaleDateString();
        }
        
        return d.toLocaleDateString();
    }

    /**
     * Sanitize HTML content
     */
    sanitizeHtml(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }

    /**
     * Debounce function calls
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function calls
     */
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return 'nexus_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Register component
     */
    registerComponent(name, component) {
        this.components.set(name, component);
        console.log(`📦 Component registered: ${name}`);
    }

    /**
     * Get component
     */
    getComponent(name) {
        return this.components.get(name);
    }

    /**
     * Initialize component
     */
    initComponent(name, ...args) {
        const Component = this.components.get(name);
        if (Component) {
            return new Component(...args);
        }
        console.warn(`Component not found: ${name}`);
        return null;
    }
}

// Initialize core when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.nexusCore = new NexusCore();
});
