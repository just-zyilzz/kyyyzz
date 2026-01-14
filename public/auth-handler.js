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

    // Setup history button (in sidebar)
    const historyBtn = document.getElementById('historyBtn');
    if (historyBtn) {
        historyBtn.addEventListener('click', () => {
            // Close sidebar first
            document.getElementById('sidebarMenu').classList.remove('active');
            document.getElementById('sidebarOverlay').classList.remove('active');
            // Show history
            showHistory();
        });
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
        showPopup('👋 Logged out successfully', 'success', 2000);
    } catch (error) {
        console.error('Logout error:', error);
        showPopup('❌ Logout failed', 'error', 3000);
    }
}

/**
 * Show download history modal
 */
async function showHistory() {
    const modal = document.getElementById('historyModal');
    const historyList = document.getElementById('historyList');

    if (!modal) return;

    modal.style.display = 'flex';
    historyList.innerHTML = '<p>Loading...</p>';

    try {
        const res = await fetch('/api/user?action=history');
        const data = await res.json();

        if (data.success && data.history && data.history.length > 0) {
            historyList.innerHTML = data.history.map(item => `
        <div style="padding: 12px; border-bottom: 1px solid #eee;">
          <div style="font-weight: 600; color: #333; margin-bottom: 4px;">${item.title || 'Untitled'}</div>
          <div style="font-size: 12px; color: #666;">
            <span style="background: #667eea; color: white; padding: 2px 6px; border-radius: 4px; margin-right: 6px;">${item.platform}</span>
            <span>${new Date(item.timestamp).toLocaleString('id-ID')}</span>
          </div>
        </div>
      `).join('');
        } else {
            historyList.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No download history yet</p>';
        }
    } catch (error) {
        console.error('Failed to load history:', error);
        historyList.innerHTML = '<p style="text-align: center; color: #ff6b6b; padding: 20px;">Failed to load history</p>';
    }
}

// Close history modal
document.addEventListener('click', (e) => {
    const modal = document.getElementById('historyModal');
    const closeBtn = document.querySelector('.close-modal');

    if (e.target === modal || e.target === closeBtn) {
        modal.style.display = 'none';
    }
});
