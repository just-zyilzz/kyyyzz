// Theme handling
export function initTheme() {
  const btn = document.getElementById('theme-toggle');
  const stored = localStorage.getItem('theme');
  if (stored === 'dark') document.body.classList.add('dark');
  else if (stored === 'light') document.body.classList.remove('dark');
  else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.body.classList.add('dark');
  }

  if (btn) {
    const applyButton = () => {
      const isDark = document.body.classList.contains('dark');
      btn.textContent = isDark ? '☀️' : '🌙';
      btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
      btn.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
    };

    applyButton();

    btn.addEventListener('click', () => {
      document.body.classList.toggle('dark');
      const isDark = document.body.classList.contains('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      applyButton();
    });

    if (!localStorage.getItem('theme') && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e) => {
        document.body.classList.toggle('dark', e.matches);
        applyButton();
      };
      // Use addEventListener for better compatibility
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(handleChange);
      }
    }
  }
}
