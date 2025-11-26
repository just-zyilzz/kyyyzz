/**
 * Security & Anti-Inspect Protection
 * Prevents casual users from inspecting the code
 */

(function () {
    'use strict';

    // 1. Disable Right-Click
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        showSecurityWarning('Right-click disabled for security');
        return false;
    });

    // 2. Disable Text Selection
    document.addEventListener('selectstart', function (e) {
        e.preventDefault();
        return false;
    });

    // 3. Disable Copy
    document.addEventListener('copy', function (e) {
        e.preventDefault();
        return false;
    });

    // 4. Disable DevTools Shortcuts
    document.addEventListener('keydown', function (e) {
        // F12
        if (e.keyCode === 123) {
            e.preventDefault();
            showSecurityWarning('DevTools disabled');
            return false;
        }

        // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
        if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
            e.preventDefault();
            showSecurityWarning('DevTools disabled');
            return false;
        }

        // Ctrl+U (View Source)
        if (e.ctrlKey && e.keyCode === 85) {
            e.preventDefault();
            showSecurityWarning('View source disabled');
            return false;
        }

        // Ctrl+S (Save Page)
        if (e.ctrlKey && e.keyCode === 83) {
            e.preventDefault();
            return false;
        }
    });

    // 5. Detect DevTools Opening (Advanced)
    let devtoolsOpen = false;
    const detectDevTools = () => {
        const threshold = 160;
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;

        if (widthThreshold || heightThreshold) {
            if (!devtoolsOpen) {
                devtoolsOpen = true;
                handleDevToolsOpen();
            }
        } else {
            devtoolsOpen = false;
        }
    };

    // 6. Console Detection
    const consoleCheck = () => {
        const before = new Date();
        debugger;
        const after = new Date();
        if (after - before > 100) {
            handleDevToolsOpen();
        }
    };

    // 7. Handle DevTools Opening
    function handleDevToolsOpen() {
        // Clear console
        console.clear();

        // Warning message
        console.log('%c⚠️ SECURITY WARNING', 'color: red; font-size: 40px; font-weight: bold;');
        console.log('%cAccessing developer tools is monitored and logged.', 'color: red; font-size: 16px;');
        console.log('%cUnauthorized access may result in account suspension.', 'color: red; font-size: 16px;');

        // Optional: redirect or block
        // window.location.href = '/';
    }

    // 8. Show Security Warning Popup
    function showSecurityWarning(message) {
        const popup = document.getElementById('popup');
        if (popup) {
            popup.textContent = '🔒 ' + message;
            popup.className = 'popup show';
            popup.style.background = '#FF453A';
            setTimeout(() => popup.classList.remove('show'), 2000);
        }
    }

    // 9. Console Warning Message
    console.clear();
    console.log('%c🛡️ PROTECTED WEBSITE', 'color: #0A84FF; font-size: 24px; font-weight: bold;');
    console.log('%cThis website is protected. Unauthorized access is prohibited.', 'color: #FF453A; font-size: 14px;');
    console.log('%c© 2024 Media Tools. All rights reserved.', 'color: gray; font-size: 12px;');

    // 10. Prevent Iframe Embedding (Clickjacking Protection)
    if (window.top !== window.self) {
        window.top.location = window.self.location;
    }

    // 11. Run Detection Periodically
    setInterval(detectDevTools, 1000);

    // 12. Run Console Check (less frequent to avoid performance)
    setInterval(consoleCheck, 5000);

    // 13. Disable Drag & Drop
    document.addEventListener('dragstart', function (e) {
        e.preventDefault();
        return false;
    });

    // 14. Clear Console Periodically (when DevTools detected)
    setInterval(() => {
        if (devtoolsOpen) {
            console.clear();
            handleDevToolsOpen();
        }
    }, 2000);

})();
