// Search Component
class SearchManager {
    constructor() {
        this.searchInput = null;
        this.searchResults = null;
        this.searchTimeout = null;
        this.currentQuery = '';
        this.isSearching = false;
        this.selectedIndex = -1;
        this.results = [];
        
        this.init();
    }

    init() {
        this.searchInput = document.getElementById('global-search');
        this.searchResults = document.getElementById('search-results');
        
        if (this.searchInput && this.searchResults) {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        // Input events
        this.searchInput.addEventListener('input', (e) => {
            this.handleInput(e.target.value);
        });

        this.searchInput.addEventListener('focus', () => {
            this.showResults();
        });

        this.searchInput.addEventListener('blur', (e) => {
            // Delay hiding to allow clicking on results
            setTimeout(() => {
                if (!this.searchResults.contains(document.activeElement)) {
                    this.hideResults();
                }
            }, 150);
        });

        // Keyboard navigation
        this.searchInput.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });

        // Form submission
        const searchForm = this.searchInput.closest('form');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.performFullSearch();
            });
        }

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.hideResults();
            }
        });
    }

    handleInput(query) {
        this.currentQuery = query.trim();
        
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        if (this.currentQuery.length < 2) {
            this.hideResults();
            return;
        }

        // Debounce search
        this.searchTimeout = setTimeout(() => {
            this.performSearch(this.currentQuery);
        }, 300);
    }

    handleKeydown(e) {
        if (!this.isResultsVisible()) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.navigateResults(1);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.navigateResults(-1);
                break;
            case 'Enter':
                e.preventDefault();
                this.selectResult();
                break;
            case 'Escape':
                this.hideResults();
                this.searchInput.blur();
                break;
        }
    }

    async performSearch(query) {
        if (this.isSearching) return;
        
        this.isSearching = true;
        this.showLoadingState();

        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=10`);
            const data = await response.json();

            if (data.success) {
                this.results = data.data || [];
                this.displayResults();
            } else {
                this.showError('Search failed');
            }
        } catch (error) {
            console.error('Search error:', error);
            this.showError('Search unavailable');
        } finally {
            this.isSearching = false;
        }
    }

    performFullSearch() {
        if (this.currentQuery) {
            // Navigate to full search results page
            window.router.navigate(`/search?q=${encodeURIComponent(this.currentQuery)}`);
            this.hideResults();
        }
    }

    displayResults() {
        if (this.results.length === 0) {
            this.showNoResults();
            return;
        }

        const resultsHTML = this.results.map((result, index) => {
            return this.renderResult(result, index);
        }).join('');

        this.searchResults.innerHTML = `
            <div class="search-results-header">
                <span>Search Results</span>
                <button class="view-all-btn" onclick="window.searchManager.performFullSearch()">
                    View All
                </button>
            </div>
            <div class="search-results-list" role="listbox">
                ${resultsHTML}
            </div>
        `;

        this.showResults();
        this.selectedIndex = -1;
    }

    renderResult(result, index) {
        const type = result.type || 'post';
        const icon = this.getResultIcon(type);
        const excerpt = this.highlightQuery(result.excerpt || result.content || '', this.currentQuery);
        const title = this.highlightQuery(result.title || result.author || '', this.currentQuery);

        return `
            <div class="search-result-item" 
                 role="option" 
                 data-index="${index}"
                 data-url="${result.url || `/post/${result.id}`}"
                 tabindex="-1">
                <div class="result-icon">${icon}</div>
                <div class="result-content">
                    <div class="result-title">${title}</div>
                    <div class="result-excerpt">${excerpt}</div>
                    <div class="result-meta">
                        <span class="result-type">${type}</span>
                        ${result.author ? `<span class="result-author">by ${result.author}</span>` : ''}
                        ${result.createdAt ? `<span class="result-date">${this.formatDate(result.createdAt)}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    getResultIcon(type) {
        const icons = {
            post: '📝',
            comment: '💬',
            user: '👤',
            category: '🏷️'
        };
        return icons[type] || '📄';
    }

    highlightQuery(text, query) {
        if (!query || !text) return text;
        
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    }

    navigateResults(direction) {
        const items = this.searchResults.querySelectorAll('.search-result-item');
        if (items.length === 0) return;

        // Remove current selection
        if (this.selectedIndex >= 0) {
            items[this.selectedIndex].classList.remove('selected');
        }

        // Calculate new index
        this.selectedIndex += direction;
        
        if (this.selectedIndex < 0) {
            this.selectedIndex = items.length - 1;
        } else if (this.selectedIndex >= items.length) {
            this.selectedIndex = 0;
        }

        // Apply new selection
        items[this.selectedIndex].classList.add('selected');
        items[this.selectedIndex].scrollIntoView({ block: 'nearest' });
        
        // Update aria-activedescendant
        this.searchInput.setAttribute('aria-activedescendant', 
            items[this.selectedIndex].id || `result-${this.selectedIndex}`);
    }

    selectResult() {
        const items = this.searchResults.querySelectorAll('.search-result-item');
        if (this.selectedIndex >= 0 && items[this.selectedIndex]) {
            const url = items[this.selectedIndex].dataset.url;
            if (url) {
                window.router.navigate(url);
                this.hideResults();
                this.searchInput.blur();
            }
        }
    }

    showResults() {
        this.searchResults.setAttribute('aria-hidden', 'false');
        this.searchResults.style.display = 'block';
        this.searchInput.setAttribute('aria-expanded', 'true');
    }

    hideResults() {
        this.searchResults.setAttribute('aria-hidden', 'true');
        this.searchResults.style.display = 'none';
        this.searchInput.setAttribute('aria-expanded', 'false');
        this.selectedIndex = -1;
    }

    isResultsVisible() {
        return this.searchResults.style.display === 'block';
    }

    showLoadingState() {
        this.searchResults.innerHTML = `
            <div class="search-loading">
                <div class="loading-spinner"></div>
                <span>Searching...</span>
            </div>
        `;
        this.showResults();
    }

    showNoResults() {
        this.searchResults.innerHTML = `
            <div class="search-no-results">
                <span>No results found for "${this.currentQuery}"</span>
                <button class="view-all-btn" onclick="window.searchManager.performFullSearch()">
                    Search All Content
                </button>
            </div>
        `;
        this.showResults();
    }

    showError(message) {
        this.searchResults.innerHTML = `
            <div class="search-error">
                <span>${message}</span>
            </div>
        `;
        this.showResults();
    }

    // Public method to focus search
    focus() {
        if (this.searchInput) {
            this.searchInput.focus();
        }
    }

    // Public method to clear search
    clear() {
        if (this.searchInput) {
            this.searchInput.value = '';
            this.currentQuery = '';
            this.hideResults();
        }
    }
}

// Initialize search manager
window.searchManager = new SearchManager();

// Export for use in other components
window.SearchManager = SearchManager;
