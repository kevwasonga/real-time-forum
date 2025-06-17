const Templates = {
    loginForm: `
        <div class="auth-container">
            <div class="auth-form login-form">
                <h2>Login</h2>
                <form id="login-form">
                    <div class="form-group">
                        <input type="text" name="identifier" placeholder="Email or Nickname" required>
                    </div>
                    <div class="form-group">
                        <input type="password" name="password" placeholder="Password" required>
                    </div>
                    <button type="submit" class="btn-primary">Login</button>
                </form>
                <p>Don't have an account? <a href="#" onclick="Auth.showRegisterForm()">Register</a></p>
            </div>
        </div>
    `,

    registerForm: `
        <div class="auth-container">
            <div class="auth-form register-form">
                <h2>Register</h2>
                <form id="register-form">
                    <div class="form-group">
                        <input type="text" name="nickname" placeholder="Nickname" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <input type="text" name="firstName" placeholder="First Name" required>
                        </div>
                        <div class="form-group">
                            <input type="text" name="lastName" placeholder="Last Name" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <input type="number" name="age" placeholder="Age" min="13" required>
                        </div>
                        <div class="form-group">
                            <select name="gender" required>
                                <option value="">Select Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <input type="email" name="email" placeholder="Email" required>
                    </div>
                    <div class="form-group">
                        <input type="password" name="password" placeholder="Password" required>
                        <small class="password-requirements">
                            Password must be at least 8 characters long and include uppercase, lowercase, number, and special character
                        </small>
                    </div>
                    <div class="form-group">
                        <input type="password" name="confirm_password" placeholder="Confirm Password" required>
                    </div>
                    <button type="submit" class="btn-primary">Register</button>
                </form>
                <p>Already have an account? <a href="#" onclick="Auth.showLoginForm()">Login</a></p>
            </div>
        </div>
    `,

    createPostForm: `
        <div class="create-post-form">
            <h2>Create New Post</h2>
            <form id="post-form" onsubmit="return Posts.handlePostSubmit(event)">
                <div class="form-group">
                    <input type="text" name="title" placeholder="Post Title" required>
                </div>
                <div class="form-group">
                    <div class="category-checkboxes">
                        <label class="category-checkbox">
                            <input type="checkbox" name="category" value="general">
                            <span>General</span>
                        </label>
                        <label class="category-checkbox">
                            <input type="checkbox" name="category" value="tech">
                            <span>Technology</span>
                        </label>
                        <label class="category-checkbox">
                            <input type="checkbox" name="category" value="creative">
                            <span>Creative Corner</span>
                        </label>
                        <label class="category-checkbox">
                            <input type="checkbox" name="category" value="help">
                            <span>Help & Support</span>
                        </label>
                        <label class="category-checkbox">
                            <input type="checkbox" name="category" value="food">
                            <span>Food</span>
                        </label>
                        <label class="category-checkbox">
                            <input type="checkbox" name="category" value="sports">
                            <span>Sports</span>
                        </label>
                        <label class="category-checkbox">
                            <input type="checkbox" name="category" value="lifestyle">
                            <span>Lifestyle</span>
                        </label>
                        <label class="category-checkbox">
                            <input type="checkbox" name="category" value="beauty">
                            <span>Beauty</span>
                        </label>
                        <label class="category-checkbox">
                            <input type="checkbox" name="category" value="health">
                            <span>Health</span>
                        </label>
                    </div>
                </div>
                <div class="form-group">
                    <textarea name="content" placeholder="Write your post here..." required></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="cancel-post" onclick="Posts.cancelPostForm()">Cancel</button>
                    <button type="submit" class="btn-primary">Post</button>
                </div>
            </form>
        </div>
    `,

    post: (post) => `
        <div class="post" data-post-id="${post.id}">
            <div class="post-header">
                <img src="${post.authorGender &&
            post.authorGender.toLowerCase() === "male"
            ? "/static/img/maleavatar.jpeg"
            : "/static/img/avatar.jpeg"
        }" 
                     alt="Avatar" 
                     class="post-avatar">
                <div class="post-meta">
                <div class="post-info">
                <span class="post-author">${post.authorNickname ||
                    `${post.authorFirstName} ${post.authorLastName}`
                }</span>
                <span class="post-date">${new Date(
                    post.createdAt
                ).toLocaleString()}</span>
                </div>
                </div>
                </div>
                <hr style="margin-bottom: 1em;"/>
                <div style="display: flex; gap: 1em;">
                    <h2 style="font-weight: bolder;" class="post-title">${post.title}</h2>
                    <span class="post-category">${post.category}</span>
                </div>
            <div class="post-content">${post.content}</div>
            <div class="post-actions">
                <button class="like-btn" data-post-id="${post.id}">
                    <i class="fas fa-heart"></i>
                    <span class="likes-count">${post.likes || 0}</span>
                </button>
                <button class="comment-btn" data-post-id="${post.id}">
                    <i class="fas fa-comment"></i>
                    <span class="comments-count">${post.commentCount}</span>
                </button>
            </div>
            <div class="comments-section hidden">
                <div class="comments-list">
                    ${post.comments
            ?.map((comment) => Templates.comment(comment))
            .join("") || ""
        } : No comments yet. Be the first to comment!
                </div>
                <form class="comment-form">
                    <input type="text" name="comment" placeholder="Write a comment..." required>
                    <button type="submit"><i class="fas fa-paper-plane"></i></button>
                </form>
            </div>
        </div>
    `,

    comment: (comment) => `
        <div class="comment" data-comment-id="${comment.id}">
        <div class="comment-content">
            <img src="${comment.authorGender &&
            comment.authorGender.toLowerCase() === "male"
            ? "/static/img/maleavatar.jpeg"
            : "/static/img/avatar.jpeg"}" 
            alt="Avatar" 
            class="comment-avatar">
            <div class="comment-header">
                <span class="clickable-author comment-author">${comment.authorNickname ||
        `${comment.authorFirstName} ${comment.authorLastName}`
        }</span>
                <span class="comment-date">${new Date(
            comment.createdAt
        ).toLocaleString()}</span>
            </div>
        </div>
        <p class="comment-text">${comment.content}</p>
        <div class="comment-actions">
            <button class="like-btn-comment" data-comment-id="${comment.id}">
                <i class="fas fa-heart"></i>
                <span class="likes-count-comment">${comment.likes || 0}</span>
            </button>
            <button class="comment-btn-comment" data-comment-id="${comment.id}">
                <i class="fas fa-comment"></i>
                <span class="replies-count">${comment.replyCount}</span>
            </button>
        </div>
        <div class="replies-section hidden">
            <div class="replies-list">
                ${comment.replies
            ?.map((reply) => Templates.reply(reply))
            .join("") || `No replies yet. Be the first`
        }
            </div>
            <form class="reply-form" data-comment-id="${comment.id}">
                <input type="text" name="reply" placeholder="Add a reply..." required>
                <button class="reply-btn" type="submit">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </form>
        </div>
    </div>
    <hr/>
    `,

    DM: `
    <div id="message-overlay" class="hidden">
        <div class="overlay-content">
            <h3>Message <span id="overlay-username"></span></h3>
            <form id="message-form">
                <textarea name="message" placeholder="Write your message..." required></textarea>
                <button type="submit" class="btn-primary">Send</button>
                <button type="button" id="close-overlay" class="btn-secondary">Cancel</button>
            </form>
        </div>
    </div>
    `,
    chatSection:`
        <div
        class="chat-section fixed top-0 left-0 hidden w-1/3 bg-gradient-to-br from-blue-900 to-blue-800 rounded-t-xl shadow-2xl slide-up flex flex-col h-[600px]">

        <!-- Chat Area -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4">

            <!-- Message (received) -->
            <div class="flex items-start space-x-3">
                <img src="https://via.placeholder.com/35" class="w-9 h-9 rounded-full" alt="Andre">
                <div>
                    <div class="bg-blue-700 text-white rounded-xl p-3">
                        It's all good 😊
                    </div>
                    <div class="text-gray-400 text-xs mt-1">Andre • 2:57 PM</div>
                </div>
            </div>

            <!-- Message (sent) -->
            <div class="flex items-end justify-end">
                <div class="text-right">
                    <div class="bg-blue-600 text-white rounded-xl p-3">
                        Yes, great results! 🚀
                    </div>
                    <div class="text-gray-400 text-xs mt-1">You • 2:58 PM</div>
                </div>
            </div>

        </div>
    </div>
    `,


    friendRequest: (request) => `
        <div class="friend-request" data-request-id="${request.id}">
            <img src="${request.sender.avatar || "/static/img/default-avatar.png"
        }" alt="Avatar" class="request-avatar">
            <div class="request-info">
                <span class="request-username">${request.sender.username}</span>
                <div class="request-actions">
                    <button class="accept-request" data-request-id="${request.id
        }">Accept</button>
                    <button class="decline-request" data-request-id="${request.id
        }">Decline</button>
                </div>
            </div>
        </div>
    `,

    contact: (contact) => `
        <div class="contact ${contact.online ? "online" : ""}" data-user-id="${contact.id
        }">
            <img src="${contact.avatar || "/static/img/default-avatar.png"
        }" alt="Avatar" class="contact-avatar">
            <div class="contact-info">
                <span class="contact-username">${contact.username}</span>
                <span class="contact-status">${contact.online ? "Online" : "Offline"
        }</span>
            </div>
        </div>
    `,

    message: (message) => `
        <div class="message ${message.senderId === message.currentUserId ? "sent" : "received"
        }" data-message-id="${message.id}">
            <div class="message-content">
                <p class="message-text">${message.content}</p>
                <span class="message-time">${new Date(
            message.timestamp
        ).toLocaleString()}</span>
            </div>
        </div>
    `,

    chatWindow: (user) => `
        <div
        class="w-1/3 bg-gradient-to-br from-blue-900 to-blue-800 rounded-t-xl shadow-2xl slide-up flex flex-col h-[600px]" data-user-id="${user.id}">

        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-blue-700">
            <div class="flex items-center space-x-3">
                <img src="${user.authorGender &&
            user.authorGender.toLowerCase() === "male"
            ? "/static/img/maleavatar.jpeg"
            : "/static/img/avatar.jpeg"}" 
            alt="Avatar" 
            class="comment-avatar">
                <div class="text-white font-bold">Team Chat</div>
            </div>
            <button class="text-white hover:text-blue-300 text-xl">&times;</button>
        </div>

        <!-- Chat Area -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4">

            <!-- Message (received) -->
            <div class="flex items-start space-x-3">
                <img src="https://via.placeholder.com/35" class="w-9 h-9 rounded-full" alt="Andre">
                <div>
                    <div class="bg-blue-700 text-white rounded-xl p-3">
                        It's all good 😊
                    </div>
                    <div class="text-gray-400 text-xs mt-1">Andre • 2:57 PM</div>
                </div>
            </div>

            <!-- Message (sent) -->
            <div class="flex items-end justify-end">
                <div class="text-right">
                    <div class="bg-blue-600 text-white rounded-xl p-3">
                        Yes, great results! 🚀
                    </div>
                    <div class="text-gray-400 text-xs mt-1">You • 2:58 PM</div>
                </div>
            </div>

        </div>

        <!-- Footer (Message Input) -->
        <div class="p-4 border-t border-blue-700">
            <div class="flex items-center space-x-2">
                <input type="text" placeholder="Type your message..."
                    class="flex-1 bg-blue-700 text-white placeholder-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button class="bg-blue-600 hover:bg-blue-500 text-white rounded-full p-2">
                    Send
                </button>
            </div>
        </div>

    </div>
    `,

    reply: (reply) => `
        <div class="reply" data-reply-id="${reply.id}">
            <div class="reply-content">
                <img src="${reply.authorGender &&
            reply.authorGender.toLowerCase() === "male"
            ? "/static/img/maleavatar.jpeg"
            : "/static/img/avatar.jpeg"
        }" 
                alt="Avatar" 
                class="reply-avatar">
                <div class="reply-header">
                    <span class="clickable-author reply-author">${reply.authorNickname ||
        `${reply.authorFirstName} ${reply.authorLastName}`
        }</span>
                    <span class="reply-date">${new Date(
            reply.createdAt
        ).toLocaleString()}</span>
                </div>
            </div>
            <p class="reply-text">${reply.content}</p>
            <div class="reply-actions">
                <button class="like-btn-reply" data-reply-id="${reply.id}">
                    <i class="fas fa-heart"></i>
                    <span class="likes-count-reply">${reply.likes || 0}</span>
                </button>
            </div>
        </div>
    `,

    openChat(user) {
        return `
        <div
        class="w-1/3 bg-gradient-to-br from-blue-900 to-blue-800 rounded-t-xl shadow-2xl slide-up flex flex-col h-[600px]" data-user-id="${
          user.id
        }">

        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-blue-700">
            <div class="flex items-center space-x-3">
                <img src="${
                  user.gender && user.gender.toLowerCase() === "male"
                    ? "/static/img/maleavatar.jpeg"
                    : "/static/img/avatar.jpeg"
                }" 
            alt="Avatar" 
            class="comment-avatar">
                <div class="text-white font-bold">${user.nickname}</div>
            </div>
            <button class="text-white hover:text-blue-300 text-xl">&rightarrow;</button>
        </div>

        <!-- Chat Area -->
        <div class="chat-messages flex-1 overflow-y-auto p-4 space-y-4">
        </div>

        <!-- Footer (Message Input) -->
        <div class="p-4 border-t border-blue-700">
            <div class="flex items-center space-x-2">
                <input type="text" placeholder="Type your message..."
                    class="flex-1 bg-blue-700 text-white placeholder-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button class="bg-blue-600 hover:bg-blue-500 text-white rounded-full p-2">
                    Send
                </button>
            </div>
        </div>

    </div>



            <div class="chat-overlay" id="chat-overlay-${user.id}">
                <div class="chat-header">
                    <span class="chat-user-name">${user.name}</span>
                    <button class="close-chat" data-user-id="${
                      user.id
                    }">×</button>
                </div>
                <div class="chat-messages">
                    ${messages.map((msg) => Templates.message(msg)).join("")}
                </div>
                <form class="chat-form" data-user-id="${user.id}">
                    <input type="text" name="message" placeholder="Type a message..." autocomplete="off" required />
                    <button type="submit">Send</button>
                </form>
            </div>
        `;
    },
};

// Add Auth object for handling authentication
const Auth = {
    init() {
        // Hide forum content immediately
        const appContainer = document.getElementById('app-container');
        if (appContainer) {
            appContainer.classList.add('hidden');
        }

        // Check if user is already logged in
        const user = localStorage.getItem('user');
        if (user) {
            this.verifySession().then(isValid => {
                if (isValid) {
                    this.showForumContent();
                } else {
                    localStorage.removeItem('user');
                    this.showLoginForm();
                }
            });
        } else {
            this.showLoginForm();
        }
    },

    async verifySession() {
        try {
            const response = await fetch('/api/check-session', {
                method: 'GET',
                credentials: 'include'
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    },

    showLoginForm() {
        // Ensure forum content is hidden
        const appContainer = document.getElementById('app-container');
        if (appContainer) {
            appContainer.classList.add('hidden');
        }

        // Remove any existing auth forms
        const existingAuth = document.querySelector('.auth-container');
        if (existingAuth) {
            existingAuth.remove();
        }

        // Show login form
        document.body.insertAdjacentHTML('beforeend', Templates.loginForm);

        // Add form validation feedback
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
    },

    showRegisterForm() {
        // Remove any existing auth forms
        const existingAuth = document.querySelector('.auth-container');
        if (existingAuth) {
            existingAuth.remove();
        }

        // Show register form
        document.body.insertAdjacentHTML('beforeend', Templates.registerForm);

        // Add form validation feedback
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));

            // Add real-time password validation
            const passwordInput = registerForm.querySelector('input[name="password"]');
            const confirmPasswordInput = registerForm.querySelector('input[name="confirm_password"]');

            if (passwordInput && confirmPasswordInput) {
                const validatePasswords = () => {
                    const password = passwordInput.value;
                    const confirmPassword = confirmPasswordInput.value;

                    if (password !== confirmPassword) {
                        confirmPasswordInput.setCustomValidity('Passwords do not match');
                    } else {
                        confirmPasswordInput.setCustomValidity('');
                    }

                    if (!this.validatePassword(password)) {
                        passwordInput.setCustomValidity('Password must be at least 8 characters long and include uppercase, lowercase, number, and special character');
                    } else {
                        passwordInput.setCustomValidity('');
                    }
                };

                passwordInput.addEventListener('input', validatePasswords);
                confirmPasswordInput.addEventListener('input', validatePasswords);
            }
        }
    },

    showForumContent() {
        // Remove auth container if it exists
        const authContainer = document.querySelector('.auth-container');
        if (authContainer) {
            authContainer.remove();
        }

        // Show the main forum content
        const appContainer = document.querySelector('.app-container');
        if (appContainer) {
            appContainer.classList.remove('hidden');
        }

        // Show posts container
        const postsContainer = document.getElementById('posts-container');
        if (postsContainer) {
            postsContainer.classList.remove('hidden');
        }

        // Load initial posts
        Posts.loadPosts();
    },

    async handleLogin(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const data = {
            identifier: formData.get('identifier'),
            password: formData.get('password')
        };

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const user = await response.json();
                localStorage.setItem('user', JSON.stringify(user));
                location.reload();
                this.showForumContent();
            } else {
                const error = await response.text();
                this.showError(error);
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('An error occurred during login');
        }
        return false;
    },

    async handleRegister(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);

        // Validate password match
        if (formData.get('password') !== formData.get('confirm_password')) {
            this.showError('Passwords do not match');
            return false;
        }

        // Validate password requirements
        const password = formData.get('password');
        if (!this.validatePassword(password)) {
            this.showError('Password must be at least 8 characters long and include uppercase, lowercase, number, and special character');
            return false;
        }

        const data = {
            nickname: formData.get('nickname'),
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            age: parseInt(formData.get('age')),
            gender: formData.get('gender'),
            email: formData.get('email'),
            password: password
        };

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                // Registration successful, automatically show login form
                this.showLoginForm();
            } else {
                const error = await response.text();
                this.showError(error);
            }
        } catch (error) {
            this.showError('An error occurred during registration');
        }
        return false;
    },

    validatePassword(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
    },

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;

        const form = document.querySelector('.auth-form');
        if (form) {
            form.insertBefore(errorDiv, form.firstChild);
            setTimeout(() => errorDiv.remove(), 3000);
        }
    },

    async logout() {
        try {
            const response = await fetch('/api/logout', {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                // Clear user data from localStorage
                localStorage.removeItem('user');

                // Hide forum content
                const appContainer = document.querySelector('.app-container');
                if (appContainer) {
                    appContainer.classList.add('hidden');
                }

                // Show login form
                this.showLoginForm();
            } else {
                const error = await response.text();
                this.showError(error);
            }
        } catch (error) {
            console.error('Logout error:', error);
            this.showError('An error occurred during logout');
        }
    }
};

// Initialize authentication when the page loads
document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
});

// Prevent direct access to forum content
window.addEventListener('load', () => {
    const user = localStorage.getItem('user');
    if (!user) {
        Auth.showLoginForm();
    }
});