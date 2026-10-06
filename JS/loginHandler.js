// Store user credentials with hashed passwords
const userDatabase = new Map();

// Toggle password visibility
function togglePassword(inputId, toggleElement) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        toggleElement.textContent = '🙈';
    } else {
        input.type = 'password';
        toggleElement.textContent = '👁️';
    }
}

// Validate password strength
function validatePasswordStrength(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const errors = [];
    if (password.length < minLength) {
        errors.push(`At least ${minLength} characters`);
    }
    if (!hasUpperCase) {
        errors.push('One uppercase letter');
    }
    if (!hasLowerCase) {
        errors.push('One lowercase letter');
    }
    if (!hasNumbers) {
        errors.push('One number');
    }
    if (!hasSpecialChar) {
        errors.push('One special character');
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// Show custom modal instead of alert
function showModal(message, type = 'info') {
    // Remove existing modal if any
    const existingModal = document.getElementById('customModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'customModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content ${type}">
            <span class="close-modal" onclick="closeModal()">&times;</span>
            <p>${message}</p>
            <button onclick="closeModal()" class="modal-btn">OK</button>
        </div>
    `;
    document.body.appendChild(modal);

    // Show modal with animation
    setTimeout(() => modal.classList.add('show'), 10);
}

// Close modal
function closeModal() {
    const modal = document.getElementById('customModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
}

// Show loading spinner
function showLoading(show = true) {
    let loader = document.getElementById('loadingSpinner');
    if (show) {
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'loadingSpinner';
            loader.className = 'loading-spinner';
            loader.innerHTML = '<div class="spinner"></div>';
            document.body.appendChild(loader);
        }
        loader.style.display = 'flex';
    } else {
        if (loader) {
            loader.style.display = 'none';
        }
    }
}

// Load user database and remembered username on page load
window.addEventListener('DOMContentLoaded', function() {
    // Load saved users from localStorage
    const savedUsers = localStorage.getItem('userDatabase');
    if (savedUsers) {
        try {
            const usersArray = JSON.parse(savedUsers);
            usersArray.forEach(([username, userData]) => {
                userDatabase.set(username, userData);
            });
        } catch (e) {
            console.error('Error loading users from localStorage:', e);
        }
    }

    // Load remembered username
    const rememberedUsername = localStorage.getItem('rememberedUsername');
    if (rememberedUsername) {
        document.getElementById('logger_username').value = rememberedUsername;
        document.getElementById('remember_me').checked = true;
    }
});

// Save user database to localStorage
function saveUserDatabase() {
    const usersArray = Array.from(userDatabase.entries());
    const jsonString = JSON.stringify(usersArray);
    try {
        localStorage.setItem('userDatabase', jsonString);
    } catch (e) {
        console.error('Error saving to localStorage:', e);
    }
}

// Simple hash function for password storage
// Note: For production use, consider using a proper backend with bcrypt
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Register a new user
async function registerUser(username, password, userType = 'guest') {
    if (userDatabase.has(username)) {
        return { success: false, message: "Username already exists!" };
    }

    const hashedPassword = await hashPassword(password);
    const userData = {
        password: hashedPassword,
        type: userType
    };
    userDatabase.set(username, JSON.stringify(userData));
    saveUserDatabase(); // Save to localStorage
    return { success: true, message: "Registration successful!" };
}

// Check if credentials are correct
async function checkCredentials(username, password) {
    if (!userDatabase.has(username)) {
        return { success: false, message: "Username not found!" };
    }

    const hashedPassword = await hashPassword(password);
    const storedData = userDatabase.get(username);

    let storedHash, userType;
    try {
        const userData = JSON.parse(storedData);
        storedHash = userData.password;
        userType = userData.type;
    } catch (e) {
        // Legacy format (just password hash string)
        storedHash = storedData;
        userType = 'guest';
    }

    if (storedHash === hashedPassword) {
        return { success: true, message: "Login successful!", userType: userType };
    } else {
        return { success: false, message: "Incorrect password!" };
    }
}

// Handle registration form submission (for both guest and family)
async function handleRegister(event, userType, formId) {
    event.preventDefault();

    showLoading(true);

    const username = document.getElementById(`register_${userType}_username`).value.trim();
    const password = document.getElementById(`register_${userType}_password`).value;
    const confirmPassword = document.getElementById(`register_${userType}_password_confirm`).value;

    // Check for empty username
    if (!username) {
        showLoading(false);
        showModal("Username cannot be empty!", "error");
        return false;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
        showLoading(false);
        showModal("Passwords do not match! Please try again.", "error");
        return false;
    }

    // Validate password strength
    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.isValid) {
        showLoading(false);
        showModal("Password requirements not met:\n" + passwordCheck.errors.join("\n"), "error");
        return false;
    }

    // Register the user
    const result = await registerUser(username, password, userType);

    showLoading(false);

    if (result.success) {
        showModal(result.message + ` You can now login as a ${userType}.`, "success");
        // Clear registration form
        document.getElementById(formId).reset();
    } else {
        showModal(result.message, "error");
    }

    return false;
}

// Wrapper functions for each form
function handleRegisterGuest(event) {
    return handleRegister(event, 'guest', 'registerGuestLayout');
}

function handleRegisterFamily(event) {
    return handleRegister(event, 'family', 'registerFamilyLayout');
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();

    showLoading(true);

    const username = document.getElementById("logger_username").value.trim();
    const password = document.getElementById("logger_password").value;
    const rememberMe = document.getElementById("remember_me").checked;

    // Check credentials
    const result = await checkCredentials(username, password);

    showLoading(false);

    if (result.success) {
        // Handle "Remember me" functionality
        if (rememberMe) {
            localStorage.setItem('rememberedUsername', username);
        } else {
            localStorage.removeItem('rememberedUsername');
        }

        // Store current user in sessionStorage for the home page
        sessionStorage.setItem('currentUser', username);

        // Get user type and redirect accordingly
        const userType = result.userType || 'guest';
        if (userType === 'family') {
            window.location.href = "HTML/homeFamily.html";
        } else {
            window.location.href = "HTML/homeGuest.html";
        }
    } else {
        // Show error popup
        showModal(result.message + " Please try again.", "error");
    }

    return false;
}

// Stock Market Ticker functionality with Finnhub API
const FINNHUB_API_KEY = 'd5toh9pr01qtjet0muvgd5toh9pr01qtjet0mv00'; // Replace with your Finnhub API key

const stockSymbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX'];
let stocksData = [];

async function fetchStockQuote(symbol) {
    try {
        const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`);
        const data = await response.json();

        return {
            symbol: symbol,
            price: data.c, // current price
            change: data.d, // change
            changePercent: data.dp // percent change
        };
    } catch (error) {
        console.error(`Error fetching ${symbol}:`, error);
        return null;
    }
}

async function fetchAllStocks() {
    const promises = stockSymbols.map(symbol => fetchStockQuote(symbol));
    const results = await Promise.all(promises);
    stocksData = results.filter(stock => stock !== null);
    updateTickerDisplay();
}

function updateTickerDisplay() {
    const tickerContent = document.getElementById('ticker-content');

    // Double the stocks array for seamless loop
    const doubledStocks = [...stocksData, ...stocksData];

    let html = '';
    doubledStocks.forEach(stock => {
        const changeClass = stock.change >= 0 ? 'positive' : 'negative';
        const changeSymbol = stock.change >= 0 ? '▲' : '▼';

        html += `
            <div class="ticker-item">
                <span class="ticker-symbol">${stock.symbol}</span>
                <span class="ticker-price">$${stock.price.toFixed(2)}</span>
                <span class="ticker-change ${changeClass}">
                    ${changeSymbol} ${Math.abs(stock.changePercent).toFixed(2)}%
                </span>
            </div>
        `;
    });

    tickerContent.innerHTML = html;
}

function initStockTicker() {
    // Initial fetch
    fetchAllStocks();

    // Update every 60 seconds (Finnhub free tier allows 60 calls/minute)
    setInterval(() => {
        fetchAllStocks();
    }, 60000);
}

// Toggle registration forms visibility
function toggleRegistration(visibility) {
    const container = document.getElementById('register-forms-container');

    if (visibility) {
        container.style.display = 'flex';
        setTimeout(() => container.classList.add('show'), 10);
    } else {
        container.classList.remove('show');
        setTimeout(() => {
            container.style.display = 'none';
        }, 500);
    }
}

// Initialize stock ticker when page loads
window.addEventListener('DOMContentLoaded', () => {
    initStockTicker();
});