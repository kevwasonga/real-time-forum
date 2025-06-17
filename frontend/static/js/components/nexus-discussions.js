/**
 * Forum - Enhanced Discussions Component
 * Handles forum posts, comments, and interactions
 */

class NexusDiscussions {
    constructor() {
        this.discussions = [];
        this.currentCategory = 'all';
        this.currentDiscussion = null;
        this.comments = [];
        this.isLoading = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        console.log('💬 Discussions component initialized');
    }

    setupEventListeners() {
        // Only setup event listeners if nexusCore is available
        if (!window.nexusCore || !nexusCore.on) {
            console.warn('nexusCore not available for discussions event listeners');
            return;
        }

        try {
            // Listen for page changes
            nexusCore.on('page:change', (event) => {
                if (event.detail.page === 'discussions') {
                    this.renderDiscussionsPage();
                }
            });

            // Listen for discussion creation
            nexusCore.on('discussion:create', () => {
                this.showCreateDiscussionModal();
            });
        } catch (error) {
            console.error('Error setting up discussions event listeners:', error);
        }
    }

    /**
     * Render discussions page
     */
    async renderDiscussionsPage() {
        nexusNavigation.setPageTitle('Discussions');
        
        const template = `
            <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pt-20">
                <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <!-- Page Header -->
                    <div class="mb-8">
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h1 class="nexus-heading-1 mb-2">Community Discussions</h1>
                                <p class="nexus-text-secondary">Join the conversation and share your thoughts</p>
                            </div>
                            <button 
                                class="nexus-btn nexus-btn-primary mt-4 sm:mt-0"
                                onclick="nexusDiscussions.showCreateDiscussionModal()"
                            >
                                <i class="fas fa-plus mr-2"></i>
                                Start Discussion
                            </button>
                        </div>
                    </div>

                    <!-- Category Filter -->
                    <div class="mb-6">
                        <div class="flex flex-wrap gap-2">
                            <button 
                                class="nexus-btn nexus-btn-ghost category-filter ${this.currentCategory === 'all' ? 'active' : ''}"
                                onclick="nexusDiscussions.filterByCategory('all')"
                            >
                                All Topics
                            </button>
                            <button 
                                class="nexus-btn nexus-btn-ghost category-filter ${this.currentCategory === 'general' ? 'active' : ''}"
                                onclick="nexusDiscussions.filterByCategory('general')"
                            >
                                General
                            </button>
                            <button 
                                class="nexus-btn nexus-btn-ghost category-filter ${this.currentCategory === 'technology' ? 'active' : ''}"
                                onclick="nexusDiscussions.filterByCategory('technology')"
                            >
                                Technology
                            </button>
                            <button 
                                class="nexus-btn nexus-btn-ghost category-filter ${this.currentCategory === 'lifestyle' ? 'active' : ''}"
                                onclick="nexusDiscussions.filterByCategory('lifestyle')"
                            >
                                Lifestyle
                            </button>
                            <button 
                                class="nexus-btn nexus-btn-ghost category-filter ${this.currentCategory === 'entertainment' ? 'active' : ''}"
                                onclick="nexusDiscussions.filterByCategory('entertainment')"
                            >
                                Entertainment
                            </button>
                        </div>
                    </div>

                    <!-- Discussions List -->
                    <div id="discussions-container">
                        ${this.isLoading ? this.renderLoadingSkeleton() : ''}
                    </div>
                </div>
            </div>
        `;

        this.renderToMainContent(template);
        await this.loadDiscussions();
    }

    /**
     * Load discussions from API
     */
    async loadDiscussions() {
        try {
            this.isLoading = true;
            this.updateDiscussionsContainer();

            const endpoint = this.currentCategory === 'all' 
                ? '/discussions' 
                : `/discussions?category=${this.currentCategory}`;
            
            const response = await nexusCore.apiRequest(endpoint);
            
            if (response.ok) {
                this.discussions = await response.json();
                this.updateDiscussionsContainer();
            } else {
                throw new Error('Failed to load discussions');
            }
        } catch (error) {
            console.error('Error loading discussions:', error);
            nexusCore.showNotification('Failed to load discussions', 'error');
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Update discussions container
     */
    updateDiscussionsContainer() {
        const container = document.getElementById('discussions-container');
        if (!container) return;

        if (this.isLoading) {
            container.innerHTML = this.renderLoadingSkeleton();
            return;
        }

        // Check if discussions is null, undefined, or not an array
        if (!this.discussions || !Array.isArray(this.discussions)) {
            container.innerHTML = this.renderEmptyState();
            return;
        }

        if (this.discussions.length === 0) {
            container.innerHTML = this.renderEmptyState();
            return;
        }

        container.innerHTML = this.discussions.map(discussion => 
            this.renderDiscussionCard(discussion)
        ).join('');
    }

    /**
     * Render discussion card
     */
    renderDiscussionCard(discussion) {
        return `
            <div class="nexus-discussion-card nexus-animate-fade-in-up">
                <div class="nexus-discussion-header">
                    <div class="nexus-discussion-meta">
                        <div class="nexus-discussion-author">
                            <img 
                                src="/static/img/default-avatar.png" 
                                alt="${discussion.authorFirstName}"
                                class="nexus-avatar nexus-avatar-sm"
                                onerror="this.src='/static/img/default-avatar.png'"
                            >
                            <span>${discussion.authorId === nexusCore.currentUser?.id ? 'You' : `${discussion.authorFirstName} ${discussion.authorLastName}`}</span>
                        </div>
                        <span class="nexus-discussion-time">
                            ${nexusCore.formatDate(discussion.createdAt)}
                        </span>
                        <span class="nexus-badge nexus-badge-primary">
                            ${discussion.category}
                        </span>
                    </div>
                    <h3 class="nexus-discussion-title">
                        <a href="#" onclick="nexusDiscussions.viewDiscussion(${discussion.id})">
                            ${nexusCore.sanitizeHtml(discussion.title)}
                        </a>
                    </h3>
                </div>
                
                <div class="nexus-discussion-content">
                    <p>${this.truncateContent(nexusCore.sanitizeHtml(discussion.content), 200)}</p>
                </div>
                
                <div class="nexus-discussion-footer">
                    <div class="nexus-discussion-actions">
                        <button 
                            class="nexus-action-btn ${discussion.userLiked ? 'active' : ''}"
                            onclick="nexusDiscussions.toggleLike(${discussion.id})"
                        >
                            <i class="fas fa-heart"></i>
                            <span>${discussion.likes}</span>
                        </button>
                        <button 
                            class="nexus-action-btn"
                            onclick="nexusDiscussions.viewDiscussion(${discussion.id})"
                        >
                            <i class="fas fa-comment"></i>
                            <span>${discussion.commentCount}</span>
                        </button>
                        <button 
                            class="nexus-action-btn"
                            onclick="nexusDiscussions.shareDiscussion(${discussion.id})"
                        >
                            <i class="fas fa-share"></i>
                            Share
                        </button>
                    </div>
                    <div class="nexus-discussion-stats">
                        <span>${discussion.commentCount} comments</span>
                        <span>•</span>
                        <span>${discussion.likes} likes</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Show create discussion modal
     */
    showCreateDiscussionModal() {
        const template = `
            <div class="nexus-modal-overlay active" id="create-discussion-modal">
                <div class="nexus-modal nexus-animate-scale-in" style="max-width: 600px;">
                    <div class="nexus-modal-header">
                        <h2 class="nexus-modal-title">
                            <i class="fas fa-plus-circle mr-2 nexus-gradient-text"></i>
                            Start New Discussion
                        </h2>
                        <button class="nexus-modal-close" onclick="nexusDiscussions.closeCreateModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="nexus-modal-body">
                        <form id="create-discussion-form" class="space-y-6">
                            <div class="nexus-form-group">
                                <label class="nexus-label">Discussion Title</label>
                                <input 
                                    type="text" 
                                    name="title" 
                                    class="nexus-input" 
                                    placeholder="What would you like to discuss?"
                                    required
                                    maxlength="200"
                                >
                            </div>
                            
                            <div class="nexus-form-group">
                                <label class="nexus-label">Category</label>
                                <select name="category" class="nexus-select" required>
                                    <option value="">Select a category</option>
                                    <option value="general">General</option>
                                    <option value="technology">Technology</option>
                                    <option value="lifestyle">Lifestyle</option>
                                    <option value="entertainment">Entertainment</option>
                                    <option value="education">Education</option>
                                    <option value="sports">Sports</option>
                                </select>
                            </div>
                            
                            <div class="nexus-form-group">
                                <label class="nexus-label">Content</label>
                                <textarea 
                                    name="content" 
                                    class="nexus-textarea" 
                                    placeholder="Share your thoughts, ask questions, or start a conversation..."
                                    required
                                    rows="6"
                                    maxlength="5000"
                                ></textarea>
                                <div class="text-xs text-gray-500 mt-1">
                                    <span id="content-counter">0</span>/5000 characters
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="nexus-modal-footer">
                        <button 
                            type="button" 
                            class="nexus-btn nexus-btn-secondary"
                            onclick="nexusDiscussions.closeCreateModal()"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            form="create-discussion-form"
                            class="nexus-btn nexus-btn-primary"
                        >
                            <i class="fas fa-paper-plane mr-2"></i>
                            Post Discussion
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', template);
        this.setupCreateDiscussionForm();
    }

    /**
     * Setup create discussion form
     */
    setupCreateDiscussionForm() {
        const form = document.getElementById('create-discussion-form');
        const contentTextarea = form.querySelector('[name="content"]');
        const counter = document.getElementById('content-counter');

        // Character counter
        contentTextarea.addEventListener('input', () => {
            counter.textContent = contentTextarea.value.length;
        });

        // Form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.createDiscussion(new FormData(form));
        });

        // Focus title input
        setTimeout(() => {
            form.querySelector('[name="title"]').focus();
        }, 100);
    }

    /**
     * Create new discussion
     */
    async createDiscussion(formData) {
        const submitBtn = document.querySelector('button[form="create-discussion-form"][type="submit"]');
        if (!submitBtn) {
            console.error('Submit button not found');
            return;
        }
        const originalText = submitBtn.innerHTML;
        
        try {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Posting...';
            submitBtn.disabled = true;

            const discussionData = {
                title: formData.get('title'),
                content: formData.get('content'),
                category: formData.get('category')
            };

            const response = await nexusCore.apiRequest('/discussions', 'POST', discussionData);

            if (response.ok) {
                const newDiscussion = await response.json();
                nexusCore.showNotification('Discussion posted successfully!', 'success');
                this.closeCreateModal();
                
                // Add to discussions list
                // Initialize discussions array if it's null
                if (!this.discussions || !Array.isArray(this.discussions)) {
                    this.discussions = [];
                }
                this.discussions.unshift(newDiscussion);
                this.updateDiscussionsContainer();
            } else {
                const error = await response.text();
                nexusCore.showNotification(error || 'Failed to create discussion', 'error');
            }
        } catch (error) {
            console.error('Error creating discussion:', error);
            nexusCore.showNotification('Network error. Please try again.', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }
    }

    /**
     * Filter discussions by category
     */
    async filterByCategory(category) {
        this.currentCategory = category;
        
        // Update active filter button
        document.querySelectorAll('.category-filter').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        await this.loadDiscussions();
    }

    /**
     * Toggle discussion like
     */
    async toggleLike(discussionId) {
        try {
            const response = await nexusCore.apiRequest(`/discussions/${discussionId}/engage`, 'POST');
            
            if (response.ok) {
                const result = await response.json();
                
                // Update discussion in list
                if (this.discussions && Array.isArray(this.discussions)) {
                    const discussion = this.discussions.find(d => d.id === discussionId);
                    if (discussion) {
                        discussion.likes = result.likes;
                        discussion.userLiked = !discussion.userLiked;
                        this.updateDiscussionsContainer();
                    }
                }
            }
        } catch (error) {
            console.error('Error toggling like:', error);
            nexusCore.showNotification('Failed to update like', 'error');
        }
    }

    /**
     * View discussion details
     */
    async viewDiscussion(discussionId) {
        try {
            // Find the discussion in our current list
            let discussion = this.discussions?.find(d => d.id === discussionId);

            // If not found locally, fetch from API
            if (!discussion) {
                const response = await nexusCore.apiRequest(`/discussions/${discussionId}`);
                if (response.ok) {
                    discussion = await response.json();
                } else {
                    nexusCore.showNotification('Discussion not found', 'error');
                    return;
                }
            }

            // Store current discussion for reference
            this.currentDiscussion = discussion;

            // Render the discussion detail view
            await this.renderDiscussionDetailView(discussion);

            // Load comments for this discussion
            await this.loadComments(discussionId);

        } catch (error) {
            console.error('Error viewing discussion:', error);
            nexusCore.showNotification('Failed to load discussion', 'error');
        }
    }

    /**
     * Render discussion detail view
     */
    async renderDiscussionDetailView(discussion) {
        if (window.nexusNavigation && typeof window.nexusNavigation.setPageTitle === 'function') {
            nexusNavigation.setPageTitle(discussion.title);
        }

        const template = `
            <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pt-20">
                <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <!-- Back Button -->
                    <div class="mb-6">
                        <button
                            class="nexus-btn nexus-btn-ghost"
                            onclick="nexusDiscussions.backToDiscussions()"
                        >
                            <i class="fas fa-arrow-left mr-2"></i>
                            Back to Discussions
                        </button>
                    </div>

                    <!-- Discussion Detail -->
                    <div class="nexus-card mb-8">
                        <div class="nexus-card-body">
                            <!-- Discussion Header -->
                            <div class="mb-6">
                                <div class="flex items-center gap-3 mb-4">
                                    <img
                                        src="/static/img/default-avatar.png"
                                        alt="${discussion.authorFirstName}"
                                        class="nexus-avatar nexus-avatar-md"
                                        onerror="this.src='/static/img/default-avatar.png'"
                                    >
                                    <div>
                                        <div class="font-medium">${discussion.authorId === nexusCore.currentUser?.id ? 'You' : `${discussion.authorFirstName} ${discussion.authorLastName}`}</div>
                                        <div class="text-sm nexus-text-secondary">
                                            ${nexusCore.formatDate(discussion.createdAt)} •
                                            <span class="nexus-badge nexus-badge-primary">${discussion.category}</span>
                                        </div>
                                    </div>
                                </div>
                                <h1 class="nexus-heading-1 mb-4">${nexusCore.sanitizeHtml(discussion.title)}</h1>
                            </div>

                            <!-- Discussion Content -->
                            <div class="prose max-w-none mb-6">
                                <p class="text-gray-700 leading-relaxed">${nexusCore.sanitizeHtml(discussion.content)}</p>
                            </div>

                            <!-- Discussion Actions -->
                            <div class="flex items-center justify-between pt-6 border-t border-gray-200">
                                <div class="flex items-center gap-4">
                                    <button
                                        class="nexus-action-btn ${discussion.userLiked ? 'active' : ''}"
                                        onclick="nexusDiscussions.toggleLike(${discussion.id})"
                                    >
                                        <i class="fas fa-heart"></i>
                                        <span>${discussion.likes}</span>
                                    </button>
                                    <div class="nexus-action-btn">
                                        <i class="fas fa-comment"></i>
                                        <span id="comment-count">${discussion.commentCount}</span>
                                    </div>
                                </div>
                                <button
                                    class="nexus-btn nexus-btn-ghost"
                                    onclick="nexusDiscussions.shareDiscussion(${discussion.id})"
                                >
                                    <i class="fas fa-share mr-2"></i>
                                    Share
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Comments Section -->
                    <div class="nexus-card">
                        <div class="nexus-card-header">
                            <h2 class="nexus-heading-3">Comments</h2>
                        </div>
                        <div class="nexus-card-body">
                            <!-- Add Comment Form -->
                            <form id="add-comment-form" class="mb-6">
                                <div class="nexus-form-group">
                                    <textarea
                                        name="content"
                                        class="nexus-textarea"
                                        placeholder="Share your thoughts on this discussion..."
                                        required
                                        rows="3"
                                        maxlength="1000"
                                    ></textarea>
                                </div>
                                <div class="flex justify-between items-center">
                                    <div class="text-xs text-gray-500">
                                        <span id="comment-counter">0</span>/1000 characters
                                    </div>
                                    <button
                                        type="submit"
                                        class="nexus-btn nexus-btn-primary"
                                    >
                                        <i class="fas fa-paper-plane mr-2"></i>
                                        Post Comment
                                    </button>
                                </div>
                            </form>

                            <!-- Comments List -->
                            <div id="comments-container">
                                <div class="text-center py-8">
                                    <i class="fas fa-spinner fa-spin text-2xl text-gray-400"></i>
                                    <p class="nexus-text-secondary mt-2">Loading comments...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.renderToMainContent(template);
        this.setupCommentForm();
    }

    /**
     * Share discussion
     */
    shareDiscussion(discussionId) {
        if (!this.discussions || !Array.isArray(this.discussions)) {
            nexusCore.showNotification('Discussion not found', 'error');
            return;
        }

        const discussion = this.discussions.find(d => d.id === discussionId);
        if (discussion) {
            const url = `${window.location.origin}/discussions/${discussionId}`;

            if (navigator.share) {
                navigator.share({
                    title: discussion.title,
                    text: discussion.content.substring(0, 100) + '...',
                    url: url
                });
            } else {
                navigator.clipboard.writeText(url);
                nexusCore.showNotification('Discussion link copied to clipboard!', 'success');
            }
        }
    }

    /**
     * Load comments for a discussion
     */
    async loadComments(discussionId) {
        try {
            const response = await nexusCore.apiRequest(`/discussions/${discussionId}/comments`);

            if (response.ok) {
                this.comments = await response.json();
                this.renderComments();
            } else {
                throw new Error('Failed to load comments');
            }
        } catch (error) {
            console.error('Error loading comments:', error);
            const container = document.getElementById('comments-container');
            if (container) {
                container.innerHTML = `
                    <div class="text-center py-8">
                        <i class="fas fa-exclamation-circle text-2xl text-red-400 mb-2"></i>
                        <p class="nexus-text-secondary">Failed to load comments</p>
                    </div>
                `;
            }
        }
    }

    /**
     * Render comments list
     */
    renderComments() {
        const container = document.getElementById('comments-container');
        if (!container) return;

        if (!this.comments || this.comments.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-comment text-4xl text-gray-300 mb-4"></i>
                    <p class="nexus-text-secondary">No comments yet. Be the first to share your thoughts!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.comments.map(comment => this.renderCommentCard(comment)).join('');
    }

    /**
     * Render individual comment card
     */
    renderCommentCard(comment) {
        return `
            <div class="nexus-comment-card mb-4">
                <div class="flex gap-3">
                    <img
                        src="/static/img/default-avatar.png"
                        alt="${comment.authorFirstName}"
                        class="nexus-avatar nexus-avatar-sm flex-shrink-0"
                        onerror="this.src='/static/img/default-avatar.png'"
                    >
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="font-medium">${comment.authorId === nexusCore.currentUser?.id ? 'You' : `${comment.authorFirstName} ${comment.authorLastName}`}</span>
                            <span class="nexus-text-secondary text-sm">${nexusCore.formatDate(comment.createdAt)}</span>
                        </div>
                        <div class="nexus-comment-content mb-3">
                            <p>${nexusCore.sanitizeHtml(comment.content)}</p>
                        </div>
                        <div class="flex items-center gap-4">
                            <button
                                class="nexus-comment-action ${comment.userLiked ? 'active' : ''}"
                                onclick="nexusDiscussions.toggleCommentLike(${comment.id})"
                            >
                                <i class="fas fa-heart"></i>
                                <span>${comment.likes}</span>
                            </button>
                            <button
                                class="nexus-comment-action"
                                onclick="nexusDiscussions.replyToComment(${comment.id})"
                            >
                                <i class="fas fa-reply"></i>
                                Reply
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Setup comment form
     */
    setupCommentForm() {
        const form = document.getElementById('add-comment-form');
        const textarea = form.querySelector('[name="content"]');
        const counter = document.getElementById('comment-counter');

        // Character counter
        textarea.addEventListener('input', () => {
            counter.textContent = textarea.value.length;
        });

        // Form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.createComment(new FormData(form));
        });
    }

    /**
     * Create new comment
     */
    async createComment(formData) {
        const submitBtn = document.querySelector('#add-comment-form button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        try {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Posting...';
            submitBtn.disabled = true;

            const commentData = {
                content: formData.get('content')
            };

            const response = await nexusCore.apiRequest(`/discussions/${this.currentDiscussion.id}/comments`, 'POST', commentData);

            if (response.ok) {
                const newComment = await response.json();
                nexusCore.showNotification('Comment posted successfully!', 'success');

                // Add to comments list
                if (!this.comments || !Array.isArray(this.comments)) {
                    this.comments = [];
                }
                this.comments.unshift(newComment);
                this.renderComments();

                // Update comment count
                this.currentDiscussion.commentCount++;
                const commentCountEl = document.getElementById('comment-count');
                if (commentCountEl) {
                    commentCountEl.textContent = this.currentDiscussion.commentCount;
                }

                // Clear form
                document.getElementById('add-comment-form').reset();
                document.getElementById('comment-counter').textContent = '0';

            } else {
                const error = await response.text();
                nexusCore.showNotification(error || 'Failed to create comment', 'error');
            }
        } catch (error) {
            console.error('Error creating comment:', error);
            nexusCore.showNotification('Network error. Please try again.', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }
    }

    /**
     * Back to discussions list
     */
    backToDiscussions() {
        this.currentDiscussion = null;
        this.comments = [];
        this.renderDiscussionsPage();
    }

    /**
     * Toggle comment like
     */
    async toggleCommentLike(commentId) {
        try {
            const response = await nexusCore.apiRequest(`/comments/${commentId}/engage`, 'POST');

            if (response.ok) {
                const result = await response.json();

                // Update comment in list
                if (this.comments && Array.isArray(this.comments)) {
                    const comment = this.comments.find(c => c.id === commentId);
                    if (comment) {
                        comment.likes = result.likes;
                        comment.userLiked = !comment.userLiked;
                        this.renderComments();
                    }
                }
            }
        } catch (error) {
            console.error('Error toggling comment like:', error);
            nexusCore.showNotification('Failed to update like', 'error');
        }
    }

    /**
     * Reply to comment
     */
    replyToComment(commentId) {
        // Find the comment to reply to
        const comment = this.comments?.find(c => c.id === commentId);
        if (!comment) {
            nexusCore.showNotification('Comment not found', 'error');
            return;
        }

        // Check if reply form already exists
        const existingForm = document.getElementById(`reply-form-${commentId}`);
        if (existingForm) {
            existingForm.remove();
            return;
        }

        // Create reply form
        const replyForm = `
            <div id="reply-form-${commentId}" class="mt-3 ml-8 p-3 bg-gray-50 rounded-lg border">
                <form onsubmit="nexusDiscussions.submitReply(event, ${commentId})">
                    <div class="nexus-form-group mb-3">
                        <textarea
                            name="content"
                            class="nexus-textarea"
                            placeholder="Write your reply..."
                            required
                            rows="2"
                            maxlength="500"
                        ></textarea>
                        <div class="text-xs text-gray-500 mt-1">
                            <span class="reply-counter">0</span>/500 characters
                        </div>
                    </div>
                    <div class="flex justify-between items-center">
                        <button
                            type="button"
                            class="nexus-btn nexus-btn-ghost nexus-btn-sm"
                            onclick="document.getElementById('reply-form-${commentId}').remove()"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            class="nexus-btn nexus-btn-primary nexus-btn-sm"
                        >
                            <i class="fas fa-reply mr-1"></i>
                            Reply
                        </button>
                    </div>
                </form>
            </div>
        `;

        // Insert reply form after the comment
        const commentElement = document.querySelector(`[onclick*="replyToComment(${commentId})"]`).closest('.nexus-comment-card');
        commentElement.insertAdjacentHTML('afterend', replyForm);

        // Setup character counter
        const textarea = document.querySelector(`#reply-form-${commentId} textarea`);
        const counter = document.querySelector(`#reply-form-${commentId} .reply-counter`);
        textarea.addEventListener('input', () => {
            counter.textContent = textarea.value.length;
        });

        // Focus textarea
        textarea.focus();
    }

    /**
     * Submit reply to comment
     */
    async submitReply(event, commentId) {
        event.preventDefault();

        const form = event.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        try {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Replying...';
            submitBtn.disabled = true;

            const formData = new FormData(form);
            const replyData = {
                content: formData.get('content')
            };

            const response = await nexusCore.apiRequest(`/comments/${commentId}/replies`, 'POST', replyData);

            if (response.ok) {
                const newReply = await response.json();
                nexusCore.showNotification('Reply posted successfully!', 'success');

                // Remove reply form
                form.closest(`#reply-form-${commentId}`).remove();

                // Reload comments to show the new reply
                await this.loadComments(this.currentDiscussion.id);

            } else {
                const error = await response.text();
                nexusCore.showNotification(error || 'Failed to post reply', 'error');
            }
        } catch (error) {
            console.error('Error posting reply:', error);
            nexusCore.showNotification('Network error. Please try again.', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }
    }

    /**
     * Close create modal
     */
    closeCreateModal() {
        const modal = document.getElementById('create-discussion-modal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        }
    }

    /**
     * Truncate content
     */
    truncateContent(content, maxLength) {
        if (content.length <= maxLength) return content;
        return content.substring(0, maxLength) + '...';
    }

    /**
     * Render loading skeleton
     */
    renderLoadingSkeleton() {
        return Array(3).fill(0).map(() => `
            <div class="nexus-card mb-6">
                <div class="nexus-card-body">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="nexus-skeleton w-10 h-10 rounded-full"></div>
                        <div class="flex-1">
                            <div class="nexus-skeleton h-4 w-32 mb-2"></div>
                            <div class="nexus-skeleton h-3 w-24"></div>
                        </div>
                    </div>
                    <div class="nexus-skeleton h-6 w-3/4 mb-3"></div>
                    <div class="nexus-skeleton h-4 w-full mb-2"></div>
                    <div class="nexus-skeleton h-4 w-2/3"></div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Render empty state
     */
    renderEmptyState() {
        return `
            <div class="text-center py-12">
                <div class="nexus-animate-fade-in">
                    <i class="fas fa-comments text-6xl text-gray-300 mb-4"></i>
                    <h3 class="nexus-heading-3 mb-2">No discussions yet</h3>
                    <p class="nexus-text-secondary mb-6">
                        Be the first to start a conversation in this category!
                    </p>
                    <button 
                        class="nexus-btn nexus-btn-primary"
                        onclick="nexusDiscussions.showCreateDiscussionModal()"
                    >
                        <i class="fas fa-plus mr-2"></i>
                        Start Discussion
                    </button>
                </div>
            </div>
        `;
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
}

// Initialize discussions component
document.addEventListener('DOMContentLoaded', () => {
    // Wait for nexusCore to be available
    if (window.nexusCore) {
        window.nexusDiscussions = new NexusDiscussions();
        nexusCore.registerComponent('discussions', NexusDiscussions);
    } else {
        // Retry if nexusCore is not ready yet
        setTimeout(() => {
            if (window.nexusCore) {
                window.nexusDiscussions = new NexusDiscussions();
                nexusCore.registerComponent('discussions', NexusDiscussions);
            }
        }, 100);
    }
});
