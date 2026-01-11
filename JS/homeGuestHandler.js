// Global variables
let currentUser = null;

// Load user data and login history on page load
window.addEventListener('DOMContentLoaded', function() {
    // Get current logged-in user from sessionStorage
    currentUser = sessionStorage.getItem('currentUser');

    if (!currentUser) {
        // No user logged in, redirect to login page
        window.location.href = "../index.html";
        return;
    }

    // Display username
    document.getElementById('display-username').textContent = currentUser;

    // Load profile data
    loadProfile();
    
    // Record this login timestamp
    recordLogin();

    // Load login history
    loadHistory();

    // Show guest notification modal if not already shown
    const hasSeenNotification = sessionStorage.getItem(`guestNotification_${currentUser}`);
    if (!hasSeenNotification) {
        showGuestModal();
    }
});

// Show guest notification modal
function showGuestModal() {
    document.getElementById('guest-notification-modal').style.display = 'flex';
}

// Close guest modal
function closeGuestModal() {
    document.getElementById('guest-notification-modal').style.display = 'none';
    sessionStorage.setItem(`guestNotification_${currentUser}`, 'true');
}

// Submit guest email for notifications
async function submitGuestEmail() {
    const email = document.getElementById('guest-email').value.trim();

    if (!email) {
        alert('Please enter a valid email address');
        return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address');
        return;
    }

    // Store email in localStorage
    const guestEmails = JSON.parse(localStorage.getItem('guestEmails') || '[]');
    const emailEntry = {
        username: currentUser,
        email: email,
        timestamp: new Date().toISOString()
    };
    guestEmails.push(emailEntry);
    localStorage.setItem('guestEmails', JSON.stringify(guestEmails));

    // Send email notification to vlad.cordos@gmail.com using EmailJS or mailto
    // For now, we'll use a form submission service (FormSubmit)
    await sendEmailNotification(email);

    alert('Thank you! We will notify you when new features are available.');
    closeGuestModal();
}

// Send email notification
async function sendEmailNotification(guestEmail) {
    // Using FormSubmit.co - a free form submission service
    const formData = new FormData();
    formData.append('_to', 'vlad.cordos@gmail.com');
    formData.append('_subject', 'New Guest Email Notification');
    formData.append('_captcha', 'false');
    formData.append('username', currentUser);
    formData.append('email', guestEmail);
    formData.append('timestamp', new Date().toLocaleString());

    try {
        // Note: This will redirect the user. For production, consider using EmailJS or a backend API
        // For now, we'll just log it and store it locally
        console.log('Guest email submitted:', guestEmail);

        // Alternative: Open mailto link (requires user action)
        // window.location.href = `mailto:vlad.cordos@gmail.com?subject=New Guest Registration&body=Username: ${currentUser}%0AEmail: ${guestEmail}`;
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

// Tab switching functionality
function openTab(tabName) {
    // Hide all tab contents
    const tabContents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove('active');
    }

    // Remove active class from all tab buttons
    const tabButtons = document.getElementsByClassName('tab-btn');
    for (let i = 0; i < tabButtons.length; i++) {
        tabButtons[i].classList.remove('active');
    }

    // Show the selected tab
    document.getElementById(tabName).classList.add('active');

    // Add active class to the clicked button
    event.target.classList.add('active');
}

// Load user profile from localStorage
function loadProfile() {
    const profileKey = `profile_${currentUser}`;
    const profileData = localStorage.getItem(profileKey);

    // Set username
    document.getElementById('profile-username').value = currentUser;

    // Set password to masked dots (always show as protected)
    const passwordInput = document.getElementById('profile-password');
    if (passwordInput) {
        passwordInput.value = '••••••••';
        passwordInput.type = 'text';
        passwordInput.readOnly = true;
    }

    if (profileData) {
        try {
            const profile = JSON.parse(profileData);
            document.getElementById('profile-gender').value = profile.gender || '';

            if (profile.avatar) {
                document.getElementById('avatar-preview').src = profile.avatar;
            }
        } catch (e) {
            console.error('Error loading profile:', e);
        }
    }
}

// Handle avatar image change
function handleAvatarChange(event) {
    const file = event.target.files[0];
    if (file) {
        // Check file size (limit to 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('avatar-preview').src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

// Toggle edit mode for username or password
function toggleEdit(field) {
    const input = document.getElementById(`profile-${field}`);
    if (input.readOnly) {
        input.readOnly = false;
        input.focus();
        if (field === 'password') {
            input.type = 'password';
            input.value = ''; // Clear password field when editing
            input.placeholder = 'Enter new password';
        }
        event.target.textContent = 'Cancel';
    } else {
        input.readOnly = true;
        if (field === 'password') {
            input.type = 'text';
            input.value = '••••••••'; // Show masked password
            input.placeholder = 'Enter new password';
        } else {
            input.value = currentUser; // Reset to original username
        }
        event.target.textContent = 'Edit';
    }
}

// Save profile changes
async function saveProfile() {
    const newUsername = document.getElementById('profile-username').value.trim();
    const newPassword = document.getElementById('profile-password').value;
    const gender = document.getElementById('profile-gender').value;
    const avatar = document.getElementById('avatar-preview').src;

    // Validate username
    if (!newUsername) {
        alert('Username cannot be empty!');
        return;
    }

    // Check if password is being changed
    if (newPassword && newPassword !== '••••••••') {
        // Validate password strength
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(newPassword);
        const hasLowerCase = /[a-z]/.test(newPassword);
        const hasNumbers = /\d/.test(newPassword);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

        if (newPassword.length < minLength || !hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
            alert('Password must be at least 8 characters long and contain:\n- At least one uppercase letter\n- At least one lowercase letter\n- At least one number\n- At least one special character');
            return;
        }

        // Hash and update password in database
        await updatePassword(currentUser, newPassword);
    }

    // Check if username is being changed
    if (newUsername !== currentUser) {
        // Check if new username already exists
        const userDatabase = JSON.parse(localStorage.getItem('userDatabase') || '[]');
        const usernameExists = userDatabase.some(([username]) => username === newUsername);

        if (usernameExists) {
            alert('Username already exists! Please choose a different username.');
            return;
        }

        // Update username in database
        updateUsername(currentUser, newUsername);
        currentUser = newUsername;
        sessionStorage.setItem('currentUser', newUsername);
        document.getElementById('display-username').textContent = newUsername;
    }

    // Save profile data
    const profileKey = `profile_${currentUser}`;
    const profileData = {
        gender: gender,
        avatar: avatar.startsWith('data:') ? avatar : null // Only save if it's a base64 image
    };

    localStorage.setItem(profileKey, JSON.stringify(profileData));

    // Reset edit mode for all fields
    const usernameInput = document.getElementById('profile-username');
    usernameInput.readOnly = true;

    const passwordInput = document.getElementById('profile-password');
    passwordInput.readOnly = true;
    passwordInput.type = 'text';
    passwordInput.value = '••••••••';

    // Reset all edit buttons
    document.querySelectorAll('.field-group button').forEach(btn => {
        btn.textContent = 'Edit';
    });

    alert('Profile updated successfully!');
}

// Hash password function
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Update password in database
async function updatePassword(username, newPassword) {
    const hashedPassword = await hashPassword(newPassword);
    const userDatabase = JSON.parse(localStorage.getItem('userDatabase') || '[]');

    const updatedDatabase = userDatabase.map(([user, userData]) => {
        if (user === username) {
            try {
                const data = JSON.parse(userData);
                data.password = hashedPassword;
                return [user, JSON.stringify(data)];
            } catch (e) {
                // Legacy format
                return [user, JSON.stringify({ password: hashedPassword, type: 'guest' })];
            }
        }
        return [user, userData];
    });

    localStorage.setItem('userDatabase', JSON.stringify(updatedDatabase));
}

// Update username in user database
function updateUsername(oldUsername, newUsername) {
    const userDatabase = JSON.parse(localStorage.getItem('userDatabase') || '[]');
    const updatedDatabase = userDatabase.map(([username, userData]) => {
        if (username === oldUsername) {
            return [newUsername, userData];
        }
        return [username, userData];
    });
    localStorage.setItem('userDatabase', JSON.stringify(updatedDatabase));

    // Update profile key
    const oldProfileKey = `profile_${oldUsername}`;
    const newProfileKey = `profile_${newUsername}`;
    const profileData = localStorage.getItem(oldProfileKey);
    if (profileData) {
        localStorage.setItem(newProfileKey, profileData);
        localStorage.removeItem(oldProfileKey);
    }

    // Update login history key
    const oldHistoryKey = `loginHistory_${oldUsername}`;
    const newHistoryKey = `loginHistory_${newUsername}`;
    const historyData = localStorage.getItem(oldHistoryKey);
    if (historyData) {
        localStorage.setItem(newHistoryKey, historyData);
        localStorage.removeItem(oldHistoryKey);
    }
}

// Record login timestamp
function recordLogin() {
    const historyKey = `loginHistory_${currentUser}`;
    const history = JSON.parse(localStorage.getItem(historyKey) || '[]');

    const now = new Date();
    const timestamp = {
        date: now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        fullTimestamp: now.getTime()
    };

    // Add new login to the beginning of the array
    history.unshift(timestamp);

    // Keep only last 50 logins
    if (history.length > 50) {
        history.splice(50);
    }

    localStorage.setItem(historyKey, JSON.stringify(history));
}

// Load and display login history
function loadHistory() {
    const historyKey = `loginHistory_${currentUser}`;
    const history = JSON.parse(localStorage.getItem(historyKey) || '[]');

    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';

    if (history.length === 0) {
        historyList.innerHTML = '<tr><td colspan="2" style="text-align: center;">No login history available</td></tr>';
        return;
    }

    history.forEach((entry) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${entry.date}</td>
            <td>${entry.time}</td>
        `;
        historyList.appendChild(row);
    });
}
