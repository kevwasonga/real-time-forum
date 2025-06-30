// Theme Management Component
class ThemeManager {
    constructor() {
        this.currentTheme = this.getStoredTheme() || this.getSystemTheme();
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.setupThemeToggle();
        this.listenForSystemChanges();
        this.updateThemeToggleIcon();
    }

    getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    getStoredTheme() {
        return localStorage.getItem('forum-theme');
    }

    setStoredTheme(theme) {
        localStorage.setItem('forum-theme', theme);
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        document.body.className = document.body.className.replace(/theme-\w+/g, '');
        document.body.classList.add(`theme-${theme}`);
        
        // Update meta theme-color for mobile browsers
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.content = theme === 'dark' ? '#0d1117' : '#ffffff';
        }

        this.currentTheme = theme;
        this.setStoredTheme(theme);
        
        // Announce theme change to screen readers
        if (window.accessibilityManager) {
            window.accessibilityManager.announce(`Switched to ${theme} theme`);
        }
        
        // Dispatch theme change event
        window.dispatchEvent(new CustomEvent('themechange', { 
            detail: { theme } 
        }));
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
        this.updateThemeToggleIcon();
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });

            // Keyboard support
            themeToggle.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.toggleTheme();
                }
            });
        }
    }

    updateThemeToggleIcon() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            const icon = themeToggle.querySelector('.theme-icon');
            if (icon) {
                icon.textContent = this.currentTheme === 'dark' ? '☀️' : '🌙';
            }
            
            themeToggle.setAttribute('aria-label', 
                `Switch to ${this.currentTheme === 'dark' ? 'light' : 'dark'} theme`
            );
            themeToggle.setAttribute('title', 
                `Switch to ${this.currentTheme === 'dark' ? 'light' : 'dark'} theme`
            );
        }
    }

    listenForSystemChanges() {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            // Only auto-switch if user hasn't manually set a preference
            if (!this.getStoredTheme()) {
                this.applyTheme(e.matches ? 'dark' : 'light');
                this.updateThemeToggleIcon();
            }
        });
    }

    // Get current theme
    getCurrentTheme() {
        return this.currentTheme;
    }

    // Set theme programmatically
    setTheme(theme) {
        if (['light', 'dark'].includes(theme)) {
            this.applyTheme(theme);
            this.updateThemeToggleIcon();
        }
    }

    // Reset to system theme
    resetToSystemTheme() {
        localStorage.removeItem('forum-theme');
        const systemTheme = this.getSystemTheme();
        this.applyTheme(systemTheme);
        this.updateThemeToggleIcon();
    }
}

// Initialize theme manager
window.themeManager = new ThemeManager();

// Export for use in other components
window.ThemeManager = ThemeManager;
