// ===== GITHUB AUTHENTICATION =====
let currentUser = null;

// Check auth state on page load
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuthState();
    initSidebar();
});

/**
 * Initialize sidebar menu
 */
function initSidebar() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidebarMenu = document.getElementById('sidebarMenu');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const closeSidebar = document.getElementById('closeSidebar');

    // Open sidebar
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', () => {
            sidebarMenu.classList.add('active');
            sidebarOverlay.classList.add('active');
        });
    }

    // Close sidebar
    function closeSidebarMenu() {
        sidebarMenu.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    }

    if (closeSidebar) {
        closeSidebar.addEventListener('click', closeSidebarMenu);
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebarMenu);
    }

    // ESC key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebarMenu.classList.contains('active')) {
            closeSidebarMenu();
        }
    });
}

/**
 * Check if user is logged in
 */
async function checkAuthState() {
    const loginBtn = document.getElementById('loginBtn');
    const userSection = document.getElementById('userSection');

    try {
        const res = await fetch('/api/user?action=me');

        if (res.ok) {
            const data = await res.json();
            if (data.success && data.user) {
                currentUser = data.user;
                showUserProfile(data.user);
            } else {
                showLoginButton();
            }
        } else {
            showLoginButton();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        showLoginButton();
    }
}

/**
 * Display user profile in UI
 */
function showUserProfile(user) {
    const loginBtn = document.getElementById('loginBtn');
    const userSection = document.getElementById('userSection');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');

    // Hide login button, show user section
    loginBtn.style.display = 'none';
    userSection.classList.add('active');

    // Update avatar and name
    if (user.avatar) {
        userAvatar.src = user.avatar;
        userAvatar.alt = user.username;
    } else {
        // Fallback avatar
        userAvatar.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%230A84FF"%3E%3Cpath d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/%3E%3C/svg%3E';
    }

    userName.textContent = user.username;

    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Auto-load and show history inline when user logs in
    loadInlineHistory();

    // Setup clear history button
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', clearHistory);
    }
}

/**
 * Show login button (not logged in)
 */
function showLoginButton() {
    const loginBtn = document.getElementById('loginBtn');
    const userSection = document.getElementById('userSection');

    loginBtn.style.display = 'inline-flex';
    userSection.style.display = 'none';
}

/**
 * Logout user
 */
async function logout() {
    try {
        await fetch('/api/auth?action=logout', { method: 'GET' });
        currentUser = null;
        showLoginButton();
        // Hide history section on logout
        const historySection = document.getElementById('historySection');
        if (historySection) {
            historySection.style.display = 'none';
        }
        showPopup('👋 Logged out successfully', 'success', 2000);
    } catch (error) {
        console.error('Logout error:', error);
        showPopup('❌ Logout failed', 'error', 3000);
    }
}

/**
 * Load and display history inline below container
 */
async function loadInlineHistory() {
    const historySection = document.getElementById('historySection');
    const historyList = document.getElementById('historyList');

    if (!historySection || !historyList) return;

    // Show history section
    historySection.style.display = 'block';
    historyList.innerHTML = '<p class="history-loading">Loading...</p>';

    try {
        // Get history from localStorage
        const history = getDownloadHistory();

        if (history && history.length > 0) {
            historyList.innerHTML = history.map(item => `
                <div class="history-item">
                    ${item.thumbnail ? `<img src="${item.thumbnail}" alt="${item.title || 'Thumbnail'}" loading="lazy">` : ''}
                    <div class="history-item-details">
                        <h4 class="history-item-title">${item.title || 'Untitled'}</h4>
                        <p class="history-item-meta">
                            <span style="background: var(--primary-gradient); color: white; padding: 4px 10px; border-radius: 8px; margin-right: 8px; font-size: 0.8rem; font-weight: 600;">${item.platform}</span>
                            <span>${new Date(item.timestamp).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        </p>
                    </div>
                </div>
            `).join('');
        } else {
            historyList.innerHTML = '<p class="history-loading">📭 No download history yet. Start downloading to see your history here!</p>';
        }
    } catch (error) {
        console.error('Failed to load history:', error);
        historyList.innerHTML = '<p class="history-loading" style="color: #FF453A;">❌ Failed to load history. Please try again later.</p>';
    }
}

/**
 * Clear all download history
 */
async function clearHistory() {
    if (!confirm('Are you sure you want to clear all download history?')) {
        return;
    }

    try {
        // Clear localStorage
        localStorage.removeItem('downloadHistory');
        showPopup('🗑️ History cleared successfully', 'success', 2000);
        // Reload history
        loadInlineHistory();
    } catch (error) {
        console.error('Clear history error:', error);
        showPopup('❌ Failed to clear history', 'error', 3000);
    }
}

/**
 * Get download history from localStorage
 */
function getDownloadHistory() {
    try {
        const history = localStorage.getItem('downloadHistory');
        return history ? JSON.parse(history) : [];
    } catch (error) {
        console.error('Error reading history:', error);
        return [];
    }
}

/**
 * Save download to history (localStorage)
 */
function saveToHistory(platform, title, thumbnail = null) {
    try {
        const history = getDownloadHistory();
        const newItem = {
            platform: platform.toUpperCase(),
            title: title,
            thumbnail: thumbnail,
            timestamp: new Date().toISOString()
        };

        // Add to beginning of array
        history.unshift(newItem);

        // Keep only last 50 items
        const trimmedHistory = history.slice(0, 50);

        // Save to localStorage
        localStorage.setItem('downloadHistory', JSON.stringify(trimmedHistory));

        // Reload history display if section is visible
        if (currentUser) {
            loadInlineHistory();
        }
    } catch (error) {
        console.error('Error saving to history:', error);
    }
}
