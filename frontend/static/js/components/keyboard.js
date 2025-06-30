// Keyboard Shortcuts Component
class KeyboardManager {
    constructor() {
        this.shortcuts = new Map();
        this.isHelpVisible = false;
        this.init();
    }

    init() {
        this.registerDefaultShortcuts();
        this.setupEventListeners();
        this.setupHelpDialog();
    }

    registerDefaultShortcuts() {
        // Navigation shortcuts
        this.register('h', 'Go to Home', () => window.router.navigate('/'));
        this.register('p', 'Go to Posts', () => window.router.navigate('/posts'));
        this.register('m', 'Go to Messages', () => window.router.navigate('/messages'));
        this.register('f', 'Go to Friends', () => window.router.navigate('/friends'));
        this.register('n', 'New Post', () => window.router.navigate('/create-post'));
        
        // Search and help
        this.register('/', 'Focus Search', () => {
            if (window.searchManager) {
                window.searchManager.focus();
            }
        });
        this.register('?', 'Show Keyboard Shortcuts', () => this.showHelp());
        
        // Theme and accessibility
        this.register('t', 'Toggle Theme', () => {
            if (window.themeManager) {
                window.themeManager.toggleTheme();
            }
        });
        
        // Modal and dialog controls
        this.register('Escape', 'Close Dialogs', () => this.closeDialogs());
        
        // Quick actions
        this.register('r', 'Refresh Page', () => window.location.reload());
        this.register('g h', 'Go to Home (vim-style)', () => window.router.navigate('/'));
        this.register('g p', 'Go to Posts (vim-style)', () => window.router.navigate('/posts'));
    }

    register(key, description, callback, options = {}) {
        const shortcut = {
            key: key.toLowerCase(),
            description,
            callback,
            ctrlKey: options.ctrlKey || false,
            altKey: options.altKey || false,
            shiftKey: options.shiftKey || false,
            metaKey: options.metaKey || false,
            preventDefault: options.preventDefault !== false
        };
        
        this.shortcuts.set(key.toLowerCase(), shortcut);
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });

        // Setup help dialog close button
        const closeHelpBtn = document.querySelector('#keyboard-help .close-help');
        if (closeHelpBtn) {
            closeHelpBtn.addEventListener('click', () => this.hideHelp());
        }
    }

    setupHelpDialog() {
        const helpDialog = document.getElementById('keyboard-help');
        if (helpDialog) {
            // Make it focusable
            helpDialog.setAttribute('tabindex', '-1');
            
            // Close on escape
            helpDialog.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.hideHelp();
                }
            });
            
            // Close on backdrop click
            helpDialog.addEventListener('click', (e) => {
                if (e.target === helpDialog) {
                    this.hideHelp();
                }
            });
        }
    }

    handleKeydown(e) {
        // Skip if user is typing in an input field
        if (this.isTypingInInput(e.target)) {
            return;
        }

        // Skip if modifiers are pressed (except for registered combinations)
        if (e.ctrlKey || e.metaKey || e.altKey) {
            return;
        }

        const key = e.key.toLowerCase();
        const shortcut = this.shortcuts.get(key);

        if (shortcut) {
            // Check if modifier keys match
            if (shortcut.ctrlKey !== e.ctrlKey ||
                shortcut.altKey !== e.altKey ||
                shortcut.shiftKey !== e.shiftKey ||
                shortcut.metaKey !== e.metaKey) {
                return;
            }

            if (shortcut.preventDefault) {
                e.preventDefault();
            }

            try {
                shortcut.callback(e);
                
                // Announce action to screen readers
                if (window.accessibilityManager) {
                    window.accessibilityManager.announce(shortcut.description);
                }
            } catch (error) {
                console.error('Keyboard shortcut error:', error);
            }
        }
    }

    isTypingInInput(element) {
        const inputTypes = ['input', 'textarea', 'select'];
        const isInput = inputTypes.includes(element.tagName.toLowerCase());
        const isContentEditable = element.contentEditable === 'true';
        const isInModal = element.closest('[role="dialog"]');
        
        return isInput || isContentEditable || isInModal;
    }

    showHelp() {
        const helpDialog = document.getElementById('keyboard-help');
        if (helpDialog) {
            helpDialog.setAttribute('aria-hidden', 'false');
            helpDialog.style.display = 'flex';
            helpDialog.focus();
            this.isHelpVisible = true;
            
            // Update shortcuts display
            this.updateHelpContent();
        }
    }

    hideHelp() {
        const helpDialog = document.getElementById('keyboard-help');
        if (helpDialog) {
            helpDialog.setAttribute('aria-hidden', 'true');
            helpDialog.style.display = 'none';
            this.isHelpVisible = false;
            
            // Return focus to main content
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                mainContent.focus();
            }
        }
    }

    updateHelpContent() {
        const shortcutsGrid = document.querySelector('#keyboard-help .shortcuts-grid');
        if (!shortcutsGrid) return;

        // Clear existing content except for default shortcuts
        const defaultShortcuts = shortcutsGrid.innerHTML;
        
        // Add dynamic shortcuts
        const dynamicShortcuts = Array.from(this.shortcuts.values())
            .filter(shortcut => !this.isDefaultShortcut(shortcut.key))
            .map(shortcut => `
                <div class="shortcut-item">
                    <kbd>${this.formatKey(shortcut.key)}</kbd>
                    <span>${shortcut.description}</span>
                </div>
            `).join('');

        if (dynamicShortcuts) {
            shortcutsGrid.innerHTML = defaultShortcuts + dynamicShortcuts;
        }
    }

    isDefaultShortcut(key) {
        const defaultKeys = ['?', '/', 'n', 'h', 'p', 'm', 'escape'];
        return defaultKeys.includes(key.toLowerCase());
    }

    formatKey(key) {
        const keyMap = {
            'escape': 'Esc',
            'arrowup': '↑',
            'arrowdown': '↓',
            'arrowleft': '←',
            'arrowright': '→',
            ' ': 'Space'
        };
        
        return keyMap[key.toLowerCase()] || key.toUpperCase();
    }

    closeDialogs() {
        // Close help dialog
        if (this.isHelpVisible) {
            this.hideHelp();
            return;
        }

        // Close any open modals
        const modals = document.querySelectorAll('[role="dialog"]:not([aria-hidden="true"])');
        modals.forEach(modal => {
            modal.setAttribute('aria-hidden', 'true');
            modal.style.display = 'none';
        });

        // Close search results
        if (window.searchManager) {
            window.searchManager.hideResults();
        }

        // Close user dropdown
        const userDropdown = document.getElementById('user-dropdown');
        if (userDropdown && userDropdown.getAttribute('aria-hidden') === 'false') {
            userDropdown.setAttribute('aria-hidden', 'true');
            const userBtn = document.getElementById('user-avatar-btn');
            if (userBtn) {
                userBtn.setAttribute('aria-expanded', 'false');
            }
        }
    }

    // Public method to register custom shortcuts
    addShortcut(key, description, callback, options = {}) {
        this.register(key, description, callback, options);
    }

    // Public method to remove shortcuts
    removeShortcut(key) {
        this.shortcuts.delete(key.toLowerCase());
    }

    // Public method to get all shortcuts
    getShortcuts() {
        return Array.from(this.shortcuts.values());
    }

    // Public method to check if help is visible
    isHelpDialogVisible() {
        return this.isHelpVisible;
    }
}

// Initialize keyboard manager
window.keyboardManager = new KeyboardManager();

// Export for use in other components
window.KeyboardManager = KeyboardManager;
