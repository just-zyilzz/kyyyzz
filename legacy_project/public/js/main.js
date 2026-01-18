import { initTheme } from './theme.js';
import { isUrl } from './utils.js';
import { showPopup, showInstallPrompt, hideInstallPrompt } from './ui.js';
import { handleUrlDownload, handleYouTubeSearch, handlePinterestSearch } from './download.js';

// ===== THEME HANDLING =====
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
});

// ===== SEARCH TYPE TOGGLE BUTTON =====
let currentSearchType = 'youtube'; // Default to YouTube

// Initialize toggle button
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('searchTypeToggle');
  const urlInput = document.getElementById('urlInput');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      // Toggle between youtube and pinterest
      if (currentSearchType === 'youtube') {
        currentSearchType = 'pinterest';
        this.textContent = '/pin';
        this.dataset.type = 'pinterest';
        urlInput.placeholder = 'Search Pinterest images or paste Pinterest pin URL...';
      } else {
        currentSearchType = 'youtube';
        this.textContent = '/yt';
        this.dataset.type = 'youtube';
        urlInput.placeholder = 'Paste YouTube, TikTok, Instagram, or Spotify link...';
      }
    });
  }
});

// ===== FETCH HANDLING =====
// Debounce to prevent multiple simultaneous requests
let isProcessing = false;

// Add Enter key support for input field (works on both mobile and desktop)
const urlInput = document.getElementById('urlInput');
if (urlInput) {
  urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission if inside a form
      const fetchBtn = document.getElementById('fetchBtn');
      if (fetchBtn) fetchBtn.click(); // Trigger the fetch button
    }
  });
}

const fetchBtn = document.getElementById('fetchBtn');
if (fetchBtn) {
  fetchBtn.addEventListener('click', async () => {
    const input = document.getElementById('urlInput').value.trim();
    if (!input) {
      showPopup('❌ Please enter URL', 'error');
      return;
    }

    // Prevent multiple simultaneous requests
    if (isProcessing) {
      showPopup('⏳ Please wait...', 'loading');
      return;
    }

    isProcessing = true;
    document.querySelector('.loading').style.display = 'block';
    document.querySelector('.result').style.display = 'none';

    try {
      // Check if input is URL or search keywords
      if (isUrl(input)) {
        // Handle as URL
        await handleUrlDownload(input);
      } else {
        // Handle as search - route based on currentSearchType
        if (currentSearchType === 'pinterest') {
          await handlePinterestSearch(input);
        } else {
          await handleYouTubeSearch(input);
        }
      }
    } catch (e) {
      console.error('Fetch error:', e);
      showPopup('❌ ' + e.message, 'error');
    } finally {
      document.querySelector('.loading').style.display = 'none';
      isProcessing = false;
    }
  });
}

// ===== PWA INSTALL PROMPT =====
let deferredInstallPrompt = null;

// Listen for the beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('💡 PWA Install prompt available');

  // Prevent the default mini-infobar from appearing on mobile
  e.preventDefault();

  // Store the event for later use
  deferredInstallPrompt = e;

  // Check if user has previously dismissed the prompt
  const dismissedDate = localStorage.getItem('pwaPromptDismissed');
  if (dismissedDate) {
    const daysSinceDismissed = (Date.now() - parseInt(dismissedDate)) / (1000 * 60 * 60 * 24);
    // Show again after 7 days
    if (daysSinceDismissed < 7) {
      console.log('⏭️ User dismissed prompt recently, not showing again');
      return;
    }
  }

  // Check if already installed
  if (window.matchMedia('(display-mode: standalone)').matches) {
    console.log('✅ Already running as PWA');
    return;
  }

  // Show the custom install prompt after 3 seconds
  setTimeout(() => {
    showInstallPrompt();
  }, 3000);
});

// Install button click handler
const installBtn = document.getElementById('installBtn');
if (installBtn) {
  installBtn.addEventListener('click', async () => {
    console.log('🔘 Install button clicked');

    if (!deferredInstallPrompt) {
      console.log('❌ No install prompt available');
      showPopup('❌ Install sudah aktif atau browser tidak support', 'error');
      hideInstallPrompt();
      return;
    }

    // Hide our custom prompt
    hideInstallPrompt();

    // Show the native install prompt
    deferredInstallPrompt.prompt();

    // Wait for user to respond to the prompt
    const { outcome } = await deferredInstallPrompt.userChoice;

    console.log(`👤 User choice: ${outcome}`);

    if (outcome === 'accepted') {
      showPopup('✅ App berhasil diinstall!', 'success');
      console.log('🎉 PWA installed successfully');
    } else {
      showPopup('ℹ️ Install dibatalkan', 'error');
      console.log('❌ User dismissed install prompt');
    }

    // Clear the deferred prompt
    deferredInstallPrompt = null;
  });
}

// Dismiss button click handler
const dismissBtn = document.getElementById('dismissInstallBtn');
if (dismissBtn) {
  dismissBtn.addEventListener('click', () => {
    console.log('✕ User dismissed install prompt');
    hideInstallPrompt();

    // Remember that user dismissed it (don't show again for 7 days)
    localStorage.setItem('pwaPromptDismissed', Date.now().toString());
  });
}

// Detect if app is already installed
window.addEventListener('appinstalled', (e) => {
  console.log('🎉 PWA was installed successfully');
  hideInstallPrompt();
  showPopup('✅ kfocean App berhasil diinstall!', 'success', 5000);

  // Clear the deferred prompt
  deferredInstallPrompt = null;
});
