/**
 * Community Nexus - Enhanced Authentication Component
 * Handles user registration, login, logout, and session management
 */

class NexusAuth {
    constructor() {
        this.isInitialized = false;
        this.currentModal = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.isInitialized = true;
        console.log('🔐 Authentication component initialized');
    }

    setupEventListeners() {
        // Listen for authentication events
        nexusCore.on('user:unauthenticated', () => {
            this.showLoginForm();
        });

        nexusCore.on('shortcut:escape', () => {
            this.closeModal();
        });
    }

    /**
     * Display enhanced login form
     */
    showLoginForm() {
        const template = `
            <div class="nexus-modal-overlay active" id="auth-modal">
                <div class="nexus-modal nexus-animate-scale-in">
                    <div class="nexus-modal-header">
                        <h2 class="nexus-modal-title nexus-gradient-text">
                            <i class="fas fa-sign-in-alt mr-2"></i>
                            Welcome Back
                        </h2>
                        <button class="nexus-modal-close" onclick="nexusAuth.closeModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="nexus-modal-body">
                        <form id="login-form" class="space-y-6">
                            <div class="nexus-form-group">
                                <label class="nexus-label">
                                    <i class="fas fa-user mr-2"></i>
                                    Email or Username
                                </label>
                                <input 
                                    type="text" 
                                    name="identifier" 
                                    class="nexus-input" 
                                    placeholder="Enter your email or username"
                                    required
                                    autocomplete="username"
                                >
                            </div>
                            <div class="nexus-form-group">
                                <label class="nexus-label">
                                    <i class="fas fa-lock mr-2"></i>
                                    Password
                                </label>
                                <div class="relative">
                                    <input 
                                        type="password" 
                                        name="password" 
                                        class="nexus-input pr-12" 
                                        placeholder="Enter your password"
                                        required
                                        autocomplete="current-password"
                                    >
                                    <button 
                                        type="button" 
                                        class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        onclick="nexusAuth.togglePasswordVisibility(this)"
                                    >
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="flex items-center justify-between">
                                <label class="flex items-center">
                                    <input type="checkbox" class="mr-2" name="remember">
                                    <span class="text-sm text-gray-600">Remember me</span>
                                </label>
                                <a href="#" class="text-sm text-nexus-600 hover:text-nexus-700">
                                    Forgot password?
                                </a>
                            </div>
                        </form>
                    </div>
                    <div class="nexus-modal-footer">
                        <button 
                            type="button" 
                            class="nexus-btn nexus-btn-secondary"
                            onclick="nexusAuth.showRegisterForm()"
                        >
                            Create Account
                        </button>
                        <button 
                            type="submit" 
                            form="login-form"
                            class="nexus-btn nexus-btn-primary"
                        >
                            <i class="fas fa-sign-in-alt mr-2"></i>
                            Sign In
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.renderModal(template);
        this.setupLoginForm();
    }

    /**
     * Display enhanced registration form
     */
    showRegisterForm() {
        const template = `
            <div class="nexus-modal-overlay active" id="auth-modal">
                <div class="nexus-modal nexus-animate-scale-in">
                    <div class="nexus-modal-header">
                        <h2 class="nexus-modal-title nexus-gradient-text">
                            <i class="fas fa-user-plus mr-2"></i>
                            Join Community Nexus
                        </h2>
                        <button class="nexus-modal-close" onclick="nexusAuth.closeModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="nexus-modal-body">
                        <form id="register-form" class="space-y-4">
                            <div class="grid grid-cols-2 gap-4">
                                <div class="nexus-form-group">
                                    <label class="nexus-label">First Name</label>
                                    <input 
                                        type="text" 
                                        name="firstName" 
                                        class="nexus-input" 
                                        placeholder="John"
                                        required
                                        autocomplete="given-name"
                                    >
                                </div>
                                <div class="nexus-form-group">
                                    <label class="nexus-label">Last Name</label>
                                    <input 
                                        type="text" 
                                        name="lastName" 
                                        class="nexus-input" 
                                        placeholder="Doe"
                                        required
                                        autocomplete="family-name"
                                    >
                                </div>
                            </div>
                            <div class="nexus-form-group">
                                <label class="nexus-label">Username</label>
                                <input 
                                    type="text" 
                                    name="username" 
                                    class="nexus-input" 
                                    placeholder="Choose a unique username"
                                    required
                                    autocomplete="username"
                                >
                            </div>
                            <div class="nexus-form-group">
                                <label class="nexus-label">Email Address</label>
                                <input 
                                    type="email" 
                                    name="email" 
                                    class="nexus-input" 
                                    placeholder="john@example.com"
                                    required
                                    autocomplete="email"
                                >
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div class="nexus-form-group">
                                    <label class="nexus-label">Age</label>
                                    <input 
                                        type="number" 
                                        name="age" 
                                        class="nexus-input" 
                                        placeholder="18"
                                        min="13"
                                        max="120"
                                        required
                                    >
                                </div>
                                <div class="nexus-form-group">
                                    <label class="nexus-label">Gender</label>
                                    <select name="gender" class="nexus-select" required>
                                        <option value="">Select gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                        <option value="prefer-not-to-say">Prefer not to say</option>
                                    </select>
                                </div>
                            </div>
                            <div class="nexus-form-group">
                                <label class="nexus-label">Password</label>
                                <div class="relative">
                                    <input 
                                        type="password" 
                                        name="password" 
                                        class="nexus-input pr-12" 
                                        placeholder="Create a strong password"
                                        required
                                        autocomplete="new-password"
                                        minlength="8"
                                    >
                                    <button 
                                        type="button" 
                                        class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        onclick="nexusAuth.togglePasswordVisibility(this)"
                                    >
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </div>
                                <div class="mt-2">
                                    <div class="text-xs text-gray-500">
                                        Password must be at least 8 characters long
                                    </div>
                                </div>
                            </div>
                            <div class="nexus-form-group">
                                <label class="flex items-start">
                                    <input type="checkbox" class="mt-1 mr-3" name="terms" required>
                                    <span class="text-sm text-gray-600">
                                        I agree to the 
                                        <a href="#" class="text-nexus-600 hover:text-nexus-700">Terms of Service</a>
                                        and 
                                        <a href="#" class="text-nexus-600 hover:text-nexus-700">Privacy Policy</a>
                                    </span>
                                </label>
                            </div>
                        </form>
                    </div>
                    <div class="nexus-modal-footer">
                        <button 
                            type="button" 
                            class="nexus-btn nexus-btn-secondary"
                            onclick="nexusAuth.showLoginForm()"
                        >
                            Already have an account?
                        </button>
                        <button 
                            type="submit" 
                            form="register-form"
                            class="nexus-btn nexus-btn-primary"
                        >
                            <i class="fas fa-user-plus mr-2"></i>
                            Create Account
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.renderModal(template);
        this.setupRegisterForm();
    }

    /**
     * Render modal template
     */
    renderModal(template) {
        // Remove existing modal immediately
        const existingModal = document.getElementById('auth-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Remove any other auth modals that might exist
        const existingModals = document.querySelectorAll('.nexus-modal-overlay');
        existingModals.forEach(modal => {
            if (modal.id === 'auth-modal' || modal.querySelector('#login-form, #register-form')) {
                modal.remove();
            }
        });

        // Add new modal
        document.body.insertAdjacentHTML('beforeend', template);
        this.currentModal = document.getElementById('auth-modal');

        // Focus first input
        setTimeout(() => {
            const firstInput = this.currentModal.querySelector('input');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    /**
     * Setup login form handlers
     */
    setupLoginForm() {
        const form = document.getElementById('login-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin(new FormData(form));
        });
    }

    /**
     * Setup registration form handlers
     */
    setupRegisterForm() {
        const form = document.getElementById('register-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleRegistration(new FormData(form));
        });

        // Real-time validation
        this.setupFormValidation(form);
    }

    /**
     * Handle user login
     */
    async handleLogin(formData) {
        const submitBtn = document.querySelector('button[form="login-form"][type="submit"]');
        if (!submitBtn) {
            console.error('Login submit button not found');
            return;
        }
        const originalText = submitBtn.innerHTML;

        try {
            // Show loading state
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Signing In...';
            submitBtn.disabled = true;

            const loginData = {
                identifier: formData.get('identifier'),
                password: formData.get('password')
            };

            const response = await nexusCore.apiRequest('/login', 'POST', loginData);

            if (response.ok) {
                const userData = await response.json();
                nexusCore.currentUser = userData;
                nexusCore.isAuthenticated = true;
                
                nexusCore.emit('user:authenticated', userData);
                nexusCore.showNotification(`Welcome back, ${userData.firstName}!`, 'success');
                
                this.closeModal();
                
                // Redirect to main app
                nexusCore.router.navigate('/dashboard');
            } else {
                const error = await response.text();
                nexusCore.showNotification(error || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            nexusCore.showNotification('Network error. Please try again.', 'error');
        } finally {
            // Restore button state
            if (submitBtn) {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }
    }

    /**
     * Handle user registration
     */
    async handleRegistration(formData) {
        const submitBtn = document.querySelector('button[form="register-form"][type="submit"]');
        if (!submitBtn) {
            console.error('Register submit button not found');
            return;
        }
        const originalText = submitBtn.innerHTML;

        try {
            // Show loading state
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating Account...';
            submitBtn.disabled = true;

            const registrationData = {
                username: formData.get('username'),
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                email: formData.get('email'),
                age: parseInt(formData.get('age')),
                gender: formData.get('gender'),
                password: formData.get('password')
            };

            const response = await nexusCore.apiRequest('/register', 'POST', registrationData);

            if (response.ok) {
                nexusCore.showNotification('Account created successfully! Please sign in.', 'success');
                this.showLoginForm();
            } else {
                const error = await response.text();
                nexusCore.showNotification(error || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            nexusCore.showNotification('Network error. Please try again.', 'error');
        } finally {
            // Restore button state
            if (submitBtn) {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }
    }

    /**
     * Handle user logout
     */
    async logout() {
        try {
            const response = await nexusCore.apiRequest('/logout', 'POST');
            
            if (response.ok) {
                nexusCore.currentUser = null;
                nexusCore.isAuthenticated = false;
                nexusCore.emit('user:logout');
                nexusCore.showNotification('You have been signed out', 'info');
                this.showLoginForm();
            }
        } catch (error) {
            console.error('Logout error:', error);
            nexusCore.showNotification('Logout failed', 'error');
        }
    }

    /**
     * Toggle password visibility
     */
    togglePasswordVisibility(button) {
        const input = button.parentElement.querySelector('input');
        const icon = button.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'fas fa-eye';
        }
    }

    /**
     * Setup form validation
     */
    setupFormValidation(form) {
        const inputs = form.querySelectorAll('input[required]');
        
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input);
            });
            
            input.addEventListener('input', () => {
                this.clearFieldError(input);
            });
        });
    }

    /**
     * Validate individual field
     */
    validateField(input) {
        const value = input.value.trim();
        let isValid = true;
        let message = '';

        // Remove existing error
        this.clearFieldError(input);

        if (input.name === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                isValid = false;
                message = 'Please enter a valid email address';
            }
        }

        if (input.name === 'password' && value) {
            if (value.length < 8) {
                isValid = false;
                message = 'Password must be at least 8 characters long';
            }
        }

        if (input.name === 'username' && value) {
            if (value.length < 3) {
                isValid = false;
                message = 'Username must be at least 3 characters long';
            }
        }

        if (!isValid) {
            this.showFieldError(input, message);
        }

        return isValid;
    }

    /**
     * Show field error
     */
    showFieldError(input, message) {
        input.classList.add('border-red-500');
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'text-red-500 text-xs mt-1';
        errorDiv.textContent = message;
        errorDiv.setAttribute('data-error-for', input.name);
        
        input.parentElement.appendChild(errorDiv);
    }

    /**
     * Clear field error
     */
    clearFieldError(input) {
        input.classList.remove('border-red-500');
        
        const existingError = input.parentElement.querySelector(`[data-error-for="${input.name}"]`);
        if (existingError) {
            existingError.remove();
        }
    }

    /**
     * Close authentication modal
     */
    closeModal() {
        // Remove current modal if it exists
        if (this.currentModal) {
            this.currentModal.classList.remove('active');
            setTimeout(() => {
                if (this.currentModal && this.currentModal.parentNode) {
                    this.currentModal.remove();
                }
                this.currentModal = null;
            }, 300);
        }

        // Also remove any orphaned auth modals
        const orphanedModals = document.querySelectorAll('#auth-modal, .nexus-modal-overlay');
        orphanedModals.forEach(modal => {
            if (modal.querySelector('#login-form, #register-form')) {
                modal.remove();
            }
        });
    }
}

// Initialize authentication component
document.addEventListener('DOMContentLoaded', () => {
    window.nexusAuth = new NexusAuth();
    nexusCore.registerComponent('auth', NexusAuth);
});
