/**
 * Security & Anti-Inspect Protection
 * Lightweight version - prevents casual inspection without breaking functionality
 */

(function () {
    'use strict';

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSecurity);
    } else {
        initSecurity();
    }

    function initSecurity() {
        // 1. Disable Right-Click
        document.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            return false;
        });

        // 2. Disable DevTools Shortcuts
        document.addEventListener('keydown', function (e) {
            // F12
            if (e.keyCode === 123) {
                e.preventDefault();
                return false;
            }

            // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
            if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
                e.preventDefault();
                return false;
            }

            // Ctrl+U (View Source)
            if (e.ctrlKey && e.keyCode === 85) {
                e.preventDefault();
                return false;
            }

            // Ctrl+S (Save Page)
            if (e.ctrlKey && e.keyCode === 83) {
                e.preventDefault();
                return false;
            }
        });

        // 3. Console Warning Message
        setTimeout(() => {
            console.clear();
            console.log('%c🛡️ PROTECTED WEBSITE', 'color: #0A84FF; font-size: 24px; font-weight: bold;');
            console.log('%c⚠️ Unauthorized access is prohibited.', 'color: #FF453A; font-size: 14px;');
        }, 1000);

        // 4. Prevent Iframe Embedding (Clickjacking Protection)
        if (window.top !== window.self) {
            window.top.location = window.self.location;
        }
    }

})();
