const Posts = {
    currentCategory: 'all',
    posts: new Map(),

    init() {
        this.postsContainer = document.getElementById('posts-container');
        this.bindEvents();
        this.loadPosts();
    },

    bindEvents() {
        // Category selection
        document.querySelector('.categories-nav').addEventListener('click', (e) => {
            if (e.target.tagName === 'A') {
                e.preventDefault();
                const category = e.target.dataset.category;
                this.setActiveCategory(category);
                this.loadPosts(category);
            }
        });

        // Create post button
        document.querySelector('.create-post-btn').addEventListener('click', () => {
            this.showCreatePostForm();
        });

        // Post interactions
        this.postsContainer.addEventListener('click', (e) => {
            // Handle post actions
            const postId = e.target.closest('.post')?.dataset.postId;
            if (postId) {
                let currentLikes = document.querySelector(`.post[data-post-id="${postId}"] .likes-count`).textContent;

                if (e.target.closest('.like-btn')) {
                    this.handleLike(postId, currentLikes);
                } else if (e.target.closest('.comment-btn')) {
                    this.toggleComments(postId);
                }
            }

            // Handle comment actions
            const commentId = e.target.closest('.comment')?.dataset.commentId;
            if (commentId) {
                let currentCommentLikes = document.querySelector(`.comment[data-comment-id="${commentId}"] .likes-count-comment`).textContent;
                if (e.target.closest('.like-btn-comment')) {
                    this.handleCommentLike(commentId, currentCommentLikes);
                } else if (e.target.closest('.comment-btn-comment')) {
                    this.toggleCommentReplies(commentId);
                }
            }

            // Handle reply actions
            const replyId = e.target.closest('.reply')?.dataset.replyId;
            if (replyId) {
                let currentReplyLikes = document.querySelector(`.reply[data-reply-id="${replyId}"] .likes-count-reply`).textContent;
                if (e.target.closest('.like-btn-reply')) {
                    this.handleReplyLike(replyId, currentReplyLikes);
                }
            }

            // Handle form reply submissions
            if (e.target.closest('.reply-btn')) {
                const commentId = e.target.closest('.comment').dataset.commentId;
                const replyInput = e.target.closest('.comment').querySelector('input[name="reply"]');
                this.submitReply(commentId, replyInput.value);
                replyInput.value = '';
            }
        });

        // Comment form submissions
        this.postsContainer.addEventListener('submit', (e) => {
            if (e.target.classList.contains('comment-form')) {
                e.preventDefault();
                const postId = e.target.closest('.post').dataset.postId;
                const input = e.target.querySelector('input[name="comment"]');
                this.submitComment(postId, input.value);
                input.value = '';
            }
        });
    },

    setActiveCategory(category) {
        this.currentCategory = category;
        document.querySelectorAll('.categories-nav a').forEach(link => {
            link.classList.toggle('active', link.dataset.category === category);
        });
    },

    async loadPosts(category = this.currentCategory) {
        try {
            let response;
            if (category === 'my-posts') {
                response = await fetch('/api/posts/my');
            } else {
                response = await fetch(`/api/posts${category !== 'all' ? `?category=${category}` : ''}`);
            }
            
            if (response.ok) {
                const posts = await response.json();
                this.postsContainer.innerHTML = '';
                this.postsContainer.classList.remove('hidden');
                
                if (!posts || posts.length === 0) {
                    const noPostsMessage = document.createElement('div');
                    noPostsMessage.className = 'no-posts-message';
                    noPostsMessage.innerHTML = '<p>No posts yet for this category</p>';
                    this.postsContainer.appendChild(noPostsMessage);
                } else {
                    posts.forEach(post => {
                        this.posts.set(post.id, post);
                        this.renderPost(post);
                    });
                }
            }
        } catch (error) {
            console.error('Failed to load posts:', error);
            this.showNotification('An error occurred while getting your posts.', 'error');
        }
    },

    renderPost(post, prepend = false) {
        const postHTML = Templates.post(post);
        if (prepend) {
            this.postsContainer.insertAdjacentHTML('afterbegin', postHTML);
        } else {
            this.postsContainer.insertAdjacentHTML('beforeend', postHTML);
        }
    },

    showCreatePostForm() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = Templates.createPostForm;
        document.body.appendChild(modal);
    },

    cancelPostForm() {
        const modal = document.querySelector('.modal');
        if (modal) {
            modal.remove();
        }
    },

    async handlePostSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);

        // Get the selected category
        const categoryCheckboxes = form.querySelectorAll('input[name="category"]:checked');
        let category = 'general'; // Default category

        if (categoryCheckboxes.length > 0) {
            category = categoryCheckboxes[0].value;
        }

        try {
            const response = await fetch('/api/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: formData.get('title'),
                    content: formData.get('content'),
                    category: category,
                }),
            });

            if (response.ok) {
                const post = await response.json();
                this.handlePostUpdate(post);

                const modal = document.querySelector('.modal');
                if (modal) {
                    modal.remove();
                }
            } else {
                const error = await response.text();
                this.showError(error);
            }
        } catch (error) {
            console.error('Failed to create post:', error);
            this.showError('Failed to create post. Please try again.');
        }

        return false;
    },

    async handleLike(postId, currentLikes = 0) {
        try {
            const response = await fetch(`/api/posts/${postId}/like`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ postId }),
            });

            if (response.ok) {
                const data = await response.json();
                this.handleLikeUpdate(data);
                if (data.likes > currentLikes) {
                    this.showNotification("You liked a post!", 'info');
                }
            }
        } catch (error) {
            console.error('Failed to like post:', error);
            this.showNotification("Failed to like post. Please try again.", 'error');
        }
    },

    toggleComments(postId) {
        const post = document.querySelector(`.post[data-post-id="${postId}"]`);
        const commentsSection = post.querySelector('.comments-section');
        commentsSection.classList.toggle('hidden');
        if (commentsSection.classList.contains('expanded')) {
            // Collapse the comments section
            commentsSection.style.maxHeight = null;
            commentsSection.classList.remove('expanded');
        } else {
            // Load comments if not already loaded
            if (!commentsSection.dataset.loaded) {
                this.loadComments(postId).then(() => {
                    commentsSection.dataset.loaded = true;
                    commentsSection.style.maxHeight = `100%`;
                    commentsSection.classList.add('expanded');
                });
            } else {
                commentsSection.style.maxHeight = `100%`;
                commentsSection.classList.add('expanded');
            }
        }

        const icon = document.querySelector(`.post[data-post-id="${postId}"] .comment-btn i`);
        if (icon) {
            icon.classList.toggle('active');
        }

    },

    async loadComments(postId) {
        try {
            const response = await fetch(`/api/posts/${postId}/comments`);
            if (response.ok) {
                const comments = await response.json();
                const post = document.querySelector(`.post[data-post-id="${postId}"]`);
                const commentsList = post.querySelector('.comments-list');
                commentsList.innerHTML = comments.map(comment => Templates.comment(comment)).join('');
                post.querySelector('.comments-section').dataset.loaded = 'true';
            }
        } catch (error) {
            console.error('Failed to load comments:', error);
            // this.showNotification('An error occurred while getting your comments.', 'error');
        }
    },

    async submitComment(postId, content) {
        try {
            const response = await fetch(`/api/posts/${postId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content }),
            });

            if (response.ok) {
                const comment = await response.json();
                this.handleCommentUpdate({ postId, comment });
                this.loadComments(postId);
                this.showNotification('Your comment was added!', 'info');
            }
        } catch (error) {
            console.error('Failed to submit comment:', error);
            this.showNotification('An error occurred while submitting your comment.', 'error');
        }
    },

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    },

    handlePostUpdate(post) {
        this.posts.set(post.id, post);
        const existingPost = document.querySelector(`.post[data-post-id="${post.id}"]`);

        if (existingPost) {
            existingPost.outerHTML = Templates.post(post);
        } else {
            // Clear any "no posts" message if it exists
            const noPostsMessage = this.postsContainer.querySelector('.no-posts-message');
            if (noPostsMessage) {
                noPostsMessage.remove();
            }
            
            // If the post belongs to the current category or we're viewing all posts
            if (this.currentCategory === 'all' || this.currentCategory === post.category) {
                this.renderPost(post, true); // Prepend the new post
            }
        }
    },

    handleCommentUpdate({ postId, comment }) {
        const post = document.querySelector(`.post[data-post-id="${postId}"]`);
        if (!post) return;

        const commentsList = post.querySelector('.comments-list');
        commentsList.insertAdjacentHTML('beforeend', Templates.comment(comment));

        // Update comment count
        const commentsCount = post.querySelector('.comments-count');
        commentsCount.textContent = parseInt(commentsCount.textContent) + 1;
    },

    handleLikeUpdate({ postId, likes }) {
        const post = document.querySelector(`.post[data-post-id="${postId}"]`);
        if (!post) return;

        const likesCount = post.querySelector('.likes-count');
        const likeBtn = post.querySelector('.like-btn i');
        if (likes > 0) {
            likeBtn.classList.add('active');
        } else if (likes === 0) {
            likeBtn.classList.remove('active');
        }
        likesCount.textContent = likes;
    },

    async handleCommentLike(commentId, currentLikes = 0) {
        try {
            const response = await fetch(`/api/comments/${commentId}/like`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ commentId }),
            });

            if (response.ok) {
                const data = await response.json();
                this.updateCommentLikes(commentId, data.likes);
                if (data.likes > currentLikes) {
                    this.showNotification("You liked a comment!", 'info');
                }
            }
        } catch (error) {
            console.error('Failed to like comment:', error);
            this.showNotification("Failed to like comment. Please try again.", 'error');
        }
    },

    updateCommentLikes(commentId, likes) {
        const comment = document.querySelector(`.comment[data-comment-id="${commentId}"]`);
        if (!comment) return;

        const likesCount = comment.querySelector('.likes-count-comment');
        const likeBtn = comment.querySelector('.like-btn-comment i');
        if (likes > 0) {
            likeBtn.classList.add('active');
        } else if (likes === 0) {
            likeBtn.classList.remove('active');
        }
        likesCount.textContent = likes;
    },

    toggleCommentReplies(commentId) {
        const comment = document.querySelector(`.comment[data-comment-id="${commentId}"]`);
        const repliesSection = comment.querySelector('.replies-section');
        repliesSection.classList.toggle('hidden');
        if (repliesSection.classList.contains('expanded')) {
            repliesSection.style.maxHeight = null;
            repliesSection.classList.remove('expanded');
        } else {
            if (!repliesSection.dataset.loaded) {
                this.loadReplies(commentId).then(() => {
                    repliesSection.dataset.loaded = true;
                    repliesSection.style.maxHeight = `100%`;
                    repliesSection.classList.add('expanded');
                });
            } else {
                repliesSection.style.maxHeight = `100%`;
                repliesSection.classList.add('expanded');
            }
        }
        const icon = document.querySelector(`.comment[data-comment-id="${commentId}"] .comment-btn-comment i`);
        if (icon) {
            icon.classList.toggle('active');
        }
    },

    async loadReplies(commentId) {
        try {
            const response = await fetch(`/api/comments/${commentId}/replies`);
            if (response.ok) {
                const replies = await response.json();
                const comment = document.querySelector(`.comment[data-comment-id="${commentId}"]`);
                const repliesList = comment.querySelector('.replies-list');
                repliesList.innerHTML = replies.map(reply => Templates.reply(reply)).join('');
                comment.querySelector('.comments-section').dataset.loaded = 'true';
            }
        } catch (error) {
            console.error('Failed to load replies:', error);
            // this.showNotification('An error occurred while getting your replies.', 'error');
        }
    },

    async submitReply(commentId, content) {
        console.log('Submitting reply:', commentId, content);
        try {
            const response = await fetch(`/api/comments/${commentId}/replies`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content }),
            });

            if (response.ok) {
                const reply = await response.json();
                this.addReplyToComment(commentId, reply);
                this.showNotification('Your reply was added!', 'info');
            }
        } catch (error) {
            console.error('Failed to submit reply:', 'error');
            this.showNotification('An error occurred while submitting your reply.', 'error');
        }
    },

    addReplyToComment(commentId, reply) {
        const comment = document.querySelector(`.comment[data-comment-id="${commentId}"]`);
        if (!comment) return;

        const repliesList = comment.querySelector('.replies-list');
        if (repliesList) {
            repliesList.insertAdjacentHTML('beforeend', Templates.reply(reply));
            this.loadReplies(commentId);
        }
    },

    async handleReplyLike(replyId, currentLikes = 0) {
        try {
            const response = await fetch(`/api/comments/replies/${replyId}/like`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ replyId }),
            });

            if (response.ok) {
                const data = await response.json();
                this.updateReplyLikes(replyId, data.likes);
                if (data.likes > currentLikes) {
                    this.showNotification("You liked a reply!", 'info');
                }
            }
        } catch (error) {
            console.error('Failed to like reply:', error);
            this.showNotification("Failed to like reply. Please try again.", 'error');
        }
    },

    updateReplyLikes(replyId, likes) {
        const reply = document.querySelector(`.reply[data-reply-id="${replyId}"]`);
        if (!reply) return;

        const likesCount = reply.querySelector('.likes-count-reply');
        const likeBtn = reply.querySelector('.like-btn-reply i');
        if (likes > 0) {
            likeBtn.classList.add('active');
        } else if (likes === 0) {
            likeBtn.classList.remove('active');
        }
        likesCount.textContent = likes;
    },
}; 