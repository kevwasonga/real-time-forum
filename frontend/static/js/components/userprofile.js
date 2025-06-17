const UserProfile = {
    async updateUserProfileData() {
        try {
            const response = await fetch('/api/user/profile', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (response.ok) {
                const userData = await response.json();
                // Update header profile picture based on gender
                const headerProfilePic = document.getElementById('header-profile-pic');
                if (headerProfilePic && userData.gender) {
                    headerProfilePic.src = userData.gender.toLowerCase() === 'male' 
                        ? '/static/img/maleavatar.jpeg' 
                        : '/static/img/avatar.jpeg';
                }
            }
        } catch (error) {
            console.error('Error fetching initial profile data:', error);
        }
    },

    async showUserProfile() {
        try {
            // Fetch user data from the server
            const response = await fetch('/api/user/profile', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // User is not authenticated, redirect to login
                    window.location.href = '/';
                    return;
                }
                throw new Error('Failed to fetch user profile');
            }

            const userData = await response.json();
            
            // Update header profile picture based on gender
            const headerProfilePic = document.getElementById('header-profile-pic');
            if (headerProfilePic && userData.gender) {
                headerProfilePic.src = userData.gender.toLowerCase() === 'male' 
                    ? '/static/img/maleavatar.jpeg' 
                    : '/static/img/avatar.jpeg';
            }
            
            // Create and show the profile modal
            this.createProfileModal(userData);
        } catch (error) {
            console.error('Error fetching user profile:', error);
            // Show error message to user
            App.showNotification('Failed to load profile information', 'error');
        }
    },

    createProfileModal(userData) {
        // Remove any existing profile modal
        const existingModal = document.querySelector('.profile-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Get the appropriate avatar based on gender
        const avatarSrc = userData.gender && userData.gender.toLowerCase() === 'male' 
            ? '/static/img/maleavatar.jpeg' 
            : '/static/img/avatar.jpeg';

        // Create modal HTML
        const modalHTML = `
            <div class="profile-modal">
                <div class="profile-modal-content">
                    <div class="profile-modal-header">
                        <h2>Your Profile</h2>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div class="profile-modal-body">
                        <div class="profile-info">
                            <div class="profile-avatar">
                                <img src="${avatarSrc}" alt="Profile" class="profile-pic">
                            </div>
                            <div class="profile-details">
                                <div class="profile-field">
                                    <label>Nickname:</label>
                                    <span id="profile-nickname">${userData.nickname || 'N/A'}</span>
                                </div>
                                <div class="profile-field">
                                    <label>Email:</label>
                                    <span id="profile-email">${userData.email || 'N/A'}</span>
                                </div>
                                <div class="profile-field">
                                    <label>First Name:</label>
                                    <span id="profile-firstname">${userData.firstName || 'N/A'}</span>
                                </div>
                                <div class="profile-field">
                                    <label>Last Name:</label>
                                    <span id="profile-lastname">${userData.lastName || 'N/A'}</span>
                                </div>
                                <div class="profile-field">
                                    <label>Age:</label>
                                    <span id="profile-age">${userData.age || 'N/A'}</span>
                                </div>
                                <div class="profile-field">
                                    <label>Gender:</label>
                                    <span id="profile-gender">${userData.gender || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                        <div class="profile-actions">
                            <button id="edit-profile-btn" class="btn-primary">Edit Profile</button>
                            <button id="delete-account-btn" class="btn-danger">Delete Account</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Insert modal into the DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Add event listeners for modal buttons
        const closeModalBtn = document.querySelector('.close-modal');
        const editProfileBtn = document.getElementById('edit-profile-btn');
        const deleteAccountBtn = document.getElementById('delete-account-btn');

        closeModalBtn.addEventListener('click', () => {
            document.querySelector('.profile-modal').remove();
        });

        editProfileBtn.addEventListener('click', () => {
            this.showEditProfileForm(userData);
        });

        deleteAccountBtn.addEventListener('click', () => {
            this.confirmDeleteAccount();
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            const modal = document.querySelector('.profile-modal');
            if (e.target === modal) {
                modal.remove();
            }
        });
    },

    showEditProfileForm(userData) {
        // Remove the profile modal
        document.querySelector('.profile-modal').remove();

        // Create edit form HTML
        const editFormHTML = `
            <div class="profile-modal">
                <div class="profile-modal-content">
                    <div class="profile-modal-header">
                        <h2>Edit Profile</h2>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div class="profile-modal-body">
                        <form id="edit-profile-form" class="profile-form">
                            <div class="form-group">
                                <label for="edit-nickname">Nickname</label>
                                <input type="text" id="edit-nickname" name="nickname" value="${userData.nickname || ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="edit-first-name">First Name</label>
                                <input type="text" id="edit-first-name" name="firstName" value="${userData.firstName || ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="edit-last-name">Last Name</label>
                                <input type="text" id="edit-last-name" name="lastName" value="${userData.lastName || ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="edit-age">Age</label>
                                <input type="number" id="edit-age" name="age" value="${userData.age || ''}" min="13" required>
                            </div>
                            <div class="form-group">
                                <label for="edit-gender">Gender</label>
                                <select id="edit-gender" name="gender" required>
                                    <option value="">Select Gender</option>
                                    <option value="male" ${userData.gender === 'male' ? 'selected' : ''}>Male</option>
                                    <option value="female" ${userData.gender === 'female' ? 'selected' : ''}>Female</option>
                                </select>
                            </div>
                            <div class="form-actions">
                                <button type="button" id="cancel-edit-btn" class="btn-secondary">Cancel</button>
                                <button type="submit" class="btn-primary">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Insert edit form into the DOM
        document.body.insertAdjacentHTML('beforeend', editFormHTML);

        // Add event listeners for form
        const closeModalBtn = document.querySelector('.close-modal');
        const cancelEditBtn = document.getElementById('cancel-edit-btn');
        const editProfileForm = document.getElementById('edit-profile-form');

        closeModalBtn.addEventListener('click', () => {
            document.querySelector('.profile-modal').remove();
        });

        cancelEditBtn.addEventListener('click', () => {
            document.querySelector('.profile-modal').remove();
            this.showUserProfile(); // Show the profile modal again
        });

        editProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Create an empty formData object
            const formData = {};
            
            // Only include fields that have been changed
            const nickname = document.getElementById('edit-nickname').value;
            const firstName = document.getElementById('edit-first-name').value;
            const lastName = document.getElementById('edit-last-name').value;
            const age = document.getElementById('edit-age').value;
            const gender = document.getElementById('edit-gender').value;
            
            // Add only non-empty fields to formData
            if (nickname) formData.nickname = nickname;
            if (firstName) formData.firstName = firstName;
            if (lastName) formData.lastName = lastName;
            if (age) formData.age = parseInt(age, 10);
            if (gender) formData.gender = gender;
            
            // Check if any fields were changed
            if (Object.keys(formData).length === 0) {
                App.showNotification('No changes were made', 'info');
                document.querySelector('.profile-modal').remove();
                return;
            }

            try {
                const response = await fetch('/api/user/profile', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify(formData)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Error response:', errorText);
                    throw new Error(errorText || 'Failed to update profile');
                }

                // Show success message
                App.showNotification('Profile updated successfully', 'success');
                
                // Remove the edit form
                document.querySelector('.profile-modal').remove();
                
                // Show the updated profile
                this.showUserProfile();
            } catch (error) {
                console.error('Error updating profile:', error);
                App.showNotification(error.message || 'Failed to update profile', 'error');
            }
        });
    },

    confirmDeleteAccount() {
        // Remove the profile modal
        document.querySelector('.profile-modal').remove();

        // Create confirmation modal
        const confirmModalHTML = `
            <div class="profile-modal">
                <div class="profile-modal-content">
                    <div class="profile-modal-header">
                        <h2>Delete Account</h2>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div class="profile-modal-body">
                        <div class="delete-confirmation">
                            <p>Are you sure you want to delete your account? This action cannot be undone.</p>
                            <p>All your data, including posts, comments, and messages will be permanently deleted.</p>
                        </div>
                        <div class="form-actions">
                            <button id="cancel-delete-btn" class="btn-secondary">Cancel</button>
                            <button id="confirm-delete-btn" class="btn-danger">Delete Account</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Insert confirmation modal into the DOM
        document.body.insertAdjacentHTML('beforeend', confirmModalHTML);

        // Add event listeners for buttons
        const closeModalBtn = document.querySelector('.close-modal');
        const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
        const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

        closeModalBtn.addEventListener('click', () => {
            document.querySelector('.profile-modal').remove();
        });

        cancelDeleteBtn.addEventListener('click', () => {
            document.querySelector('.profile-modal').remove();
            this.showUserProfile(); // Show the profile modal again
        });

        confirmDeleteBtn.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/user/profile', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error('Failed to delete account');
                }

                // Show success message
                App.showNotification('Account deleted successfully', 'success');
                
                // Redirect to login page or show login form
                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
            } catch (error) {
                console.error('Error deleting account:', error);
                App.showNotification('Failed to delete account', 'error');
            }
        });
    }
}; 