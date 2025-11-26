document.addEventListener('DOMContentLoaded', () => { initTheme(); });

// Theme handling
function initTheme() {
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
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        document.body.classList.toggle('dark', e.matches);
        applyButton();
      });
    }
  }
}

// Detect platform from URL
function detectPlatform(url) {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'YouTube';
  if (lowerUrl.includes('tiktok.com')) return 'TikTok';
  if (lowerUrl.includes('instagram.com')) return 'Instagram';
  if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch')) return 'Facebook';
  return 'Unknown';
}

document.getElementById('fetchBtn').addEventListener('click', async () => {
  const url = document.getElementById('urlInput').value.trim();
  if (!url) return alert('Masukkan URL terlebih dahulu.');

  const platform = detectPlatform(url);
  if (platform === 'Unknown') {
    return alert('Platform tidak didukung. Gunakan YouTube, TikTok, Instagram, atau Facebook.');
  }

  document.querySelector('.loading').style.display = 'block';
  document.querySelector('.result').style.display = 'none';

  try {
    // Get metadata from thumb endpoint
    const res = await fetch('/api/thumb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    const data = await res.json();

    if (data.success) {
      const resultDiv = document.querySelector('.result');
      resultDiv.innerHTML = `
        ${data.thumbnailUrl || data.thumbnail ? `<img src="${data.thumbnailUrl || data.thumbnail}" alt="Thumbnail" style="max-height:500px; width:100%; border-radius:12px; margin-bottom:15px;">` : ''}
        <div class="meta">
          <p><strong>Judul:</strong> ${data.title || '—'}</p>
          <p><strong>Platform:</strong> ${platform}</p>
          ${data.duration ? `<p><strong>Durasi:</strong> ${data.duration}</p>` : ''}
        </div>
        <div class="download-btns">
          <button class="dl-video" data-url="${url}" data-platform="${platform}">📥 Download Video</button>
          ${platform === 'YouTube' ? `<button class="dl-audio" data-url="${url}" data-platform="${platform}">🎵 Download MP3</button>` : ''}
        </div>
      `;
      resultDiv.style.display = 'block';

      // Attach download handlers
      document.querySelectorAll('.dl-video, .dl-audio').forEach(btn => {
        btn.onclick = (e) => {
          const format = e.target.classList.contains('dl-audio') ? 'audio' : 'video';
          const platform = e.target.dataset.platform;
          download(e.target.dataset.url, format, platform);
        };
      });
    } else {
      throw new Error(data.error || 'Gagal mengambil metadata');
    }
  } catch (e) {
    alert('Error: ' + e.message);
  } finally {
    document.querySelector('.loading').style.display = 'none';
  }
});

async function download(url, format, platform) {
  const popup = document.getElementById('popup');

  // Show loading
  popup.textContent = '⏳ Downloading...';
  popup.className = 'popup show';

  try {
    let endpoint;
    let body = { url };

    // Determine endpoint based on platform and format
    if (platform === 'YouTube') {
      endpoint = format === 'audio' ? '/api/ytmp3' : '/api/ytmp4';
    } else if (platform === 'TikTok') {
      endpoint = '/api/tiktok';
      body.format = format;
    } else if (platform === 'Instagram' || platform === 'Facebook') {
      endpoint = '/api/facebook';
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (data.success) {
      // Open download URL in new tab
      const downloadUrl = data.downloadUrl || data.download;
      if (downloadUrl) {
        window.open(downloadUrl, '_blank');
        popup.textContent = '✅ Download dimulai!';
        popup.className = 'popup show';
        setTimeout(() => popup.classList.remove('show'), 3000);
      } else {
        throw new Error('Download URL not found');
      }
    } else {
      throw new Error(data.error || 'Gagal download');
    }
  } catch (e) {
    popup.textContent = '❌ Gagal: ' + e.message;
    popup.className = 'popup show';
    popup.style.background = '#f44336';
    setTimeout(() => {
      popup.classList.remove('show');
      popup.style.background = '#4caf50';
    }, 3000);
  }
}