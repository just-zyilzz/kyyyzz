// ===== GITHUB AUTHENTICATION =====
let currentUser = null;

// Check auth state on page load
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuthState();
});

/**
 * Check if user is logged in
 */
async function checkAuthState() {
    const loginBtn = document.getElementById('loginBtn');
    const userSection = document.getElementById('userSection');
    const usernameDisplay = document.getElementById('usernameDisplay');

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
    const usernameDisplay = document.getElementById('usernameDisplay');

    // Hide login button, show user section
    loginBtn.style.display = 'none';
    userSection.style.display = 'flex';

    // Update username display with avatar if available
    if (user.avatar) {
        usernameDisplay.innerHTML = `
      <img src="${user.avatar}" alt="${user.username}" 
           style="width: 24px; height: 24px; border-radius: 50%; margin-right: 6px; vertical-align: middle;">
      <span>${user.username}</span>
    `;
    } else {
        usernameDisplay.textContent = user.username;
    }

    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Setup history button
    const historyBtn = document.getElementById('historyBtn');
    if (historyBtn) {
        historyBtn.addEventListener('click', showHistory);
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
