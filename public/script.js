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

// Detect if input is URL or keywords
function isUrl(text) {
  try {
    new URL(text);
    return true;
  } catch {
    return text.includes('youtube.com') ||
      text.includes('youtu.be') ||
      text.includes('tiktok.com') ||
      text.includes('instagram.com') ||
      text.includes('facebook.com') ||
      text.includes('fb.watch');
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
  const input = document.getElementById('urlInput').value.trim();
  if (!input) return alert('Masukkan URL atau keywords terlebih dahulu.');

  document.querySelector('.loading').style.display = 'block';
  document.querySelector('.result').style.display = 'none';

  try {
    // Check if input is URL or search keywords
    if (isUrl(input)) {
      // Handle as URL
      await handleUrlDownload(input);
    } else {
      // Handle as YouTube search
      await handleYouTubeSearch(input);
    }
  } catch (e) {
    alert('Error: ' + e.message);
  } finally {
    document.querySelector('.loading').style.display = 'none';
  }
});

// Handle YouTube search
async function handleYouTubeSearch(keywords) {
  const res = await fetch('/api/yt-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: keywords, limit: 10, type: 'video' })
  });

  const data = await res.json();

  // Defensive check for undefined results
  if (!data.success || !data.results || !Array.isArray(data.results) || data.results.length === 0) {
    throw new Error('Tidak ada hasil ditemukan');
  }

  // Display search results
  const resultDiv = document.querySelector('.result');
  let html = `<h3 style="margin-bottom: 20px;">🔍 Hasil Pencarian: "${keywords}"</h3>`;

  data.results.forEach((video, index) => {
    html += `
      <div class="search-result-item" data-video-url="${video.url || ''}" data-video-title="${video.title || ''}" style="display: flex; gap: 15px; padding: 15px; background: var(--input-bg); border-radius: 12px; margin-bottom: 12px; cursor: pointer; transition: all 0.2s;">
        <img src="${video.thumbnail || ''}" alt="${video.title || ''}" style="width: 120px; height: 90px; object-fit: cover; border-radius: 8px;">
        <div style="flex: 1;">
          <h4 style="margin: 0 0 8px 0; font-size: 14px; color: var(--text-primary);">${video.title || ''}</h4>
          <p style="margin: 4px 0; font-size: 12px; color: var(--text-secondary);">
            👤 ${video.author?.name || 'Unknown'} | 👁️ ${(video.views || 0).toLocaleString()} views
          </p>
          <p style="margin: 4px 0; font-size: 12px; color: var(--text-secondary);">
            ⏱️ ${video.duration?.timestamp || '0:00'} | 📅 ${video.ago || ''}
          </p>
        </div>
      </div>
    `;
  });

  resultDiv.innerHTML = html;
  resultDiv.style.display = 'block';

  // Add event listeners to search results
  document.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', function () {
      const url = this.getAttribute('data-video-url');
      const title = this.getAttribute('data-video-title');
      selectVideo(url, title);
    });
  });
}

// Select video from search results
async function selectVideo(url, title) {
  document.getElementById('urlInput').value = url;

  // Show loading
  document.querySelector('.loading').style.display = 'block';
  document.querySelector('.result').style.display = 'none';

  try {
    await handleUrlDownload(url);
  } catch (e) {
    alert('Error: ' + e.message);
  } finally {
    document.querySelector('.loading').style.display = 'none';
  }
}

// Handle URL download (existing logic)
async function handleUrlDownload(url) {
  const platform = detectPlatform(url);

  if (platform === 'Unknown') {
    throw new Error('Platform tidak didukung. Gunakan YouTube, TikTok, Instagram, atau Facebook.');
  }

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
  } else if (platform === 'Instagram') {
    const res = await fetch('/api/instagram-meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    metadata = await res.json();
  } else if (platform === 'Facebook') {
    // Facebook - no metadata preview
    metadata = {
      success: true,
      title: 'Media dari Facebook',
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
}

// Download file with proper CORS handling
async function downloadFile(url, filename) {
  try {
    // Try direct download first (works for same-origin or CORS-enabled URLs)
    const response = await fetch(url);
    const blob = await response.blob();

    // Create blob URL and trigger download
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);

    return true;
  } catch (e) {
    // Fallback: open in new tab (for CORS-blocked URLs)
    console.log('Direct download failed, opening in new tab:', e.message);
    window.open(url, '_blank');
    return false;
  }
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

      // FIX: Ensure fileName always has proper extension
      let fileName = data.fileName;
      const ext = format === 'audio' ? '.mp3' : '.mp4';

      if (!fileName) {
        fileName = `download_${Date.now()}${ext}`;
      } else if (!fileName.toLowerCase().endsWith(ext)) {
        fileName += ext;
      }

      if (downloadUrl) {
        popup.textContent = '⏳ Memulai download...';

        // Try to download file
        const downloaded = await downloadFile(downloadUrl, fileName);

        if (downloaded) {
          popup.textContent = '✅ Download selesai!';
        } else {
          popup.textContent = '✅ File dibuka di tab baru!';
        }

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