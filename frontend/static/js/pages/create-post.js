// Create Post Page Component
window.CreatePostPage = {
    async render() {
        window.forumApp.setCurrentPage('create-post');
        
        // Require authentication
        if (!window.auth.requireAuth()) {
            return;
        }

        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="create-post-container">
                <div class="page-header">
                    <h1>Create New Post</h1>
                    <p>Share your thoughts with the community</p>
                </div>
                
                <form id="create-post-form" class="create-post-form">
                    <div class="form-group">
                        <label for="post-title">Title</label>
                        <input 
                            type="text" 
                            id="post-title" 
                            name="title" 
                            required 
                            placeholder="Enter a descriptive title for your post"
                            maxlength="200"
                        >
                    </div>
                    
                    <div class="form-group">
                        <label for="post-categories">Categories</label>
                        <div class="categories-section">
                            <div class="predefined-categories">
                                <label class="categories-label">Choose Categories:</label>

                                <!-- General Categories -->
                                <div class="category-group">
                                    <div class="category-group-header">
                                        <h4 class="category-group-title">💬 General</h4>
                                        <button type="button" class="select-all-btn" data-group="general">Select All</button>
                                    </div>
                                    <div class="category-checkboxes">
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="General Discussion" name="predefined-category">
                                            <span>General Discussion</span>
                                        </label>
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="Questions" name="predefined-category">
                                            <span>Questions</span>
                                        </label>
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="Help & Support" name="predefined-category">
                                            <span>Help & Support</span>
                                        </label>
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="Announcements" name="predefined-category">
                                            <span>Announcements</span>
                                        </label>
                                    </div>
                                </div>

                                <!-- Technology Categories -->
                                <div class="category-group">
                                    <h4 class="category-group-title">💻 Technology</h4>
                                    <div class="category-checkboxes">
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="Programming" name="predefined-category">
                                            <span>Programming</span>
                                        </label>
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="Web Development" name="predefined-category">
                                            <span>Web Development</span>
                                        </label>
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="Mobile Apps" name="predefined-category">
                                            <span>Mobile Apps</span>
                                        </label>
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="AI & Machine Learning" name="predefined-category">
                                            <span>AI & Machine Learning</span>
                                        </label>
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="Cybersecurity" name="predefined-category">
                                            <span>Cybersecurity</span>
                                        </label>
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="Hardware" name="predefined-category">
                                            <span>Hardware</span>
                                        </label>
                                    </div>
                                </div>

                                <!-- Entertainment Categories -->
                                <div class="category-group">
                                    <h4 class="category-group-title">🎬 Entertainment</h4>
                                    <div class="category-checkboxes">
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="Movies & TV" name="predefined-category">
                                            <span>Movies & TV</span>
                                        </label>
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="Music" name="predefined-category">
                                            <span>Music</span>
                                        </label>
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="Gaming" name="predefined-category">
                                            <span>Gaming</span>
                                        </label>
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="Books & Literature" name="predefined-category">
                                            <span>Books & Literature</span>
                                        </label>
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="Art & Design" name="predefined-category">
                                            <span>Art & Design</span>
                                        </label>
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="Photography" name="predefined-category">
                                            <span>Photography</span>
                                        </label>
                                    </div>
                                </div>

                                <!-- Lifestyle Categories -->
                                <div class="category-group">
                                    <h4 class="category-group-title">🌟 Lifestyle</h4>
                                    <div class="category-checkboxes">
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="Health & Fitness" name="predefined-category">
                                            <span>Health & Fitness</span>
                                        </label>
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="Food & Cooking" name="predefined-category">
                                            <span>Food & Cooking</span>
                                        </label>
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="Travel" name="predefined-category">
                                            <span>Travel</span>
                                        </label>
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="Fashion & Style" name="predefined-category">
                                            <span>Fashion & Style</span>
                                        </label>
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="Home & Garden" name="predefined-category">
                                            <span>Home & Garden</span>
                                        </label>
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="Pets & Animals" name="predefined-category">
                                            <span>Pets & Animals</span>
                                        </label>
                                    </div>
                                </div>

                                <!-- Professional Categories -->
                                <div class="category-group">
                                    <h4 class="category-group-title">💼 Professional</h4>
                                    <div class="category-checkboxes">
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="Career & Jobs" name="predefined-category">
                                            <span>Career & Jobs</span>
                                        </label>
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="Business & Entrepreneurship" name="predefined-category">
                                            <span>Business & Entrepreneurship</span>
                                        </label>
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="Finance & Investing" name="predefined-category">
                                            <span>Finance & Investing</span>
                                        </label>
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="Education & Learning" name="predefined-category">
                                            <span>Education & Learning</span>
                                        </label>
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="Marketing & Sales" name="predefined-category">
                                            <span>Marketing & Sales</span>
                                        </label>
                                    </div>
                                </div>

                                <!-- Sports & Hobbies Categories -->
                                <div class="category-group">
                                    <h4 class="category-group-title">⚽ Sports & Hobbies</h4>
                                    <div class="category-checkboxes">
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="Sports" name="predefined-category">
                                            <span>Sports</span>
                                        </label>
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="Fitness & Exercise" name="predefined-category">
                                            <span>Fitness & Exercise</span>
                                        </label>
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="Outdoor Activities" name="predefined-category">
                                            <span>Outdoor Activities</span>
                                        </label>
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="DIY & Crafts" name="predefined-category">
                                            <span>DIY & Crafts</span>
                                        </label>
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="Collecting" name="predefined-category">
                                            <span>Collecting</span>
                                        </label>
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="Board Games" name="predefined-category">
                                            <span>Board Games</span>
                                        </label>
                                    </div>
                                </div>

                                <!-- Science & Education Categories -->
                                <div class="category-group">
                                    <h4 class="category-group-title">🔬 Science & Education</h4>
                                    <div class="category-checkboxes">
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="Science & Research" name="predefined-category">
                                            <span>Science & Research</span>
                                        </label>
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="Mathematics" name="predefined-category">
                                            <span>Mathematics</span>
                                        </label>
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="History" name="predefined-category">
                                            <span>History</span>
                                        </label>
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="Philosophy" name="predefined-category">
                                            <span>Philosophy</span>
                                        </label>
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="Psychology" name="predefined-category">
                                            <span>Psychology</span>
                                        </label>
                                        <label class="category-checkbox">
                                            <input type="checkbox" value="Environment & Nature" name="predefined-category">
                                            <span>Environment & Nature</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div class="custom-categories">
                                <label for="custom-categories">Custom Categories:</label>
                                <input
                                    type="text"
                                    id="custom-categories"
                                    name="custom-categories"
                                    placeholder="Enter custom categories separated by commas"
                                >
                            </div>
                        </div>
                        <small class="form-help">Select from popular categories or add your own custom ones</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="post-content">Content</label>
                        <textarea 
                            id="post-content" 
                            name="content" 
                            required 
                            placeholder="Write your post content here..."
                            rows="10"
                        ></textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-outline" onclick="history.back()">
                            Cancel
                        </button>
                        <button type="submit" class="btn btn-primary">
                            Create Post
                        </button>
                    </div>
                </form>
            </div>
        `;

        this.bindEvents();
    },

    bindEvents() {
        const form = document.getElementById('create-post-form');
        if (form) {
            form.addEventListener('submit', this.handleSubmit.bind(this));
        }

        // Character counter for title
        const titleInput = document.getElementById('post-title');
        if (titleInput) {
            titleInput.addEventListener('input', this.updateCharacterCount.bind(this));
        }

        // Select all buttons for category groups
        const selectAllBtns = document.querySelectorAll('.select-all-btn');
        selectAllBtns.forEach(btn => {
            btn.addEventListener('click', this.handleSelectAll.bind(this));
        });

        // Category selection counter
        this.updateCategoryCounter();
        const categoryCheckboxes = document.querySelectorAll('input[name="predefined-category"]');
        categoryCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', this.updateCategoryCounter.bind(this));
        });
    },

    updateCharacterCount(event) {
        const input = event.target;
        const maxLength = input.maxLength;
        const currentLength = input.value.length;

        // Add character counter if it doesn't exist
        let counter = input.parentNode.querySelector('.char-counter');
        if (!counter) {
            counter = document.createElement('small');
            counter.className = 'char-counter form-help';
            input.parentNode.appendChild(counter);
        }

        counter.textContent = `${currentLength}/${maxLength} characters`;
        counter.style.color = currentLength > maxLength * 0.9 ? 'var(--warning-color)' : 'var(--text-muted)';
    },

    handleSelectAll(event) {
        const button = event.target;
        const categoryGroup = button.closest('.category-group');
        const checkboxes = categoryGroup.querySelectorAll('input[name="predefined-category"]');

        const allChecked = Array.from(checkboxes).every(cb => cb.checked);

        checkboxes.forEach(checkbox => {
            checkbox.checked = !allChecked;
        });

        button.textContent = allChecked ? 'Select All' : 'Deselect All';
        this.updateCategoryCounter();
    },

    updateCategoryCounter() {
        const selectedCategories = document.querySelectorAll('input[name="predefined-category"]:checked');
        const customCategoriesInput = document.getElementById('custom-categories');
        const customCategories = customCategoriesInput.value.trim()
            ? customCategoriesInput.value.split(',').filter(cat => cat.trim().length > 0).length
            : 0;

        const totalSelected = selectedCategories.length + customCategories;

        // Add or update category counter
        let counter = document.querySelector('.category-counter');
        if (!counter) {
            counter = document.createElement('div');
            counter.className = 'category-counter';
            const categoriesSection = document.querySelector('.categories-section');
            categoriesSection.appendChild(counter);
        }

        counter.innerHTML = `
            <span class="counter-text">
                ${totalSelected} ${totalSelected === 1 ? 'category' : 'categories'} selected
            </span>
            ${totalSelected > 0 ? '<button type="button" class="clear-all-btn">Clear All</button>' : ''}
        `;

        // Bind clear all button
        const clearAllBtn = counter.querySelector('.clear-all-btn');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', this.clearAllCategories.bind(this));
        }
    },

    clearAllCategories() {
        // Uncheck all predefined categories
        const checkboxes = document.querySelectorAll('input[name="predefined-category"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });

        // Clear custom categories
        const customCategoriesInput = document.getElementById('custom-categories');
        customCategoriesInput.value = '';

        // Update select all buttons
        const selectAllBtns = document.querySelectorAll('.select-all-btn');
        selectAllBtns.forEach(btn => {
            btn.textContent = 'Select All';
        });

        this.updateCategoryCounter();
    },

    async handleSubmit(event) {
        event.preventDefault();

        const form = event.target;
        const formData = new FormData(form);

        const title = formData.get('title').trim();
        const content = formData.get('content').trim();

        // Collect predefined categories
        const predefinedCategories = [];
        const checkboxes = form.querySelectorAll('input[name="predefined-category"]:checked');
        checkboxes.forEach(checkbox => {
            predefinedCategories.push(checkbox.value);
        });

        // Collect custom categories
        const customCategoriesInput = formData.get('custom-categories').trim();
        const customCategories = customCategoriesInput
            ? customCategoriesInput.split(',').map(cat => cat.trim()).filter(cat => cat.length > 0)
            : [];

        // Combine all categories
        const categories = [...predefinedCategories, ...customCategories];

        const submitBtn = form.querySelector('button[type="submit"]');

        try {
            window.utils.setLoading(submitBtn, true, 'Creating Post...');
            
            const response = await window.api.createPost({
                title,
                content,
                categories
            });

            if (response.success) {
                if (window.forumApp.notificationComponent) {
                    window.forumApp.notificationComponent.success('Post created successfully!');
                }
                
                // Navigate to the new post
                if (window.forumApp.router) {
                    window.forumApp.router.navigate(`/post/${response.data.id}`);
                }
            }

        } catch (error) {
            console.error('Failed to create post:', error);
            if (window.forumApp.notificationComponent) {
                window.forumApp.notificationComponent.error(error.message || 'Failed to create post');
            }
        } finally {
            window.utils.setLoading(submitBtn, false);
        }
    }
};
