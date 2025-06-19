// Posts Page Component
window.PostsPage = {
    async render() {
        window.forumApp.setCurrentPage('posts');

        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="posts-container">
                <div class="posts-header">
                    <h1>Community Posts</h1>
                    <div class="posts-actions">
                        ${window.auth.isLoggedIn() ? 
                            '<a href="/create-post" data-route="/create-post" class="btn btn-primary">Create Post</a>' : 
                            '<a href="/login" data-route="/login" class="btn btn-primary">Login to Post</a>'
                        }
                    </div>
                </div>
                
                <div class="posts-filters">
                    <div class="filter-group">
                        <label for="category-filter">Filter by Category:</label>
                        <select id="category-filter">
                            <option value="">All Categories</option>
                        </select>
                    </div>
                </div>
                
                <div id="posts-list" class="posts-list">
                    <div class="loading-placeholder">Loading posts...</div>
                </div>
            </div>
        `;

        await this.loadCategories();
        await this.loadPosts();
        this.bindEvents();
    },

    bindEvents() {
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                this.loadPosts(categoryFilter.value);
            });
        }
    },

    async loadCategories() {
        try {
            const response = await window.api.getCategories();
            if (response.success) {
                this.renderCategories(response.data || []);
            }
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    },

    renderCategories(categories) {
        const categoryFilter = document.getElementById('category-filter');
        if (!categoryFilter) return;

        // Keep the "All Categories" option and add others
        const currentValue = categoryFilter.value;
        categoryFilter.innerHTML = '<option value="">All Categories</option>';

        // Add predefined categories
        const predefinedCategories = [
            'General', 'Technology', 'Sports', 'Entertainment', 'Gaming',
            'Music', 'Movies', 'Food', 'Travel', 'Health', 'Education', 'Science'
        ];

        predefinedCategories.forEach(categoryName => {
            const category = categories.find(c => c.name === categoryName);
            const option = document.createElement('option');
            option.value = categoryName;
            option.textContent = category ? `${categoryName} (${category.postCount})` : categoryName;
            categoryFilter.appendChild(option);
        });

        // Add any other categories that exist in the database but aren't in predefined list
        categories.forEach(category => {
            if (!predefinedCategories.includes(category.name)) {
                const option = document.createElement('option');
                option.value = category.name;
                option.textContent = `${category.name} (${category.postCount})`;
                categoryFilter.appendChild(option);
            }
        });

        categoryFilter.value = currentValue;
    },

    async loadPosts(category = '') {
        try {
            const params = category ? { category } : {};
            const response = await window.api.getPosts(params);
            if (response.success) {
                this.renderPosts(response.data || []);
            }
        } catch (error) {
            console.error('Failed to load posts:', error);
            const container = document.getElementById('posts-list');
            if (container) {
                container.innerHTML = '<div class="error-message">Failed to load posts</div>';
            }
        }
    },

    renderPosts(posts) {
        const container = document.getElementById('posts-list');
        if (!container) return;

        if (posts.length === 0) {
            container.innerHTML = '<div class="no-posts">No posts found. Be the first to create one!</div>';
            return;
        }

        container.innerHTML = posts.map(post => `
            <article class="post-card">
                <div class="post-header">
                    <div class="post-author">
                        <img src="${post.authorAvatar || '/static/images/default-avatar.png'}" 
                             alt="${window.utils.escapeHtml(post.author)}'s avatar" 
                             class="author-avatar">
                        <div class="author-info">
                            <span class="author-name">${window.utils.escapeHtml(post.author)}</span>
                            <span class="post-date">${window.utils.formatDate(post.createdAt)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="post-content">
                    <h2 class="post-title">
                        <a href="/post/${post.id}" data-route="/post/${post.id}">
                            ${window.utils.escapeHtml(post.title)}
                        </a>
                    </h2>
                    
                    <div class="post-excerpt">
                        ${window.utils.escapeHtml(post.content.substring(0, 200))}${post.content.length > 200 ? '...' : ''}
                    </div>
                    
                    ${post.categories.length > 0 ? `
                        <div class="post-categories">
                            ${post.categories.map(cat => `<span class="category-tag">${window.utils.escapeHtml(cat)}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
                
                <div class="post-footer">
                    <div class="post-stats">
                        <button class="stat-btn like-btn ${post.userLiked ? 'active' : ''}" 
                                data-post-id="${post.id}" data-action="like">
                            👍 ${post.likeCount}
                        </button>
                        <button class="stat-btn dislike-btn ${post.userDisliked ? 'active' : ''}" 
                                data-post-id="${post.id}" data-action="dislike">
                            👎 ${post.dislikeCount}
                        </button>
                        <span class="stat-item">💬 ${post.commentCount}</span>
                    </div>
                    
                    <a href="/post/${post.id}" data-route="/post/${post.id}" class="read-more-btn">
                        Read More
                    </a>
                </div>
            </article>
        `).join('');

        // Bind like/dislike events
        this.bindPostEvents();
    },

    bindPostEvents() {
        const likeButtons = document.querySelectorAll('.like-btn, .dislike-btn');
        likeButtons.forEach(button => {
            button.addEventListener('click', this.handleLikeDislike.bind(this));
        });
    },

    async handleLikeDislike(event) {
        if (!window.auth.isLoggedIn()) {
            if (window.forumApp.notificationComponent) {
                window.forumApp.notificationComponent.warning('Please log in to like posts');
            }
            return;
        }

        const button = event.target;
        const postId = parseInt(button.dataset.postId);
        const isLike = button.dataset.action === 'like';

        try {
            const response = await window.api.likePost(postId, isLike);

            if (response.success && response.data) {
                // Update the UI with new counts
                const postCard = button.closest('.post-card');
                const likeBtn = postCard.querySelector('.like-btn');
                const dislikeBtn = postCard.querySelector('.dislike-btn');

                if (likeBtn) {
                    likeBtn.innerHTML = `👍 ${response.data.likeCount}`;
                    likeBtn.classList.toggle('active', isLike);
                }
                if (dislikeBtn) {
                    dislikeBtn.innerHTML = `👎 ${response.data.dislikeCount}`;
                    dislikeBtn.classList.toggle('active', !isLike);
                }
            }

        } catch (error) {
            console.error('Failed to like/dislike post:', error);
            if (window.forumApp.notificationComponent) {
                window.forumApp.notificationComponent.error('Failed to update like status');
            }
        }
    }
};
