// API client for the Forum application

window.api = {
    baseURL: '/api',

    /**
     * Make HTTP request
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            credentials: 'include', // Include cookies for session management
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    },

    /**
     * GET request
     */
    async get(endpoint, params = {}) {
        let url = endpoint;
        if (Object.keys(params).length > 0) {
            const searchParams = new URLSearchParams();
            Object.keys(params).forEach(key => {
                if (params[key] !== null && params[key] !== undefined) {
                    searchParams.append(key, params[key]);
                }
            });
            url += '?' + searchParams.toString();
        }

        return this.request(url, {
            method: 'GET'
        });
    },

    /**
     * POST request
     */
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    /**
     * PUT request
     */
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    /**
     * DELETE request
     */
    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    },

    // Authentication endpoints
    async register(userData) {
        return this.post('/register', userData);
    },

    async login(identifier, password) {
        return this.post('/login', { identifier, password });
    },

    async logout() {
        return this.post('/logout');
    },

    async getCurrentUser() {
        return this.get('/user');
    },

    // Posts endpoints
    async getPosts(params = {}) {
        return this.get('/posts', params);
    },

    async getPost(postId) {
        return this.get(`/posts/${postId}`);
    },

    async createPost(postData) {
        return this.post('/posts', postData);
    },

    async likePost(postId, isLike) {
        return this.post('/like', { postId, isLike });
    },

    // Comments endpoints
    async createComment(commentData) {
        return this.post('/comment', commentData);
    },

    async likeComment(commentId, isLike) {
        return this.post('/like', { commentId, isLike });
    },

    // Messages endpoints
    async getConversations() {
        return this.get('/messages');
    },

    async getMessages(userId) {
        return this.get(`/messages/${userId}`);
    },

    async sendMessage(receiverId, content) {
        return this.post('/messages', { receiverId, content });
    },

    // Users endpoints
    async getUsers(params = {}) {
        return this.get('/users', params);
    },

    async getOnlineUsers() {
        return this.get('/online-users');
    },

    // Profile endpoints
    async getProfile() {
        return this.get('/profile');
    },

    async updateProfile(profileData) {
        return this.put('/profile', profileData);
    },

    // Friends endpoints
    async getFriends() {
        return this.get('/friends');
    },

    async sendFriendRequest(addresseeId) {
        return this.post('/friends', { addresseeId });
    },

    async updateFriendRequest(requesterId, action) {
        return this.put('/friends', { requesterId, action });
    },

    // Categories endpoints
    async getCategories() {
        return this.get('/categories');
    }
};

// Global error handler for API errors
window.handleAPIError = function(error, defaultMessage = 'An error occurred') {
    console.error('API Error:', error);
    
    let message = defaultMessage;
    if (error.message) {
        message = error.message;
    }
    
    // Show notification if available
    if (window.forumApp && window.forumApp.notificationComponent) {
        window.forumApp.notificationComponent.error(message);
    } else {
        // Fallback to alert
        alert(message);
    }
};

// Request interceptor for authentication
const originalRequest = window.api.request;
window.api.request = async function(endpoint, options = {}) {
    try {
        return await originalRequest.call(this, endpoint, options);
    } catch (error) {
        // Handle authentication errors
        if (error.message.includes('Authentication required') || 
            error.message.includes('Not authenticated')) {
            
            // Clear any stored user data
            if (window.forumApp) {
                window.forumApp.currentUser = null;
                window.forumApp.isAuthenticated = false;
                window.forumApp.updateAuthUI();
            }
            
            // Redirect to login if not already there
            if (window.location.pathname !== '/login' && 
                window.location.pathname !== '/register') {
                if (window.forumApp && window.forumApp.router) {
                    window.forumApp.router.navigate('/login');
                } else {
                    window.location.href = '/login';
                }
            }
        }
        
        throw error;
    }
};
