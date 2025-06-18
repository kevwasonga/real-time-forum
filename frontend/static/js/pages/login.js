// Login Page Component
window.LoginPage = {
    async render() {
        window.forumApp.setCurrentPage('login');
        
        // Redirect if already authenticated
        if (window.auth.redirectIfAuthenticated()) {
            return;
        }

        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="auth-container">
                <div class="auth-card">
                    <div class="auth-header">
                        <h1>Welcome Back</h1>
                        <p>Sign in to your Forum account</p>
                    </div>
                    
                    <form id="login-form" class="auth-form">
                        <div class="form-group">
                            <label for="identifier">Email or Nickname</label>
                            <input 
                                type="text" 
                                id="identifier" 
                                name="identifier" 
                                required 
                                placeholder="Enter your email or nickname"
                                autocomplete="username"
                            >
                        </div>
                        
                        <div class="form-group">
                            <label for="password">Password</label>
                            <input 
                                type="password" 
                                id="password" 
                                name="password" 
                                required 
                                placeholder="Enter your password"
                                autocomplete="current-password"
                            >
                        </div>
                        
                        <button type="submit" class="btn btn-primary btn-full">
                            Sign In
                        </button>
                    </form>
                    
                    <div class="auth-divider">
                        <span>or</span>
                    </div>
                    
                    <div class="oauth-buttons">
                        <a href="/auth/google/login" class="btn btn-outline btn-full oauth-btn">
                            <span class="oauth-icon">🔍</span>
                            Continue with Google
                        </a>
                        <a href="/auth/github/login" class="btn btn-outline btn-full oauth-btn">
                            <span class="oauth-icon">🐙</span>
                            Continue with GitHub
                        </a>
                    </div>
                    
                    <div class="auth-footer">
                        <p>Don't have an account? <a href="/register" data-route="/register">Sign up</a></p>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents();
    },

    bindEvents() {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }
    },

    async handleLogin(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        const identifier = formData.get('identifier').trim();
        const password = formData.get('password');
        
        const submitBtn = form.querySelector('button[type="submit"]');
        
        try {
            // Show loading state
            window.utils.setLoading(submitBtn, true, 'Signing In...');
            
            // Attempt login
            const result = await window.auth.login(identifier, password);
            
            if (result.success) {
                // Update app state
                window.forumApp.onAuthSuccess(result.user);
            }
            
        } catch (error) {
            console.error('Login error:', error);
            
            // Show error notification
            if (window.forumApp.notificationComponent) {
                window.forumApp.notificationComponent.error(error.message || 'Login failed');
            }
            
        } finally {
            // Remove loading state
            window.utils.setLoading(submitBtn, false);
        }
    }
};
