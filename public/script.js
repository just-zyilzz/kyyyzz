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
  if (lowerUrl.includes('tiktok.com') || lowerUrl.includes('vt.tiktok.com') || lowerUrl.includes('vm.tiktok.com')) return 'TikTok';
  if (lowerUrl.includes('instagram.com')) return 'Instagram';
  if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch') || lowerUrl.includes('fb.com')) return 'Facebook';
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
    let metadata;

    // Get metadata based on platform
    if (platform === 'YouTube') {
      const res = await fetch('/api/thumb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      metadata = await res.json();
    } else if (platform === 'TikTok') {
      const res = await fetch('/api/tiktok-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      metadata = await res.json();
    } else {
      // For Instagram/Facebook, show basic info
      metadata = {
        success: true,
        title: 'Media dari ' + platform,
        platform: platform,
        thumbnailUrl: null
      };
    }

    if (metadata.success) {
      const resultDiv = document.querySelector('.result');
      resultDiv.innerHTML = `
        ${metadata.thumbnail || metadata.thumbnailUrl ? `<img src="${metadata.thumbnail || metadata.thumbnailUrl}" alt="Thumbnail" style="max-height:500px; width:100%; border-radius:12px; margin-bottom:15px;">` : ''}
        <div class="meta">
          <p><strong>Platform:</strong> ${platform}</p>
          ${metadata.title ? `<p><strong>Judul:</strong> ${metadata.title}</p>` : ''}
          ${metadata.author ? `<p><strong>Author:</strong> ${metadata.author}</p>` : ''}
          ${metadata.duration ? `<p><strong>Durasi:</strong> ${metadata.duration}s</p>` : ''}
          ${metadata.stats ? `<p><strong>Views:</strong> ${metadata.stats.views} | <strong>Likes:</strong> ${metadata.stats.likes}</p>` : ''}
        </div>
        <div class="download-btns">
          <button class="dl-video" data-url="${url}" data-platform="${platform}">📥 Download Video</button>
          ${platform === 'YouTube' || platform === 'TikTok' ? `<button class="dl-audio" data-url="${url}" data-platform="${platform}">🎵 Download Audio</button>` : ''}
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
      throw new Error(metadata.error || 'Gagal mengambil metadata');
    }
  } catch (e) {
    alert('Error: ' + e.message);
  } finally {
    document.querySelector('.loading').style.display = 'none';
  }
});

// Trigger auto-download
function triggerDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'download';
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function download(url, format, platform) {
  const popup = document.getElementById('popup');

  // Show loading
  popup.textContent = '⏳ Sedang memproses...';
  popup.className = 'popup show';
  popup.style.background = 'rgba(28, 28, 30, 0.95)';

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
    } else {
      throw new Error('Platform tidak didukung');
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (data.success) {
      // Get download URL from different response formats
      const downloadUrl = data.downloadUrl || data.download || (data.urls && data.urls[0]);
      const fileName = data.fileName || `download_${Date.now()}.${format === 'audio' ? 'mp3' : 'mp4'}`;

      if (downloadUrl) {
        // Trigger auto-download
        triggerDownload(downloadUrl, fileName);

        popup.textContent = '✅ Download dimulai!';
        popup.className = 'popup show';
        popup.style.background = '#30D158';
        setTimeout(() => popup.classList.remove('show'), 3000);
      } else {
        throw new Error('Download URL tidak ditemukan');
      }
    } else {
      throw new Error(data.error || 'Gagal download');
    }
  } catch (e) {
    popup.textContent = '❌ Error: ' + e.message;
    popup.className = 'popup show';
    popup.style.background = '#FF453A';
    setTimeout(() => {
      popup.classList.remove('show');
    }, 4000);
  }
}