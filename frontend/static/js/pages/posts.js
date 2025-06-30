// Posts Page Component
window.PostsPage = {
    async render(options = {}) {
        window.forumApp.setCurrentPage('posts');

        // Store options for later use
        this.highlightPostId = options.highlightPost;
        this.scrollToPostId = options.scrollToPost;

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

        // Handle post highlighting and scrolling
        if (this.highlightPostId || this.scrollToPostId) {
            setTimeout(() => {
                this.handlePostNavigation();
            }, 500); // Wait for posts to render
        }
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
                        <button class="stat-btn comment-toggle-btn"
                                data-post-id="${post.id}"
                                title="Toggle comments">
                            💬 ${post.commentCount}
                        </button>
                        <button class="stat-btn share-btn"
                                data-post-id="${post.id}"
                                title="Share post">
                            🔗 Share
                        </button>
                    </div>

                </div>
            </article>

            <!-- Comments section as separate container -->
            <div class="post-comments-container" id="comments-container-${post.id}">
                <div class="comments-section" id="comments-${post.id}" style="display: none;">
                    <div class="comments-loading">Loading comments...</div>
                </div>
            </div>
        `).join('');

        // Bind like/dislike events
        this.bindPostEvents();
    },

    bindPostEvents() {
        const likeButtons = document.querySelectorAll('.like-btn, .dislike-btn');
        likeButtons.forEach(button => {
            button.addEventListener('click', this.handleLikeDislike.bind(this));
        });

        // Bind comment toggle buttons
        const commentToggleButtons = document.querySelectorAll('.comment-toggle-btn');
        commentToggleButtons.forEach(button => {
            button.addEventListener('click', this.handleCommentToggle.bind(this));
        });

        // Bind share buttons
        const shareButtons = document.querySelectorAll('.share-btn');
        shareButtons.forEach(button => {
            button.addEventListener('click', this.handleShare.bind(this));
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
    },

    async handleCommentToggle(event) {
        event.preventDefault();
        event.stopPropagation();

        const button = event.currentTarget;
        const postId = button.dataset.postId;
        const commentsSection = document.getElementById(`comments-${postId}`);

        if (!commentsSection) {
            console.error('Comments section not found for post:', postId);
            return;
        }

        // Toggle visibility
        const isVisible = commentsSection.style.display !== 'none';

        if (isVisible) {
            // Hide comments with animation
            commentsSection.style.opacity = '0';
            commentsSection.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                commentsSection.style.display = 'none';
            }, 200);
            button.classList.remove('active');
        } else {
            // Show comments and load them if not already loaded
            commentsSection.style.display = 'block';
            commentsSection.style.opacity = '0';
            commentsSection.style.transform = 'translateY(-10px)';
            button.classList.add('active');

            // Load comments if not already loaded
            if (!commentsSection.dataset.loaded) {
                await this.loadCommentsForPost(postId);
                commentsSection.dataset.loaded = 'true';
            }

            // Animate in
            setTimeout(() => {
                commentsSection.style.opacity = '1';
                commentsSection.style.transform = 'translateY(0)';

                // Smooth scroll to comments section
                commentsSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest'
                });
            }, 50);
        }
    },

    async loadCommentsForPost(postId, sortBy = null) {
        const commentsSection = document.getElementById(`comments-${postId}`);
        if (!commentsSection) return;

        try {
            console.log('🔄 Loading comments for post:', postId);

            // Show loading state
            commentsSection.innerHTML = '<div class="comments-loading">Loading comments...</div>';

            // Use stored preference if no sort specified
            if (!sortBy) {
                sortBy = localStorage.getItem('comment-sort-preference') || 'newest';
            }

            // Fetch comments from API
            const response = await window.api.getComments(postId, sortBy);
            console.log('📡 Comments API response:', response);
            console.log('📡 Response success:', response.success);
            console.log('📡 Response data:', response.data);
            console.log('📡 Response data type:', typeof response.data);
            console.log('📡 Response data is array:', Array.isArray(response.data));

            if (response.success) {
                // Handle both cases: response.data exists or is null/undefined
                const comments = response.data || [];
                console.log('✅ Loaded comments:', comments);
                console.log('✅ Comments length:', comments.length);

                if (comments.length === 0) {
                    commentsSection.innerHTML = `
                        <div class="no-comments">
                            <p>No comments yet. Be the first to comment!</p>
                        </div>
                        ${this.renderCommentForm(postId)}
                    `;
                } else {
                    commentsSection.innerHTML = `
                        <div class="comments-header">
                            <h4>Comments (${comments.length})</h4>
                        </div>
                        <div class="comments-header">
                            <h3>Comments (${comments.length})</h3>
                            <div class="comments-controls">
                                <button class="btn btn-sm expand-all-btn" onclick="window.postsPage.expandAllThreads()">
                                    📖 Expand All
                                </button>
                                <button class="btn btn-sm collapse-all-btn" onclick="window.postsPage.collapseAllThreads()">
                                    📕 Collapse All
                                </button>
                                <select class="comment-sort-select" onchange="window.postsPage.sortComments(this.value)">
                                    <option value="newest">Newest First</option>
                                    <option value="oldest">Oldest First</option>
                                    <option value="most-liked">Most Liked</option>
                                    <option value="most-replies">Most Replies</option>
                                </select>
                            </div>
                        </div>
                        <div class="comments-list">
                            ${this.renderCommentsTree(comments)}
                        </div>
                        ${this.renderCommentForm(postId)}
                    `;
                }

                // Bind comment form events after rendering
                this.bindCommentFormEvents();

                // Add thread controls for collapse/expand
                setTimeout(() => this.addThreadControls(), 100);
            } else {
                console.error('❌ API response failed:', response);
                // Even on API failure, show the comment form for posts that exist
                commentsSection.innerHTML = `
                    <div class="comments-error">
                        <p>Unable to load comments at the moment.</p>
                    </div>
                    ${this.renderCommentForm(postId)}
                `;
                this.bindCommentFormEvents();
            }
        } catch (error) {
            console.error('❌ Failed to load comments:', error);
            // Show error but still provide comment form
            commentsSection.innerHTML = `
                <div class="comments-error">
                    <p>Unable to load comments at the moment.</p>
                </div>
                ${this.renderCommentForm(postId)}
            `;
            this.bindCommentFormEvents();
        }
    },

    renderCommentsTree(comments) {
        // Organize comments into a tree structure
        const commentMap = new Map();
        const rootComments = [];

        // First pass: create a map of all comments
        comments.forEach(comment => {
            comment.replies = [];
            commentMap.set(comment.id, comment);
        });

        // Second pass: organize into tree structure
        comments.forEach(comment => {
            if (comment.parentId) {
                const parent = commentMap.get(comment.parentId);
                if (parent) {
                    parent.replies.push(comment);
                } else {
                    // Parent not found, treat as root comment
                    rootComments.push(comment);
                }
            } else {
                rootComments.push(comment);
            }
        });

        // Render the tree
        return rootComments.map(comment => this.renderComment(comment)).join('');
    },

    renderComment(comment, depth = 0) {
        const timeAgo = window.utils.formatDate(comment.createdAt);
        const isOwnComment = window.forumApp.currentUser && comment.userId === window.forumApp.currentUser.id;
        const maxDepth = 3; // Limit nesting depth to prevent excessive indentation
        const actualDepth = Math.min(depth, maxDepth);
        const indentClass = actualDepth > 0 ? `comment-reply comment-depth-${actualDepth}` : '';

        // Generate thread arrows for visual hierarchy
        const threadArrows = this.generateThreadArrows(depth);

        let repliesHtml = '';
        if (comment.replies && comment.replies.length > 0) {
            repliesHtml = `
                <div class="comment-replies">
                    ${comment.replies.map(reply => this.renderComment(reply, depth + 1)).join('')}
                </div>
            `;
        }

        return `
            <div class="comment-item ${indentClass}" data-comment-id="${comment.id}" data-depth="${depth}">
                ${threadArrows}
                <div class="comment-content-wrapper">
                    <div class="comment-header">
                        <img src="${comment.authorAvatar || '/static/images/default-avatar.png'}"
                             alt="${window.utils.escapeHtml(comment.author)}'s avatar"
                             class="comment-avatar">
                        <div class="comment-meta">
                            <span class="comment-author">${window.utils.escapeHtml(comment.author)}</span>
                            <span class="comment-time">${timeAgo}</span>
                            ${comment.parentId ? '<span class="reply-indicator">↳ Reply</span>' : ''}
                        </div>
                    </div>
                    <div class="comment-content" data-original-content="${window.utils.escapeHtml(comment.content)}">
                        ${window.utils.escapeHtml(comment.content)}
                    </div>
                    <div class="comment-actions">
                        <button class="comment-action-btn like-comment-btn ${comment.userLiked ? 'active' : ''}"
                                data-comment-id="${comment.id}" data-action="like">
                            👍 ${comment.likeCount || 0}
                        </button>
                        <button class="comment-action-btn dislike-comment-btn ${comment.userDisliked ? 'active' : ''}"
                                data-comment-id="${comment.id}" data-action="dislike">
                            👎 ${comment.dislikeCount || 0}
                        </button>
                        ${window.forumApp.currentUser && depth < maxDepth ? `
                            <button class="comment-action-btn reply-comment-btn"
                                    data-comment-id="${comment.id}" data-post-id="${comment.postId}">
                                💬 Reply
                            </button>
                        ` : ''}
                        ${isOwnComment ? `
                            <button class="comment-action-btn edit-comment-btn"
                                    data-comment-id="${comment.id}">
                                ✏️ Edit
                            </button>
                            <button class="comment-action-btn delete-comment-btn"
                                    data-comment-id="${comment.id}">
                                🗑️ Delete
                            </button>
                        ` : ''}
                    </div>
                    <div class="reply-form-container" id="reply-form-${comment.id}" style="display: none;"></div>
                </div>
                ${repliesHtml}
            </div>
        `;
    },

    generateThreadArrows(depth) {
        if (depth === 0) return '';

        let arrows = '<div class="thread-arrows">';

        // Generate connecting lines and arrows for each level
        for (let i = 0; i < depth; i++) {
            if (i === depth - 1) {
                // Last arrow - points to current comment
                arrows += '<div class="thread-arrow thread-arrow-current" title="Reply to parent comment">└─</div>';
            } else {
                // Intermediate arrows - vertical lines for parent threads
                arrows += '<div class="thread-arrow thread-arrow-parent" title="Thread continuation">│</div>';
            }
        }

        arrows += '</div>';
        return arrows;
    },

    // Add thread collapse/expand functionality
    addThreadControls() {
        // Add collapse/expand buttons to comments with replies
        const commentsWithReplies = document.querySelectorAll('.comment-item:has(.comment-replies)');

        commentsWithReplies.forEach(comment => {
            const header = comment.querySelector('.comment-header');
            if (header && !header.querySelector('.thread-toggle')) {
                const replyCount = comment.querySelectorAll('.comment-replies .comment-item').length;
                const toggleBtn = document.createElement('button');
                toggleBtn.className = 'thread-toggle';
                toggleBtn.innerHTML = `<span class="toggle-icon">▼</span> <span class="reply-count">${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}</span>`;
                toggleBtn.setAttribute('aria-label', `Toggle ${replyCount} replies`);
                toggleBtn.setAttribute('title', 'Click to collapse/expand replies');

                toggleBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleThread(comment);
                });

                header.appendChild(toggleBtn);
            }
        });

        // Add thread highlighting functionality
        this.addThreadHighlighting();
    },

    addThreadHighlighting() {
        const allComments = document.querySelectorAll('.comment-item');

        allComments.forEach(comment => {
            comment.addEventListener('mouseenter', () => {
                this.highlightThread(comment);
            });

            comment.addEventListener('mouseleave', () => {
                this.clearThreadHighlight();
            });
        });
    },

    highlightThread(commentElement) {
        // Clear any existing highlights
        this.clearThreadHighlight();

        // Get the depth
        const depth = parseInt(commentElement.dataset.depth);

        // Highlight the current comment
        commentElement.classList.add('thread-highlighted');

        // Highlight parent thread (if this is a reply)
        if (depth > 0) {
            let currentElement = commentElement;
            let currentDepth = depth;

            // Walk up the DOM to find parent comments
            while (currentDepth > 0 && currentElement) {
                currentElement = currentElement.parentElement.closest('.comment-item');
                if (currentElement) {
                    const parentDepth = parseInt(currentElement.dataset.depth);
                    if (parentDepth < currentDepth) {
                        currentElement.classList.add('thread-highlighted-parent');
                        currentDepth = parentDepth;
                    }
                }
            }
        }

        // Highlight all child replies
        const childReplies = commentElement.querySelectorAll('.comment-item');
        childReplies.forEach(child => {
            child.classList.add('thread-highlighted-child');
        });
    },

    clearThreadHighlight() {
        const highlightedElements = document.querySelectorAll('.thread-highlighted, .thread-highlighted-parent, .thread-highlighted-child');
        highlightedElements.forEach(element => {
            element.classList.remove('thread-highlighted', 'thread-highlighted-parent', 'thread-highlighted-child');
        });
    },

    expandAllThreads() {
        const collapsedThreads = document.querySelectorAll('.thread-collapsed');
        collapsedThreads.forEach(thread => {
            this.toggleThread(thread);
        });

        if (window.forumApp.notificationComponent) {
            window.forumApp.notificationComponent.success('All threads expanded');
        }
    },

    collapseAllThreads() {
        const expandedThreads = document.querySelectorAll('.comment-item:has(.comment-replies):not(.thread-collapsed)');
        expandedThreads.forEach(thread => {
            this.toggleThread(thread);
        });

        if (window.forumApp.notificationComponent) {
            window.forumApp.notificationComponent.success('All threads collapsed');
        }
    },

    sortComments(sortBy) {
        const postId = this.getCurrentPostId();
        if (!postId) return;

        // Store current sort preference
        localStorage.setItem('comment-sort-preference', sortBy);

        // Reload comments with new sorting
        this.loadComments(postId, sortBy);

        if (window.forumApp.notificationComponent) {
            const sortLabels = {
                'newest': 'Newest First',
                'oldest': 'Oldest First',
                'most-liked': 'Most Liked',
                'most-replies': 'Most Replies'
            };
            window.forumApp.notificationComponent.success(`Comments sorted by: ${sortLabels[sortBy]}`);
        }
    },

    getCurrentPostId() {
        const postElement = document.querySelector('.post-detail');
        return postElement ? parseInt(postElement.dataset.postId) : null;
    },

    toggleThread(commentElement) {
        const repliesContainer = commentElement.querySelector('.comment-replies');
        const toggleBtn = commentElement.querySelector('.thread-toggle');
        const toggleIcon = toggleBtn.querySelector('.toggle-icon');

        if (repliesContainer) {
            const isCollapsed = repliesContainer.style.display === 'none';

            if (isCollapsed) {
                // Expand
                repliesContainer.style.display = 'block';
                toggleIcon.textContent = '▼';
                toggleBtn.setAttribute('aria-label', 'Collapse replies');
                commentElement.classList.remove('thread-collapsed');
            } else {
                // Collapse
                repliesContainer.style.display = 'none';
                toggleIcon.textContent = '▶';
                toggleBtn.setAttribute('aria-label', 'Expand replies');
                commentElement.classList.add('thread-collapsed');
            }
        }
    },

    renderCommentForm(postId) {
        // Check if user is logged in
        if (!window.forumApp.currentUser) {
            return `
                <div class="comment-form-container">
                    <div class="login-prompt">
                        <p>Please <a href="/login" data-route="/login">login</a> to add a comment.</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="comment-form-container">
                <form class="comment-form" data-post-id="${postId}">
                    <div class="comment-input-group">
                        <img src="${window.forumApp.currentUser.avatarUrl || '/static/images/default-avatar.png'}"
                             alt=""
                             class="comment-form-avatar">
                        <textarea
                            class="comment-textarea"
                            placeholder="Write a comment..."
                            rows="2"
                            maxlength="500"
                            required></textarea>
                    </div>
                    <div class="comment-form-actions">
                        <span class="comment-char-count">0/500</span>
                        <button type="submit" class="btn btn-primary btn-sm">Post Comment</button>
                    </div>
                </form>
            </div>
        `;
    },

    async handleCommentSubmit(event) {
        event.preventDefault();

        const form = event.target;
        const postId = form.dataset.postId;
        const textarea = form.querySelector('.comment-textarea');
        const submitBtn = form.querySelector('button[type="submit"]');
        const content = textarea.value.trim();

        if (!content) {
            if (window.forumApp.notificationComponent) {
                window.forumApp.notificationComponent.error('Please enter a comment');
            }
            return;
        }

        try {
            // Show loading state
            window.utils.setLoading(submitBtn, true, 'Posting...');
            textarea.disabled = true;

            // Submit comment
            const response = await window.api.createComment({
                postId: parseInt(postId),
                content: content
            });

            if (response.success) {
                // Clear form
                textarea.value = '';

                // Update comment count in the toggle button BEFORE reloading comments
                const toggleBtn = document.querySelector(`[data-post-id="${postId}"].comment-toggle-btn`);
                if (toggleBtn) {
                    const currentCount = parseInt(toggleBtn.textContent.match(/\d+/)[0]) || 0;
                    const newCount = currentCount + 1;
                    toggleBtn.innerHTML = `💬 ${newCount}`;
                    console.log(`📊 Updated comment count from ${currentCount} to ${newCount} for post ${postId}`);
                } else {
                    console.log(`❌ Could not find toggle button for post ${postId}`);
                }

                // Reload comments to show the new comment
                await this.loadCommentsForPost(postId);

                if (window.forumApp.notificationComponent) {
                    window.forumApp.notificationComponent.success('Comment posted successfully!');
                }
            } else {
                throw new Error(response.message || 'Failed to post comment');
            }
        } catch (error) {
            console.error('Failed to post comment:', error);
            if (window.forumApp.notificationComponent) {
                window.forumApp.notificationComponent.error(error.message || 'Failed to post comment');
            }
        } finally {
            // Reset loading state
            window.utils.setLoading(submitBtn, false);
            textarea.disabled = false;
            textarea.focus();
        }
    },



    bindCommentFormEvents() {
        // Bind comment form submissions
        const commentForms = document.querySelectorAll('.comment-form');
        commentForms.forEach(form => {
            form.addEventListener('submit', this.handleCommentSubmit.bind(this));
        });

        // Auto-resize textarea
        const textareas = document.querySelectorAll('.comment-textarea');
        textareas.forEach(textarea => {
            textarea.addEventListener('input', () => {
                textarea.style.height = 'auto';
                textarea.style.height = Math.min(textarea.scrollHeight, 80) + 'px';
            });
        });

        // Bind comment action buttons
        this.bindCommentActions();
    },

    bindCommentActions() {
        // Like/Dislike buttons
        const likeDislikeButtons = document.querySelectorAll('.like-comment-btn, .dislike-comment-btn');
        likeDislikeButtons.forEach(button => {
            button.addEventListener('click', this.handleCommentLikeDislike.bind(this));
        });

        // Edit buttons
        const editButtons = document.querySelectorAll('.edit-comment-btn');
        editButtons.forEach(button => {
            button.addEventListener('click', this.handleCommentEdit.bind(this));
        });

        // Delete buttons
        const deleteButtons = document.querySelectorAll('.delete-comment-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', this.handleCommentDelete.bind(this));
        });

        // Reply buttons
        const replyButtons = document.querySelectorAll('.reply-comment-btn');
        replyButtons.forEach(button => {
            button.addEventListener('click', this.handleCommentReply.bind(this));
        });
    },

    async handleCommentLikeDislike(event) {
        event.preventDefault();
        event.stopPropagation();

        const button = event.currentTarget;
        const commentId = button.dataset.commentId;
        const action = button.dataset.action;
        const isLike = action === 'like';

        if (!window.forumApp.currentUser) {
            if (window.forumApp.notificationComponent) {
                window.forumApp.notificationComponent.error('Please login to like comments');
            }
            return;
        }

        // Get the comment item and both buttons
        const commentItem = button.closest('.comment-item');
        const likeBtn = commentItem.querySelector('.like-comment-btn');
        const dislikeBtn = commentItem.querySelector('.dislike-comment-btn');

        // Store original states in case we need to revert
        const originalLikeActive = likeBtn.classList.contains('active');
        const originalDislikeActive = dislikeBtn.classList.contains('active');
        const originalLikeCount = parseInt(likeBtn.textContent.match(/\d+/)[0]) || 0;
        const originalDislikeCount = parseInt(dislikeBtn.textContent.match(/\d+/)[0]) || 0;

        try {
            // Optimistically update UI
            if (isLike) {
                // Clicking like
                if (originalLikeActive) {
                    // Unlike
                    likeBtn.classList.remove('active');
                    likeBtn.innerHTML = `👍 ${Math.max(0, originalLikeCount - 1)}`;
                } else {
                    // Like (and remove dislike if active)
                    likeBtn.classList.add('active');
                    likeBtn.innerHTML = `👍 ${originalLikeCount + 1}`;
                    if (originalDislikeActive) {
                        dislikeBtn.classList.remove('active');
                        dislikeBtn.innerHTML = `👎 ${Math.max(0, originalDislikeCount - 1)}`;
                    }
                }
            } else {
                // Clicking dislike
                if (originalDislikeActive) {
                    // Un-dislike
                    dislikeBtn.classList.remove('active');
                    dislikeBtn.innerHTML = `👎 ${Math.max(0, originalDislikeCount - 1)}`;
                } else {
                    // Dislike (and remove like if active)
                    dislikeBtn.classList.add('active');
                    dislikeBtn.innerHTML = `👎 ${originalDislikeCount + 1}`;
                    if (originalLikeActive) {
                        likeBtn.classList.remove('active');
                        likeBtn.innerHTML = `👍 ${Math.max(0, originalLikeCount - 1)}`;
                    }
                }
            }

            console.log('🔄 Liking comment:', commentId, 'isLike:', isLike);

            const response = await window.api.likeComment(parseInt(commentId), isLike);
            console.log('📡 Like response:', response);

            if (response.success && response.data) {
                // Update with actual counts from server
                likeBtn.innerHTML = `👍 ${response.data.likeCount || 0}`;
                dislikeBtn.innerHTML = `👎 ${response.data.dislikeCount || 0}`;
            } else if (!response.success) {
                throw new Error(response.message || 'Failed to update like status');
            }
        } catch (error) {
            console.error('Failed to like/dislike comment:', error);

            // Revert UI changes on error
            likeBtn.classList.toggle('active', originalLikeActive);
            dislikeBtn.classList.toggle('active', originalDislikeActive);
            likeBtn.innerHTML = `👍 ${originalLikeCount}`;
            dislikeBtn.innerHTML = `👎 ${originalDislikeCount}`;

            if (window.forumApp.notificationComponent) {
                window.forumApp.notificationComponent.error('Failed to update like status');
            }
        }
    },

    handleCommentEdit(event) {
        event.preventDefault();
        event.stopPropagation();

        const button = event.currentTarget;
        const commentId = button.dataset.commentId;
        const commentItem = button.closest('.comment-item');
        const contentDiv = commentItem.querySelector('.comment-content');
        const originalContent = contentDiv.dataset.originalContent;

        // Replace content with textarea
        contentDiv.innerHTML = `
            <div class="edit-comment-form">
                <textarea class="edit-comment-textarea" maxlength="500">${originalContent}</textarea>
                <div class="edit-comment-actions">
                    <button class="btn btn-primary btn-sm save-edit-btn" data-comment-id="${commentId}">Save</button>
                    <button class="btn btn-secondary btn-sm cancel-edit-btn">Cancel</button>
                </div>
            </div>
        `;

        // Bind save and cancel events
        const saveBtn = contentDiv.querySelector('.save-edit-btn');
        const cancelBtn = contentDiv.querySelector('.cancel-edit-btn');
        const textarea = contentDiv.querySelector('.edit-comment-textarea');

        // Auto-resize textarea
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        textarea.focus();

        saveBtn.addEventListener('click', () => this.saveCommentEdit(commentId, textarea.value, contentDiv, originalContent));
        cancelBtn.addEventListener('click', () => this.cancelCommentEdit(contentDiv, originalContent));

        // Auto-resize on input
        textarea.addEventListener('input', () => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        });
    },

    async saveCommentEdit(commentId, newContent, contentDiv, originalContent) {
        if (!newContent.trim()) {
            if (window.forumApp.notificationComponent) {
                window.forumApp.notificationComponent.error('Comment cannot be empty');
            }
            return;
        }

        try {
            console.log('🔄 Updating comment:', commentId, 'content:', newContent.trim());

            const response = await window.api.updateComment(commentId, { content: newContent.trim() });
            console.log('📡 Update response:', response);

            if (response.success) {
                // Update content and original content
                contentDiv.innerHTML = window.utils.escapeHtml(newContent.trim());
                contentDiv.dataset.originalContent = newContent.trim();

                if (window.forumApp.notificationComponent) {
                    window.forumApp.notificationComponent.success('Comment updated successfully');
                }
            } else {
                throw new Error(response.message || 'Failed to update comment');
            }
        } catch (error) {
            console.error('Failed to update comment:', error);
            if (window.forumApp.notificationComponent) {
                window.forumApp.notificationComponent.error(error.message || 'Failed to update comment');
            }
            // Restore original content on error
            this.cancelCommentEdit(contentDiv, originalContent);
        }
    },

    cancelCommentEdit(contentDiv, originalContent) {
        contentDiv.innerHTML = window.utils.escapeHtml(originalContent);
    },

    async handleCommentDelete(event) {
        event.preventDefault();
        event.stopPropagation();

        const button = event.currentTarget;
        const commentId = button.dataset.commentId;

        if (!confirm('Are you sure you want to delete this comment?')) {
            return;
        }

        try {
            console.log('🔄 Deleting comment:', commentId);

            const response = await window.api.deleteComment(commentId);
            console.log('📡 Delete response:', response);

            if (response.success) {
                // Get post ID before removing comment
                const commentItem = button.closest('.comment-item');
                const commentsContainer = commentItem.closest('.post-comments-container');
                const postId = commentsContainer.id.replace('comments-container-', '');

                // Remove comment from DOM
                commentItem.remove();

                // Update comment count in toggle button
                const toggleBtn = document.querySelector(`[data-post-id="${postId}"].comment-toggle-btn`);
                if (toggleBtn) {
                    const currentCount = parseInt(toggleBtn.textContent.match(/\d+/)[0]) || 0;
                    const newCount = Math.max(0, currentCount - 1);
                    toggleBtn.innerHTML = `💬 ${newCount}`;
                    console.log(`📊 Updated comment count from ${currentCount} to ${newCount} for post ${postId}`);
                } else {
                    console.log(`❌ Could not find toggle button for post ${postId}`);
                }

                // Update comments header if it exists
                const commentsHeader = commentsContainer.querySelector('.comments-header h4');
                if (commentsHeader) {
                    const remainingComments = commentsContainer.querySelectorAll('.comment-item').length;
                    commentsHeader.textContent = `Comments (${remainingComments})`;
                }

                if (window.forumApp.notificationComponent) {
                    window.forumApp.notificationComponent.success('Comment deleted successfully');
                }
            } else {
                throw new Error(response.message || 'Failed to delete comment');
            }
        } catch (error) {
            console.error('Failed to delete comment:', error);
            if (window.forumApp.notificationComponent) {
                window.forumApp.notificationComponent.error(error.message || 'Failed to delete comment');
            }
        }
    },

    handleCommentReply(event) {
        event.preventDefault();
        event.stopPropagation();

        const button = event.currentTarget;
        const commentId = button.dataset.commentId;
        const postId = button.dataset.postId;

        // Check if reply form is already open
        const replyFormContainer = document.getElementById(`reply-form-${commentId}`);
        if (!replyFormContainer) {
            console.error('Reply form container not found');
            return;
        }

        // Toggle reply form visibility
        if (replyFormContainer.style.display === 'none') {
            // Show reply form
            replyFormContainer.style.display = 'block';
            replyFormContainer.innerHTML = this.renderReplyForm(postId, commentId);

            // Bind the reply form events
            const replyForm = replyFormContainer.querySelector('.reply-form');
            if (replyForm) {
                replyForm.addEventListener('submit', this.handleReplySubmit.bind(this));

                // Auto-resize textarea
                const textarea = replyForm.querySelector('.reply-textarea');
                if (textarea) {
                    textarea.addEventListener('input', () => {
                        textarea.style.height = 'auto';
                        textarea.style.height = Math.min(textarea.scrollHeight, 80) + 'px';
                    });
                    textarea.focus(); // Focus on the textarea
                }
            }

            // Update button text
            button.textContent = '❌ Cancel Reply';
        } else {
            // Hide reply form
            replyFormContainer.style.display = 'none';
            replyFormContainer.innerHTML = '';

            // Reset button text
            button.textContent = '💬 Reply';
        }
    },

    renderReplyForm(postId, parentId) {
        return `
            <form class="reply-form" data-post-id="${postId}" data-parent-id="${parentId}">
                <div class="reply-form-header">
                    <span class="reply-indicator">↳ Replying to comment</span>
                </div>
                <div class="reply-form-body">
                    <textarea class="reply-textarea"
                              placeholder="Write your reply..."
                              required
                              maxlength="1000"></textarea>
                    <div class="reply-form-actions">
                        <button type="submit" class="btn btn-primary reply-submit-btn">
                            💬 Post Reply
                        </button>
                        <button type="button" class="btn btn-secondary reply-cancel-btn"
                                onclick="this.closest('.reply-form-container').style.display='none';
                                         this.closest('.comment-item').querySelector('.reply-comment-btn').textContent='💬 Reply';">
                            Cancel
                        </button>
                    </div>
                </div>
            </form>
        `;
    },

    async handleReplySubmit(event) {
        event.preventDefault();

        const form = event.target;
        const postId = parseInt(form.dataset.postId);
        const parentId = parseInt(form.dataset.parentId);
        const textarea = form.querySelector('.reply-textarea');
        const content = textarea.value.trim();

        if (!content) {
            if (window.forumApp.notificationComponent) {
                window.forumApp.notificationComponent.warning('Please enter a reply');
            }
            return;
        }

        const submitButton = form.querySelector('.reply-submit-btn');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Posting...';
        submitButton.disabled = true;

        try {
            const response = await fetch('/api/comment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    postId: postId,
                    parentId: parentId,
                    content: content
                })
            });

            const result = await response.json();

            if (result.success) {
                // Hide the reply form
                const replyFormContainer = form.closest('.reply-form-container');
                replyFormContainer.style.display = 'none';
                replyFormContainer.innerHTML = '';

                // Reset the reply button
                const replyButton = form.closest('.comment-item').querySelector('.reply-comment-btn');
                if (replyButton) {
                    replyButton.textContent = '💬 Reply';
                }

                // Reload comments to show the new reply
                await this.loadComments(postId);

                if (window.forumApp.notificationComponent) {
                    window.forumApp.notificationComponent.success('Reply posted successfully');
                }
            } else {
                throw new Error(result.error || 'Failed to post reply');
            }
        } catch (error) {
            console.error('Failed to post reply:', error);
            if (window.forumApp.notificationComponent) {
                window.forumApp.notificationComponent.error(error.message || 'Failed to post reply');
            }
        } finally {
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    },

    async handleShare(event) {
        if (!window.auth.isLoggedIn()) {
            if (window.forumApp.notificationComponent) {
                window.forumApp.notificationComponent.warning('Please log in to share posts');
            }
            return;
        }

        const button = event.target;
        const postId = parseInt(button.dataset.postId);

        try {
            // Get share data from API
            const response = await fetch('/api/share', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    postId: postId,
                    method: 'link'
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showShareModal(result.data);
            } else {
                throw new Error(result.error || 'Failed to generate share link');
            }
        } catch (error) {
            console.error('Failed to share post:', error);
            if (window.forumApp.notificationComponent) {
                window.forumApp.notificationComponent.error(error.message || 'Failed to share post');
            }
        }
    },

    showShareModal(shareData) {
        // Create modal HTML
        const modalHTML = `
            <div class="modal-overlay" id="share-modal">
                <div class="modal-content share-modal">
                    <div class="modal-header">
                        <h3>Share Post</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="share-post-info">
                            <h4>${window.utils.escapeHtml(shareData.post.title)}</h4>
                            <p class="post-author">by ${window.utils.escapeHtml(shareData.post.author)}</p>
                            <p class="post-excerpt">${window.utils.escapeHtml(shareData.post.excerpt)}</p>
                        </div>

                        <div class="share-options">
                            <div class="share-link-section">
                                <label for="share-url">Share Link:</label>
                                <div class="share-url-container">
                                    <input type="text" id="share-url" value="${shareData.shareUrl}" readonly>
                                    <button class="btn btn-secondary copy-btn" onclick="window.PostsPage.copyToClipboard('${shareData.shareUrl}')">
                                        📋 Copy
                                    </button>
                                </div>
                            </div>

                            <div class="social-share-section">
                                <h4>Share on Social Media:</h4>
                                <div class="social-buttons">
                                    <a href="${shareData.socialLinks.twitter}" target="_blank" class="social-btn twitter-btn">
                                        🐦 Twitter
                                    </a>
                                    <a href="${shareData.socialLinks.facebook}" target="_blank" class="social-btn facebook-btn">
                                        📘 Facebook
                                    </a>
                                    <a href="${shareData.socialLinks.linkedin}" target="_blank" class="social-btn linkedin-btn">
                                        💼 LinkedIn
                                    </a>
                                    <a href="${shareData.socialLinks.reddit}" target="_blank" class="social-btn reddit-btn">
                                        🔴 Reddit
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Auto-select the URL for easy copying
        const urlInput = document.getElementById('share-url');
        urlInput.select();
    },

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            if (window.forumApp.notificationComponent) {
                window.forumApp.notificationComponent.success('Link copied to clipboard!');
            }
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                if (window.forumApp.notificationComponent) {
                    window.forumApp.notificationComponent.success('Link copied to clipboard!');
                }
            } catch (fallbackError) {
                if (window.forumApp.notificationComponent) {
                    window.forumApp.notificationComponent.error('Failed to copy link');
                }
            }
            document.body.removeChild(textArea);
        }
    }
};
