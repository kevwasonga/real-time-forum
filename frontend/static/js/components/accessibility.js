// Accessibility Enhancement Component
class AccessibilityManager {
    constructor() {
        this.focusableElements = [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
            '[contenteditable="true"]'
        ].join(', ');
        
        this.init();
    }

    init() {
        this.setupFocusManagement();
        this.setupKeyboardNavigation();
        this.setupScreenReaderSupport();
        this.setupHighContrastMode();
        this.setupReducedMotion();
        this.announcePageChanges();
    }

    setupFocusManagement() {
        // Focus management for modals and dialogs
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                this.handleTabNavigation(e);
            }
        });

        // Focus visible indicators
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });

        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-navigation');
        });
    }

    handleTabNavigation(e) {
        const modal = document.querySelector('[role="dialog"]:not([aria-hidden="true"])');
        if (modal) {
            this.trapFocus(e, modal);
        }
    }

    trapFocus(e, container) {
        const focusableElements = container.querySelectorAll(this.focusableElements);
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }

    setupKeyboardNavigation() {
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Skip if user is typing in an input
            if (e.target.matches('input, textarea, [contenteditable="true"]')) {
                return;
            }

            switch (e.key) {
                case '?':
                    e.preventDefault();
                    this.showKeyboardHelp();
                    break;
                case '/':
                    e.preventDefault();
                    this.focusSearch();
                    break;
                case 'Escape':
                    this.closeModals();
                    break;
                case 'h':
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        window.router.navigate('/');
                    }
                    break;
                case 'p':
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        window.router.navigate('/posts');
                    }
                    break;
                case 'm':
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        window.router.navigate('/messages');
                    }
                    break;
                case 'n':
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        window.router.navigate('/create-post');
                    }
                    break;
            }
        });
    }

    setupScreenReaderSupport() {
        // Live region for announcements
        if (!document.getElementById('sr-announcements')) {
            const announcements = document.createElement('div');
            announcements.id = 'sr-announcements';
            announcements.setAttribute('aria-live', 'polite');
            announcements.setAttribute('aria-atomic', 'true');
            announcements.className = 'sr-only';
            document.body.appendChild(announcements);
        }

        // Update page titles for screen readers
        this.updatePageTitle();
    }

    announce(message, priority = 'polite') {
        const announcements = document.getElementById('sr-announcements');
        if (announcements) {
            announcements.setAttribute('aria-live', priority);
            announcements.textContent = message;
            
            // Clear after announcement
            setTimeout(() => {
                announcements.textContent = '';
            }, 1000);
        }
    }

    updatePageTitle() {
        const observer = new MutationObserver(() => {
            const mainHeading = document.querySelector('h1, [role="heading"][aria-level="1"]');
            if (mainHeading) {
                const pageTitle = mainHeading.textContent.trim();
                if (pageTitle && !document.title.includes(pageTitle)) {
                    document.title = `${pageTitle} - Forum`;
                }
            }
        });

        observer.observe(document.getElementById('main-content'), {
            childList: true,
            subtree: true
        });
    }

    setupHighContrastMode() {
        // Detect high contrast mode preference
        if (window.matchMedia('(prefers-contrast: high)').matches) {
            document.body.classList.add('high-contrast');
        }

        // Listen for changes
        window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
            document.body.classList.toggle('high-contrast', e.matches);
        });
    }

    setupReducedMotion() {
        // Respect reduced motion preference
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.body.classList.add('reduced-motion');
        }

        window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
            document.body.classList.toggle('reduced-motion', e.matches);
        });
    }

    announcePageChanges() {
        // Announce page changes to screen readers
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.target.id === 'main-content') {
                    const newContent = mutation.target.querySelector('h1, [role="heading"][aria-level="1"]');
                    if (newContent) {
                        this.announce(`Navigated to ${newContent.textContent}`);
                    }
                }
            });
        });

        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            observer.observe(mainContent, { childList: true, subtree: true });
        }
    }

    showKeyboardHelp() {
        const helpDialog = document.getElementById('keyboard-help');
        if (helpDialog) {
            helpDialog.setAttribute('aria-hidden', 'false');
            helpDialog.style.display = 'flex';
            
            const firstFocusable = helpDialog.querySelector('button');
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }
    }

    focusSearch() {
        const searchInput = document.getElementById('global-search');
        if (searchInput) {
            searchInput.focus();
        }
    }

    closeModals() {
        // Close all open modals
        const modals = document.querySelectorAll('[role="dialog"]:not([aria-hidden="true"])');
        modals.forEach(modal => {
            modal.setAttribute('aria-hidden', 'true');
            modal.style.display = 'none';
        });

        // Return focus to main content
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.focus();
        }
    }

    // Utility method to make elements more accessible
    enhanceElement(element, options = {}) {
        if (options.label) {
            element.setAttribute('aria-label', options.label);
        }
        
        if (options.describedBy) {
            element.setAttribute('aria-describedby', options.describedBy);
        }
        
        if (options.role) {
            element.setAttribute('role', options.role);
        }
        
        if (options.expanded !== undefined) {
            element.setAttribute('aria-expanded', options.expanded);
        }
        
        if (options.controls) {
            element.setAttribute('aria-controls', options.controls);
        }
    }
}

// Initialize accessibility manager
window.accessibilityManager = new AccessibilityManager();

// Export for use in other components
window.AccessibilityManager = AccessibilityManager;
