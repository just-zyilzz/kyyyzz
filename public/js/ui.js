// UI Helper functions

export function showPopup(message, state = 'loading', duration = 3000) {
  const popup = document.getElementById('popup');
  popup.textContent = message;

  // Use CSS classes based on state
  let stateClass = '';
  if (state === 'loading') {
    stateClass = 'popup-loading';
  } else if (state === 'success') {
    stateClass = 'popup-success';
  } else if (state === 'error') {
    stateClass = 'popup-error';
    // Show error longer so user can read it
    if (duration === 3000) duration = 5000;
  }

  popup.className = `popup show ${stateClass}`;

  setTimeout(() => {
    popup.classList.remove('show');
  }, duration);
}

// Show install prompt
export function showInstallPrompt() {
  const installPrompt = document.getElementById('installPrompt');
  if (installPrompt) {
    installPrompt.classList.remove('hidden');
    console.log('📱 Showing install prompt');
  }
}

// Hide install prompt
export function hideInstallPrompt() {
  const installPrompt = document.getElementById('installPrompt');
  if (installPrompt) {
    installPrompt.classList.add('hidden');
  }
}
