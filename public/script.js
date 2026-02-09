document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initHamburgerMenu();
});

// Hamburger Menu Toggle
function initHamburgerMenu() {
  const hamburger = document.getElementById('hamburger');
  const sideMenu = document.getElementById('sideMenu');
  const menuOverlay = document.getElementById('menuOverlay');

  if (hamburger && sideMenu && menuOverlay) {
    function toggleMenu() {
      hamburger.classList.toggle('active');
      sideMenu.classList.toggle('active');
      menuOverlay.classList.toggle('active');
    }

    hamburger.addEventListener('click', toggleMenu);
    menuOverlay.addEventListener('click', toggleMenu);
  }
}

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

// ===== SEARCH TYPE TOGGLE BUTTON =====
let currentSearchType = 'youtube'; // Default to YouTube

// Initialize toggle button
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('searchTypeToggle');
  const urlInput = document.getElementById('urlInput');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      // Toggle between youtube → pinterest → spotify → youtube
      if (currentSearchType === 'youtube') {
        currentSearchType = 'pinterest';
        this.dataset.type = 'pinterest';
        urlInput.placeholder = 'Search Pinterest images or paste Pinterest pin URL...';
        showPopup('Mode: Pinterest Search 📌', 'success');
      } else if (currentSearchType === 'pinterest') {
        currentSearchType = 'spotify';
        this.dataset.type = 'spotify';
        urlInput.placeholder = 'Search Spotify songs by title or artist...';
        showPopup('Mode: Spotify Search 🎵', 'success');
      } else {
        currentSearchType = 'youtube';
        this.dataset.type = 'youtube';
        urlInput.placeholder = 'Paste YouTube, TikTok, Instagram, or Spotify link...';
        showPopup('Mode: YouTube Search 🎬', 'success');
      }
    });
  }
});

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
      text.includes('spotify.com') ||
      text.includes('douyin.com') ||
      text.includes('v.douyin.com') ||
      text.includes('pinterest.com') ||
      text.includes('pin.it') ||
      text.includes('facebook.com') ||
      text.includes('fb.watch') ||
      text.includes('fb.com');
  }
}

// Detect platform from URL
function detectPlatform(url) {
  const lowerUrl = url.toLowerCase();

  // Twitter/X detection (support both twitter.com and x.com)
  if ((lowerUrl.includes('twitter.com/') || lowerUrl.includes('x.com/')) && lowerUrl.includes('/status/')) {
    return 'Twitter';
  }

  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'YouTube';
  if (lowerUrl.includes('tiktok.com') || lowerUrl.includes('vt.tiktok.com') || lowerUrl.includes('vm.tiktok.com')) return 'TikTok';
  if (lowerUrl.includes('douyin.com') || lowerUrl.includes('v.douyin.com')) return 'Douyin';
  if (lowerUrl.includes('instagram.com')) return 'Instagram';
  if (lowerUrl.includes('spotify.com/track')) return 'Spotify';
  if (lowerUrl.includes('pinterest.com') || lowerUrl.includes('pin.it')) return 'Pinterest';
  if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch') || lowerUrl.includes('fb.com')) return 'Facebook';
  return 'Unknown';
}

// Debounce to prevent multiple simultaneous requests
let isProcessing = false;

// Add Enter key support for input field (works on both mobile and desktop)
document.getElementById('urlInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault(); // Prevent form submission if inside a form
    document.getElementById('fetchBtn').click(); // Trigger the fetch button
  }
});

document.getElementById('fetchBtn').addEventListener('click', async () => {
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
      } else if (currentSearchType === 'spotify') {
        await handleSpotifySearch(input);
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

// Handle YouTube search
async function handleYouTubeSearch(keywords) {
  try {
    const res = await fetch('/api/utils/utility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'search', query: keywords, limit: 10, type: 'video' })
    });

    if (!res.ok) {
      throw new Error('Gagal mencari video: ' + res.statusText);
    }

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
        <img src="${video.thumbnail || ''}" alt="${video.title || ''}" loading="lazy" style="width: 120px; height: 90px; object-fit: cover; border-radius: 8px;">
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

    // Add lazy loading handlers for search result thumbnails
    document.querySelectorAll('.search-result-item img').forEach(img => {
      img.addEventListener('load', function () {
        this.classList.add('loaded');
      });
      // For cached images that load immediately
      if (img.complete) {
        img.classList.add('loaded');
      }
    });

    // Add event listeners to search results
    document.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', function () {
        const url = this.getAttribute('data-video-url');
        const title = this.getAttribute('data-video-title');
        selectVideo(url, title);
      });
    });
  } catch (error) {
    console.error('YouTube search error:', error);
    throw error;
  }
}

// Handle Pinterest search
async function handlePinterestSearch(keywords) {
  try {
    const res = await fetch('/api/utils/utility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pinterest-search', query: keywords, limit: 200 })
    });

    if (!res.ok) {
      throw new Error('Gagal mencari gambar Pinterest: ' + res.statusText);
    }

    const data = await res.json();

    // Check for valid results
    if (!data.success || !data.pins || !Array.isArray(data.pins) || data.pins.length === 0) {
      throw new Error('Tidak ada hasil ditemukan di Pinterest');
    }

    // Display Pinterest search results in grid (max 4 results in 2x2 layout)
    const resultDiv = document.querySelector('.result');
    let html = `
      <h3 style="margin-bottom: 20px;">📌 Hasil Pinterest: "${keywords}"</h3>
      <p style="margin-bottom: 16px; color: var(--text-secondary); font-size: 0.9rem;">
        Ditemukan ${data.count} gambar. Klik untuk download.
      </p>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 20px; max-width: 100%;">
    `;

    data.pins.forEach((pin, index) => {
      // Use thumbnail for grid display via proxy to bypass CORS
      const imageUrl = pin.thumbnail || pin.image || '';
      const proxiedImageUrl = imageUrl ? `/api/pinterest-proxy?url=${encodeURIComponent(imageUrl)}` : '';
      const title = (pin.title || pin.description || 'Pinterest Image').substring(0, 40);

      html += `
        <div class="pinterest-result-item" 
             data-pin-url="${pin.url || ''}" 
             data-pin-title="${title}"
             style="position: relative; cursor: pointer; border-radius: 16px; overflow: hidden; background: var(--input-bg); transition: all 0.3s ease; border: 1px solid var(--input-border); aspect-ratio: 1;">
          ${proxiedImageUrl ? `
            <!-- Fallback icon (always visible) -->
            <div class="pinterest-fallback" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(230, 0, 35, 0.1) 0%, rgba(189, 8, 28, 0.1) 100%); position: absolute; top: 0; left: 0; z-index: 1;">
              <span style="font-size: 48px;">📌</span>
            </div>
            <!-- Image (fades in on load) -->
            <img src="${proxiedImageUrl}" 
                 alt="${title}" 
                 loading="eager"
                 style="width: 100%; height: 100%; object-fit: cover; display: block; position: absolute; top: 0; left: 0; z-index: 2; opacity: 0; transition: opacity 0.3s ease;"
                 onload="this.style.opacity='1';"
                 onerror="console.warn('Pinterest thumbnail failed to load:', '${imageUrl.substring(0, 50)}...'); this.style.display='none';">
          ` : `
            <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(230, 0, 35, 0.1) 0%, rgba(189, 8, 28, 0.1) 100%);">
              <span style="font-size: 48px;">📌</span>
            </div>
          `}
          <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 12px; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); backdrop-filter: blur(10px); z-index: 3;">
            <p style="margin: 0; font-size: 0.8rem; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">${title}</p>
          </div>
        </div>
      `;
    });

    html += `</div>`;

    resultDiv.innerHTML = html;
    resultDiv.style.display = 'block';

    // Add hover effects and click handlers to Pinterest results
    document.querySelectorAll('.pinterest-result-item').forEach(item => {
      // Hover effect
      item.addEventListener('mouseenter', function () {
        this.style.transform = 'translateY(-4px) scale(1.02)';
        this.style.boxShadow = '0 8px 24px rgba(230, 0, 35, 0.3)';
        this.style.borderColor = 'rgba(230, 0, 35, 0.4)';
      });

      item.addEventListener('mouseleave', function () {
        this.style.transform = 'translateY(0) scale(1)';
        this.style.boxShadow = 'none';
        this.style.borderColor = 'var(--input-border)';
      });

      // Click handler - download Pinterest pin
      item.addEventListener('click', function () {
        const pinUrl = this.getAttribute('data-pin-url');
        const pinTitle = this.getAttribute('data-pin-title');

        if (pinUrl) {
          selectPinterestPin(pinUrl, pinTitle);
        }
      });
    });
  } catch (error) {
    console.error('Pinterest search error:', error);
    throw error;
  }
}

// Select Pinterest pin from search results
async function selectPinterestPin(url, title) {
  document.getElementById('urlInput').value = url;

  // Show loading
  document.querySelector('.loading').style.display = 'block';
  document.querySelector('.result').style.display = 'none';

  try {
    await handleUrlDownload(url);
  } catch (e) {
    showPopup('❌ Error: ' + e.message, 'error');
  } finally {
    document.querySelector('.loading').style.display = 'none';
  }
}

// Handle Spotify search
async function handleSpotifySearch(keywords) {
  try {
    const res = await fetch('/api/downloaders/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: 'spotify', action: 'search', query: keywords })
    });

    if (!res.ok) {
      throw new Error('Gagal mencari lagu: ' + res.statusText);
    }

    const data = await res.json();

    if (!data.success || !data.results || data.results.length === 0) {
      throw new Error('Tidak ada hasil ditemukan');
    }

    // Display Spotify search results
    const resultDiv = document.querySelector('.result');
    let html = `
      <h3 style="margin-bottom: 20px;">🎵 Hasil Spotify: "${keywords}"</h3>
      <p style="margin-bottom: 16px; color: var(--text-secondary); font-size: 0.9rem;">
        Ditemukan ${data.total || data.results.length} lagu. Klik untuk melihat detail.
      </p>
      <div class="spotify-results" style="display: flex; flex-direction: column; gap: 12px; max-height: 400px; overflow-y: auto;">
    `;

    data.results.forEach((track) => {
      const thumbUrl = track.thumbnail || '';
      console.log('Track:', track.title, 'Thumbnail URL:', thumbUrl); // DEBUG
      // Use proxy to bypass CORS for Spotify CDN images
      const proxiedThumbUrl = thumbUrl ? `/api/spotify-proxy?url=${encodeURIComponent(thumbUrl)}` : '';
      console.log('Proxied URL:', proxiedThumbUrl); // DEBUG

      html += `
        <div class="spotify-result-item" 
             data-spotify-url="${track.spotifyUrl || ''}"
             data-title="${track.title || ''}"
             data-artist="${track.artist || ''}"
             data-duration="${track.duration || ''}"
             data-thumbnail="${thumbUrl}"
             style="display: flex; align-items: center; gap: 16px; padding: 12px; background: var(--input-bg); border-radius: 12px; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid var(--input-border); margin-bottom: 8px;">
          
          <div style="width: 56px; height: 56px; flex-shrink: 0; position: relative; border-radius: 8px; overflow: hidden; background: #282828; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
            ${proxiedThumbUrl ? `
              <img src="${proxiedThumbUrl}" alt="${track.title}" loading="eager" 
                   onload="this.classList.add('loaded');"
                   onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                   style="width: 100%; height: 100%; object-fit: cover; display: block; transition: opacity 0.3s ease;">
              <div style="width: 100%; height: 100%; display: none; align-items: center; justify-content: center; background: linear-gradient(135deg, #1DB954, #191414); font-size: 24px;">🎵</div>
            ` : `
              <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #1DB954, #191414); font-size: 24px;">🎵</div>
            `}
          </div>

          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px;">
              ${track.no}. ${track.title}
            </div>
            <div style="font-size: 0.85rem; color: var(--text-secondary); display: flex; align-items: center; gap: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              <span style="color: #1DB954; font-size: 0.8rem;">🎤</span> ${track.artist}
            </div>
          </div>
          
          <div style="font-size: 0.8rem; color: var(--text-secondary); opacity: 0.8; font-variant-numeric: tabular-nums;">
            ${track.duration}
          </div>
        </div>
      `;
    });

    html += '</div>';
    resultDiv.innerHTML = html;
    resultDiv.style.display = 'block';

    // Add loaded class handlers for progressive image loading (fixes opacity: 0 bug)
    document.querySelectorAll('.spotify-result-item img').forEach(img => {
      img.addEventListener('load', function () {
        this.classList.add('loaded');
      });
      // For cached images that load immediately
      if (img.complete && img.naturalWidth > 0) {
        img.classList.add('loaded');
      }
    });

    // Add click handlers
    document.querySelectorAll('.spotify-result-item').forEach(item => {
      item.addEventListener('mouseenter', function () {
        this.style.transform = 'translateX(4px)';
        this.style.borderColor = '#1DB954';
      });
      item.addEventListener('mouseleave', function () {
        this.style.transform = 'none';
        this.style.borderColor = 'var(--input-border)';
      });
      item.addEventListener('click', function () {
        const spotifyUrl = this.getAttribute('data-spotify-url');
        const title = this.getAttribute('data-title');
        const artist = this.getAttribute('data-artist');
        const duration = this.getAttribute('data-duration');
        const thumbnail = this.getAttribute('data-thumbnail');
        selectSpotifyTrack(spotifyUrl, title, artist, duration, thumbnail);
      });
    });
  } catch (error) {
    console.error('Spotify search error:', error);
    throw error;
  }
}

// Select Spotify track from search results - show detail card
function selectSpotifyTrack(spotifyUrl, title, artist, duration, thumbnail) {
  const resultDiv = document.querySelector('.result');
  // Use proxied URL to bypass CORS for Spotify CDN images
  const proxiedThumb = thumbnail ? `/api/spotify-proxy?url=${encodeURIComponent(thumbnail)}` : '';

  resultDiv.innerHTML = `
    <div class="spotify-detail-card" style="text-align: center; padding: 20px; animation: fadeIn 0.4s ease;">
      <div style="position: relative; width: 220px; height: 220px; margin: 0 auto 24px;">
        ${proxiedThumb ? `
          <img src="${proxiedThumb}" alt="${title}" 
               onload="this.classList.add('loaded');" 
               onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
               style="width: 100%; height: 100%; object-fit: cover; border-radius: 20px; box-shadow: 0 12px 32px rgba(0,0,0,0.4); transition: opacity 0.5s ease;">
          <div style="width: 100%; height: 100%; display: none; align-items: center; justify-content: center; font-size: 80px; background: linear-gradient(135deg, #1DB954, #191414); border-radius: 20px;">🎵</div>
        ` : `
          <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 80px; background: linear-gradient(135deg, #1DB954, #191414); border-radius: 20px;">🎵</div>
        `}
      </div>
      
      <h3 style="margin: 0 0 8px 0; font-size: 1.5rem; color: var(--text-primary);">${title}</h3>
      <p style="margin: 0 0 4px 0; font-size: 1.1rem; color: var(--text-secondary);"><span style="color: #1DB954;">🎤</span> ${artist}</p>
      <p style="margin: 0 0 24px 0; font-size: 0.9rem; color: var(--text-secondary); opacity: 0.7;">⏱️ ${duration}</p>
      
      <div style="background: var(--input-bg); padding: 16px; border-radius: 16px; margin-bottom: 24px; border: 1px solid var(--input-border); text-align: left;">
        <p style="margin: 0 0 8px 0; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-secondary); font-weight: 600;">Spotify Track URL</p>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: #1DB954;">🔗</span>
          <a href="${spotifyUrl}" target="_blank" style="color: #1DB954; word-break: break-all; text-decoration: none; font-size: 0.9rem; border-bottom: 1px solid transparent; transition: border 0.3s;">
            ${spotifyUrl}
          </a>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 12px;">
        <button class="dl-spotify-download" data-url="${spotifyUrl}" data-title="${title}" data-artist="${artist}"
                style="padding: 16px; background: linear-gradient(135deg, #1DB954, #1ed760); color: white; border: none; border-radius: 14px; font-weight: 700; cursor: pointer; font-size: 1.1rem; transition: all 0.3s; box-shadow: 0 4px 15px rgba(29, 185, 84, 0.4);">
          🎵 Download MP3
        </button>
        <button class="dl-spotify-back" 
                style="padding: 14px; background: transparent; color: var(--text-primary); border: 1px solid var(--input-border); border-radius: 14px; font-weight: 600; cursor: pointer; font-size: 1rem; transition: all 0.3s;">
          ← Kembali ke Pencarian
        </button>
      </div>
    </div>
  `;

  // Download button handler
  resultDiv.querySelector('.dl-spotify-download').addEventListener('click', async function () {
    const url = this.getAttribute('data-url');
    showPopup('⏳ Memproses download...', 'loading');

    try {
      document.getElementById('urlInput').value = url;
      await handleUrlDownload(url);
    } catch (e) {
      showPopup('❌ Error: ' + e.message, 'error');
    }
  });

  // Back button handler
  resultDiv.querySelector('.dl-spotify-back').addEventListener('click', function () {
    const inputValue = document.getElementById('urlInput').value;
    if (inputValue && !isUrl(inputValue)) {
      handleSpotifySearch(inputValue);
    } else {
      resultDiv.style.display = 'none';
    }
  });
}

// Fetch with timeout to prevent hanging
async function fetchWithTimeout(url, options = {}, timeout = 6000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - API too slow');
    }
    throw error;
  }
}

// Fetch with automatic retry and exponential backoff
async function fetchWithRetry(url, options = {}, retries = 1, timeout = 6000) {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetchWithTimeout(url, options, timeout);
      return response;
    } catch (error) {
      // If last retry, throw error
      if (i === retries) throw error;

      // Fast retry: 300ms, max 1s
      const delay = Math.min(300 * Math.pow(2, i), 1000);
      console.log(`Retry ${i + 1}/${retries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
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
    throw new Error('Platform not supported. Use YouTube, TikTok, Instagram, or Spotify');
  }

  let metadata;

  // Get metadata based on platform
  if (platform === 'YouTube') {
    try {
      const res = await fetchWithRetry('/api/utils/utility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'thumbnail', url })
      }, 1, 5000);
      metadata = await res.json();
    } catch (error) {
      console.error('YouTube metadata error:', error.message);
      metadata = { success: true, title: 'YouTube Video', platform: 'YouTube', thumbnail: null };
    }
  } else if (platform === 'TikTok') {
    try {
      // Use GET method with metadata=true for faster preview
      const res = await fetchWithRetry(`/api/downloaders/download?platform=tiktok&url=${encodeURIComponent(url)}&metadata=true`, {
        method: 'GET'
      }, 2, 15000); // 2 retries, 15 second timeout
      metadata = await res.json();
    } catch (error) {
      console.error('TikTok metadata error:', error.message);
      metadata = { success: true, title: 'TikTok Video', platform: 'TikTok', thumbnail: null };
    }
  } else if (platform === 'Instagram') {
    try {
      // Increased timeout to 15 seconds for better reliability
      const res = await fetchWithRetry('/api/downloaders/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'instagram', url, metadata: true })
      }, 2, 15000); // 15 second timeout
      metadata = await res.json();

      // Fetch full data if carousel detected in metadata
      if (metadata.success && !metadata.isCarousel) {
        // Try to get full carousel data
        try {
          const fullRes = await fetchWithRetry('/api/downloaders/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ platform: 'instagram', url })
          }, 2, 20000);
          const fullData = await fullRes.json();
          if (fullData.success && fullData.isCarousel) {
            metadata = { ...metadata, ...fullData };
          }
        } catch (e) {
          console.log('Could not fetch full carousel data:', e.message);
        }
      }
    } catch (error) {
      console.error('Instagram metadata error:', error.message);
      metadata = { success: true, title: 'Instagram Media', platform: 'Instagram', thumbnail: null };
    }
  } else if (platform === 'Douyin') {
    try {
      // Increased timeout to 25 seconds for Douyin API
      const res = await fetchWithRetry('/api/downloaders/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'douyin', url, metadata: true })
      }, 3, 25000); // 3 retries, 25 second timeout
      metadata = await res.json();
    } catch (error) {
      console.error('Douyin metadata error:', error.message);
      metadata = { success: true, title: 'Douyin Video', platform: 'Douyin', thumbnail: null };
    }
  } else if (platform === 'Spotify') {
    // Spotify - direct download from API
    try {
      const res = await fetchWithRetry('/api/downloaders/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'spotify', url })
      }, 1, 15000);
      const data = await res.json();

      if (data.success) {
        metadata = {
          success: true,
          title: data.title,
          author: data.artist,
          thumbnail: data.thumbnail,
          platform: 'Spotify',
          downloadUrl: data.downloadUrl,
          fileName: data.fileName || `${data.artist} - ${data.title}.mp3`,
          duration: data.duration,
          quality: data.quality
        };
      } else {
        throw new Error(data.error || 'Gagal mengambil data Spotify');
      }
    } catch (error) {
      console.error('Spotify metadata error:', error.message);
      throw new Error('Gagal mengambil data Spotify: ' + error.message);
    }
  } else if (platform === 'Twitter') {
    // Twitter/X - get video metadata
    try {
      const res = await fetchWithRetry(`/api/downloaders/download?platform=twitter&url=${encodeURIComponent(url)}&metadata=true`, {
        method: 'GET'
      }, 2, 10000);
      metadata = await res.json();
    } catch (error) {
      console.error('Twitter metadata error:', error.message);
      metadata = { success: true, title: 'Twitter Video', platform: 'Twitter', thumbnail: null };
    }
  } else if (platform === 'Pinterest') {
    // Pinterest - get pin metadata
    try {
      const res = await fetchWithRetry(`/api/downloaders/download?platform=pinterest&url=${encodeURIComponent(url)}&metadata=true`, {
        method: 'GET'
      }, 2, 10000);
      metadata = await res.json();
    } catch (error) {
      console.error('Pinterest metadata error:', error.message);
      metadata = { success: true, title: 'Pinterest Pin', platform: 'Pinterest', thumbnail: null };
    }
  } else if (platform === 'Facebook') {
    // Facebook - get video/photo metadata
    try {
      const res = await fetchWithRetry('/api/downloaders/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'facebook', url })
      }, 2, 20000);
      const data = await res.json();

      if (data.success) {
        metadata = {
          success: true,
          title: data.title || 'Facebook Video',
          author: data.author,
          thumbnail: data.thumbnail,
          platform: 'Facebook',
          downloadUrl: data.downloadUrl,
          downloadUrlHD: data.downloadUrlHD,
          downloadUrlSD: data.downloadUrlSD,
          fileName: data.fileName,
          mediaType: data.mediaType,
          quality: data.quality
        };
      } else {
        throw new Error(data.error || 'Gagal mengambil data Facebook');
      }
    } catch (error) {
      console.error('Facebook metadata error:', error.message);
      throw new Error('Gagal mengambil data Facebook: ' + error.message);
    }
  }

  // FIX: Improved error handling for different API response formats
  if (!metadata) {
    throw new Error('Gagal mengambil metadata dari server');
  }

  // Check for error responses (both old 'msg' format and new 'success: false' format)
  if (metadata.msg) {
    throw new Error(metadata.msg);
  }

  if (metadata.success === false) {
    throw new Error(metadata.error || 'Gagal mengambil metadata');
  }

  if (metadata.success) {
    const resultDiv = document.querySelector('.result');

    // Special display for Spotify
    if (platform === 'Spotify') {
      resultDiv.innerHTML = `
        <img src="${metadata.thumbnail}" alt="Thumbnail" loading="lazy" style="max-height:300px; width:300px; border-radius:12px; margin-bottom:15px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
        <div class="meta">
          <p><strong>Platform:</strong> <span style="color:#1DB954">Spotify</span></p>
          <p><strong>Judul:</strong> ${metadata.title}</p>
          <p><strong>Artist:</strong> ${metadata.author}</p>
        </div>
        <div class="download-btns">
          <!-- We pass the YouTube URL to the download function, but keep the Spotify filename -->
          <button class="dl-audio-spotify" data-url="${metadata.downloadUrl}" data-filename="${metadata.fileName}" style="background:#1DB954; color:white;">🎵 Download MP3</button>
        </div>
      `;
    } else if (platform === 'Instagram' && metadata.isCarousel && metadata.urls) {
      // Special display for Instagram carousel with aesthetic UI
      let carouselHtml = `
        <div class="meta" style="background: linear-gradient(135deg, rgba(129, 212, 250, 0.1) 0%, rgba(100, 181, 246, 0.1) 100%); padding: 16px; border-radius: 12px; margin-bottom: 16px;">
          <p style="margin: 8px 0;"><strong>Platform:</strong> <span style="color: #42a5f5;">Instagram Carousel</span></p>
          ${metadata.title ? `<p style="margin: 8px 0;"><strong>Judul:</strong> ${metadata.title}</p>` : ''}
          ${metadata.metadata?.username ? `<p style="margin: 8px 0;"><strong>Author:</strong> <span style="color: #42a5f5;">@${metadata.metadata.username}</span></p>` : ''}
          <p style="margin: 8px 0;"><strong>Items:</strong> <span style="color: #42a5f5; font-weight: 600;">${metadata.carouselCount} foto/video</span></p>
          ${metadata.metadata?.views ? `<p style="margin: 8px 0;"><strong>Views:</strong> ${metadata.metadata.views.toLocaleString()}</p>` : ''}
          ${metadata.metadata?.likes ? `<p style="margin: 8px 0;"><strong>Likes:</strong> ❤️ ${metadata.metadata.likes.toLocaleString()}</p>` : ''}
          ${metadata.metadata?.comments ? `<p style="margin: 8px 0;"><strong>Comments:</strong> 💬 ${metadata.metadata.comments.toLocaleString()}</p>` : ''}
        </div>
      `;

      // Display only the FIRST thumbnail as preview
      const firstMediaUrl = metadata.urls[0];
      const isVideo = firstMediaUrl.includes('.mp4') || firstMediaUrl.includes('video');
      const thumbnailUrl = isVideo ? '' : `/api/utils/utility?action=instagram-proxy&url=${encodeURIComponent(firstMediaUrl)}&type=preview`;

      console.log(`[Carousel] Showing preview of first item from ${metadata.urls.length} total items`);

      // Single thumbnail preview
      carouselHtml += `
        <div style="margin: 16px 0;">
          <div style="display: flex; justify-content: center; align-items: center; padding: 20px; background: linear-gradient(135deg, rgba(129, 212, 250, 0.08) 0%, rgba(100, 181, 246, 0.08) 100%); border: 1px solid rgba(129, 212, 250, 0.2); border-radius: 12px;">
            
            <div style="position: relative; width: 200px; height: 200px;">
              <!-- Fallback Icon -->
              <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 12px; background: linear-gradient(135deg, rgba(129, 212, 250, 0.4) 0%, rgba(100, 181, 246, 0.4) 100%); display: flex; align-items: center; justify-content: center; font-size: 64px;">
                ${isVideo ? '🎥' : '📷'}
              </div>
              
              <!-- Preview Image -->
              ${!isVideo ? `<img src="${thumbnailUrl}" alt="Preview" loading="lazy" 
                   style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 12px; z-index: 2; box-shadow: 0 4px 16px rgba(66, 165, 245, 0.3);" 
                   onerror="this.style.opacity='0';"
                   onload="if(this.naturalWidth === 0) this.style.opacity='0';">` : ''}
            </div>
            
          </div>
        </div>
      `;

      // Download All button only
      carouselHtml += `
        <div class="download-btns" style="margin-top: 20px;">
          <button class="dl-all-carousel" data-urls='${JSON.stringify(metadata.urls)}'>
            ⬇️ Download All (${metadata.carouselCount} items)
          </button>
        </div>
      `;

      resultDiv.innerHTML = carouselHtml;
    } else if (platform === 'TikTok' && metadata.isPhotoSlides) {
      // Special display for TikTok Photo Slides
      let photoSlidesHtml = `
        <div class="meta" style="background: linear-gradient(135deg, rgba(129, 212, 250, 0.1) 0%, rgba(100, 181, 246, 0.1) 100%); padding: 16px; border-radius: 12px; margin-bottom: 16px;">
          <p style="margin: 8px 0;"><strong>Platform:</strong> <span style="color: #42a5f5;">TikTok Photo Slides 📸</span></p>
          ${metadata.title ? `<p style="margin: 8px 0;"><strong>Judul:</strong> ${metadata.title}</p>` : ''}
          ${metadata.author ? `<p style="margin: 8px 0;"><strong>Author:</strong> <span style="color: #42a5f5;">@${metadata.author}</span></p>` : ''}
          <p style="margin: 8px 0;"><strong>Photos:</strong> <span style="color: #42a5f5; font-weight: 600;">${metadata.photoCount} foto</span></p>
          ${metadata.stats ? `<p style="margin: 8px 0;"><strong>Views:</strong> ${metadata.stats.views} | <strong>Likes:</strong> ${metadata.stats.likes}</p>` : ''}
        </div>
      `;

      // Show preview of first photo (USE PROXY FOR CORS!)
      if (metadata.thumbnail) {
        photoSlidesHtml += `
          <div style="margin: 16px 0;">
            <img src="${metadata.thumbnail}" alt="Preview" loading="lazy" 
                 style="max-height:400px; width:100%; object-fit: cover; border-radius:12px; box-shadow: 0 4px 16px rgba(66, 165, 245, 0.3);">
          </div>
        `;
      }

      // Download button for photos - BLUE LIQUID GLASS STYLE (same as Instagram)
      photoSlidesHtml += `
        <div class="download-btns" style="margin-top: 20px;">
          <button class="dl-tiktok-photos dl-all-carousel" data-url="${url}">
            📸 Download All Photos (${metadata.photoCount} items)
          </button>
        </div>
      `;

      resultDiv.innerHTML = photoSlidesHtml;
    } else if (platform === 'Facebook') {
      // Special display for Facebook with HD/SD quality buttons
      const hasHD = metadata.downloadUrlHD;
      const hasSD = metadata.downloadUrlSD;

      resultDiv.innerHTML = `
        ${metadata.thumbnail ? `<img src="${metadata.thumbnail}" alt="Thumbnail" loading="lazy" style="max-height:400px; width:100%; object-fit:cover; border-radius:16px; margin-bottom:20px; box-shadow: 0 8px 24px rgba(0,0,0,0.2);">` : `
          <div style="width:100%; height:200px; display:flex; align-items:center; justify-content:center; background: linear-gradient(135deg, #1877F2, #166FE5); border-radius:16px; margin-bottom:20px; font-size:64px;">📘</div>
        `}
        <div class="meta" style="background: linear-gradient(135deg, rgba(24, 119, 242, 0.1) 0%, rgba(22, 111, 229, 0.1) 100%); padding: 16px; border-radius: 12px; margin-bottom: 16px;">
          <p style="margin: 8px 0;"><strong>Platform:</strong> <span style="color: #1877F2;">Facebook</span></p>
          ${metadata.title ? `<p style="margin: 8px 0;"><strong>Judul:</strong> ${metadata.title}</p>` : ''}
          ${metadata.author ? `<p style="margin: 8px 0;"><strong>Author:</strong> <span style="color: #1877F2;">@${metadata.author}</span></p>` : ''}
          ${metadata.mediaType ? `<p style="margin: 8px 0;"><strong>Type:</strong> ${metadata.mediaType === 'video' ? '🎬 Video' : '🖼️ Photo'}</p>` : ''}
          ${metadata.quality ? `<p style="margin: 8px 0;"><strong>Quality:</strong> <span style="color: #1877F2;">${metadata.quality}</span></p>` : ''}
        </div>
        <div class="download-btns" style="display: flex; flex-direction: column; gap: 10px;">
          ${hasHD ? `
            <button class="dl-facebook-hd" data-url="${metadata.downloadUrlHD}" data-filename="${metadata.fileName?.replace('.mp4', '_HD.mp4') || 'facebook_hd.mp4'}" 
                    style="background: linear-gradient(135deg, #1877F2, #166FE5); color: white; padding: 14px; border-radius: 12px; font-weight: 600; border: none; cursor: pointer;">
              📥 Download HD Quality
            </button>
          ` : ''}
          ${hasSD ? `
            <button class="dl-facebook-sd" data-url="${metadata.downloadUrlSD}" data-filename="${metadata.fileName?.replace('.mp4', '_SD.mp4') || 'facebook_sd.mp4'}" 
                    style="background: var(--input-bg); color: var(--text-primary); padding: 14px; border-radius: 12px; font-weight: 500; border: 1px solid var(--input-border); cursor: pointer;">
              📥 Download SD Quality
            </button>
          ` : ''}
          ${!hasHD && !hasSD && metadata.downloadUrl ? `
            <button class="dl-facebook" data-url="${metadata.downloadUrl}" data-filename="${metadata.fileName || 'facebook_media.mp4'}" 
                    style="background: linear-gradient(135deg, #1877F2, #166FE5); color: white; padding: 14px; border-radius: 12px; font-weight: 600; border: none; cursor: pointer;">
              📥 Download ${metadata.mediaType === 'video' ? 'Video' : 'Photo'}
            </button>
          ` : ''}
        </div>
      `;
    } else {
      // Standard display for other platforms
      const thumbSrc = (() => {
        const raw = metadata.thumbnail || metadata.thumbnailUrl || '';
        if (platform === 'Pinterest' && raw) {
          return `/api/pinterest-proxy?url=${encodeURIComponent(raw)}`;
        }
        return raw;
      })();
      resultDiv.innerHTML = `
          ${thumbSrc ? `<img src="${thumbSrc}" alt="Thumbnail" loading="lazy" style="max-height:500px; width:100%; border-radius:12px; margin-bottom:15px;">` : ''}
          <div class="meta">
            <p><strong>Platform:</strong> ${platform}</p>
            ${metadata.title ? `<p><strong>Judul:</strong> ${metadata.title}</p>` : ''}
            ${metadata.author ? `<p><strong>Author:</strong> ${metadata.author}</p>` : ''}
            ${metadata.duration ? `<p><strong>Durasi:</strong> ${metadata.duration}s</p>` : ''}
            ${metadata.stats ? `<p><strong>Views:</strong> ${metadata.stats.views} | <strong>Likes:</strong> ${metadata.stats.likes}</p>` : ''}
            ${metadata.mediaType ? `<p><strong>Type:</strong> ${metadata.mediaType}</p>` : ''}
          </div>
          <div class="download-btns">
            ${platform === 'Pinterest' ? `<button class="dl-image" data-url="${url}" data-platform="${platform}">📥 Download ${metadata.mediaType || 'Media'}</button>` : `<button class="dl-video" data-url="${url}" data-platform="${platform}">📥 Download Video</button>`}
            ${platform === 'YouTube' || platform === 'TikTok' || platform === 'Douyin' ? `<button class="dl-audio" data-url="${url}" data-platform="${platform}">🎵 Download Audio</button>` : ''}
            ${platform === 'Twitter' && metadata.qualities && metadata.qualities.length > 1 ? `<p style="font-size: 12px; color: var(--text-secondary); margin-top: 8px;">📊 ${metadata.qualities.length} qualities available</p>` : ''}
          </div>
        `;
    }

    resultDiv.style.display = 'block';

    // Add progressive loading to result thumbnails
    const resultImg = resultDiv.querySelector('img');
    if (resultImg) {
      resultImg.addEventListener('load', function () {
        this.classList.add('loaded');
      });
      // For cached images
      if (resultImg.complete) {
        resultImg.classList.add('loaded');
      }
    }

    // Attach download handlers
    if (platform === 'Spotify') {
      // Handler for Spotify button - direct download
      const btn = resultDiv.querySelector('.dl-audio-spotify');
      if (btn) {
        btn.onclick = async (e) => {
          const downloadUrl = e.target.dataset.url;
          const fileName = e.target.dataset.filename || 'spotify-track.mp3';

          showPopup('⏳ Downloading...', 'loading');

          try {
            // Direct download from Spotify API
            await downloadFile(downloadUrl, fileName);
            showPopup('✅ Download started!', 'success');
          } catch (error) {
            console.error('Spotify download error:', error);
            // Fallback: open in new tab
            window.open(downloadUrl, '_blank');
            showPopup('📥 Opening download...', 'success');
          }
        };
      }
    } else if (platform === 'Instagram' && metadata.isCarousel) {
      // Handler for carousel individual items
      document.querySelectorAll('.dl-carousel-item').forEach(btn => {
        btn.onclick = (e) => {
          const mediaUrl = e.target.dataset.url;
          const index = parseInt(e.target.dataset.index);
          downloadCarouselItem(mediaUrl, index);
        };
      });

      // Handler for Download All button
      const downloadAllBtn = resultDiv.querySelector('.dl-all-carousel');
      if (downloadAllBtn) {
        downloadAllBtn.onclick = (e) => {
          const urls = JSON.parse(e.target.dataset.urls);
          downloadAllCarousel(urls);
        };
      }
    } else if (platform === 'TikTok' && metadata.isPhotoSlides) {
      // Handler for TikTok Photo Slides
      const downloadPhotosBtn = resultDiv.querySelector('.dl-tiktok-photos');
      if (downloadPhotosBtn) {
        downloadPhotosBtn.onclick = async (e) => {
          await downloadTikTokPhotos(e.target.dataset.url);
        };
      }
    } else if (platform === 'Facebook') {
      // Handler for Facebook download buttons
      const setupFacebookButton = (selector, fallbackName) => {
        const btn = resultDiv.querySelector(selector);
        if (btn) {
          btn.onclick = async (e) => {
            const downloadUrl = e.target.dataset.url;
            const fileName = e.target.dataset.filename || fallbackName;

            showPopup('⏳ Downloading...', 'loading');

            try {
              await downloadFile(downloadUrl, fileName);
              showPopup('✅ Download started!', 'success');
            } catch (error) {
              console.error('Facebook download error:', error);
              window.open(downloadUrl, '_blank');
              showPopup('📥 Opening download...', 'success');
            }
          };
        }
      };

      setupFacebookButton('.dl-facebook-hd', 'facebook_hd.mp4');
      setupFacebookButton('.dl-facebook-sd', 'facebook_sd.mp4');
      setupFacebookButton('.dl-facebook', 'facebook_media.mp4');
    } else {
      // Standard handlers
      document.querySelectorAll('.dl-video, .dl-audio, .dl-image').forEach(btn => {
        btn.onclick = (e) => {
          const format = e.target.classList.contains('dl-audio') ? 'audio' :
            e.target.classList.contains('dl-image') ? 'image' : 'video';
          const platform = e.target.dataset.platform;
          download(e.target.dataset.url, format, platform);
        };
      });
    }
  } else {
    throw new Error(metadata.error || 'Gagal mengambil metadata');
  }
}

// Download file with proper CORS handling
async function downloadFile(url, filename, proxyUrl = null) {
  try {
    // Try direct download first (works for same-origin or CORS-enabled URLs)
    const response = await fetch(url);
    if (!response.ok) throw new Error('Direct fetch failed');
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
    console.log('Direct download failed:', e.message);

    // Try proxy if available
    if (proxyUrl) {
      try {
        console.log('Trying proxy download...');
        const proxyRes = await fetch(proxyUrl);
        if (!proxyRes.ok) throw new Error('Proxy fetch failed');
        const blob = await proxyRes.blob();

        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
        return true;
      } catch (e2) {
        console.log('Proxy download failed:', e2.message);
      }
    }

    // Fallback: open in new tab (for CORS-blocked URLs)
    console.log('Opening in new tab as fallback');
    window.open(url, '_blank');
    return false;
  }
}

// Helper function to show popup notifications with liquid glass
function showPopup(message, state = 'loading', duration = 3000) {
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

async function download(url, format, platform) {
  const popup = document.getElementById('popup');

  // Show loading
  popup.textContent = '⏳ Downloading...';
  popup.className = 'popup show popup-loading';

  try {
    let endpoint;
    let body = { url };

    // Determine endpoint and body based on platform and format
    if (platform === 'YouTube') {
      endpoint = '/api/downloaders/download';
      body.platform = format === 'audio' ? 'youtube-audio' : 'youtube';
    } else if (platform === 'TikTok') {
      endpoint = '/api/downloaders/download';
      body.platform = 'tiktok';
      body.format = format;
    } else if (platform === 'Douyin') {
      endpoint = '/api/downloaders/download';
      body.platform = 'douyin';
      body.format = format;
    } else if (platform === 'Instagram') {
      endpoint = '/api/downloaders/download';
      body.platform = 'instagram';
    } else if (platform === 'Twitter') {
      endpoint = '/api/downloaders/download';
      body.platform = 'twitter';
    } else if (platform === 'Pinterest') {
      endpoint = '/api/downloaders/download';
      body.platform = 'pinterest';
    } else if (platform === 'Facebook') {
      endpoint = '/api/downloaders/download';
      body.platform = 'facebook';
    } else {
      throw new Error('Platform tidak didukung');
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      throw new Error('Network response was not ok: ' + res.statusText);
    }

    const data = await res.json();

    if (data.success) {
      const downloadUrl = data.downloadUrl;
      let fileName = data.fileName;

      if (fileName && fileName.includes('.')) {
        fileName = fileName;
      } else {
        let ext = '.mp4';
        if (format === 'audio') {
          ext = '.mp3';
        } else if (format === 'image' || (data.mediaType && data.mediaType.toLowerCase() === 'image')) {
          if (data.format && data.format.toLowerCase() === 'png') {
            ext = '.png';
          } else {
            ext = '.jpg';
          }
        }
        if (!fileName) {
          fileName = `download_${Date.now()}${ext}`;
        } else if (!fileName.toLowerCase().endsWith(ext)) {
          fileName += ext;
        }
      }

      if (downloadUrl) {
        popup.textContent = '⏳ Starting...';

        let primaryUrl = downloadUrl;
        let proxyUrl = null;

        // YouTube: Direct open in new tab (CDN has IP/signature restrictions)
        if (platform === 'YouTube') {
          window.open(downloadUrl, '_blank');
          popup.textContent = '✅ Download link opened!';
          popup.className = 'popup show popup-success';
          setTimeout(() => popup.classList.remove('show'), 3000);
          return;
        }

        if (platform === 'TikTok' || platform === 'Douyin') {
          // Use proxy as PRIMARY URL for auto-download (Content-Disposition: attachment)
          primaryUrl = `/api/utils/utility?action=tiktok-proxy&url=${encodeURIComponent(downloadUrl)}&type=${format}`;
          proxyUrl = null; // No fallback needed, proxy is primary
        } else if (platform === 'Instagram') {
          proxyUrl = `/api/utils/utility?action=instagram-proxy&url=${encodeURIComponent(downloadUrl)}`;
        } else if (platform === 'Pinterest') {
          primaryUrl = `/api/pinterest-proxy?url=${encodeURIComponent(downloadUrl)}`;
        } else if (platform === 'Facebook') {
          // Facebook downloadUrl is already proxied from API for auto-download
          primaryUrl = downloadUrl;
        }

        const downloaded = await downloadFile(primaryUrl, fileName, proxyUrl);

        if (downloaded) {
          popup.textContent = '✅ Done!';
        } else {
          popup.textContent = '✅ Opened!';
        }

        popup.className = 'popup show popup-success';
        setTimeout(() => popup.classList.remove('show'), 3000);
      } else {
        throw new Error('Download URL tidak ditemukan');
      }
    } else {
      throw new Error(data.error || 'Gagal download');
    }
  } catch (e) {
    console.error('Download error:', e);
    popup.textContent = '❌ ' + (e.message || 'Failed!');
    popup.className = 'popup show popup-error';
    setTimeout(() => {
      popup.classList.remove('show');
    }, 5000);
  }
}

// Download Instagram carousel item using proxy
async function downloadCarouselItem(mediaUrl, index) {
  const popup = document.getElementById('popup');

  try {
    const isVideo = mediaUrl.includes('.mp4') || mediaUrl.includes('video');
    const fileName = `instagram_carousel_${index + 1}_${Date.now()}.${isVideo ? 'mp4' : 'jpg'} `;

    popup.textContent = `⏳ Download item ${index + 1}...`;
    popup.className = 'popup show';
    popup.style.background = 'rgba(28, 28, 30, 0.95)';

    // Use proxy endpoint to download
    const proxyUrl = `/api/utils/utility?action=instagram-proxy&url=${encodeURIComponent(mediaUrl)}`;

    // Create anchor and trigger download
    const a = document.createElement('a');
    a.href = proxyUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    popup.textContent = `✅ Item ${index + 1} selesai!`;
    popup.style.background = '#30D158';
    setTimeout(() => popup.classList.remove('show'), 2000);
  } catch (e) {
    console.error('Carousel item download error:', e);
    popup.textContent = `❌ Error item ${index + 1}: ${e.message} `;
    popup.style.background = '#FF453A';
    setTimeout(() => popup.classList.remove('show'), 3000);
  }
}

// Download all carousel items sequentially using proxy
async function downloadAllCarousel(mediaUrls) {
  const popup = document.getElementById('popup');

  popup.textContent = `⏳ Memulai download ${mediaUrls.length} items...`;
  popup.className = 'popup show';
  popup.style.background = 'rgba(28, 28, 30, 0.95)';

  let successCount = 0;

  for (let i = 0; i < mediaUrls.length; i++) {
    try {
      const isVideo = mediaUrls[i].includes('.mp4') || mediaUrls[i].includes('video');
      const fileName = `instagram_carousel_${i + 1}_${Date.now() + i}.${isVideo ? 'mp4' : 'jpg'} `;

      popup.textContent = `⏳ Download ${i + 1}/${mediaUrls.length}...`;

      // Use proxy endpoint to download
      const proxyUrl = `/api/utils/utility?action=instagram-proxy&url=${encodeURIComponent(mediaUrls[i])}`;

      // Create anchor and trigger download
      const a = document.createElement('a');
      a.href = proxyUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      successCount++;

      // Delay between downloads
      if (i < mediaUrls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (e) {
      console.error(`Failed to download item ${i + 1}:`, e);
    }
  }

  popup.textContent = `✅ Download selesai! (${successCount}/${mediaUrls.length})`;
  popup.style.background = '#30D158';
  setTimeout(() => popup.classList.remove('show'), 4000);
}

// Download TikTok Photo Slides - WITH AUTO DOWNLOAD (NO NEW TAB!)
async function downloadTikTokPhotos(url) {
  const popup = document.getElementById('popup');

  try {
    popup.textContent = '⏳ Mengambil foto...';
    popup.className = 'popup show popup-loading';

    // Get photo URLs from API
    const res = await fetch('/api/downloaders/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: 'tiktok', url })
    });

    if (!res.ok) {
      throw new Error('Gagal mengambil data');
    }

    const data = await res.json();

    if (!data.success || !data.isPhotoSlides || !data.photoUrls) {
      throw new Error('Ini bukan TikTok photo slides');
    }

    const photoUrls = data.photoUrls;
    popup.textContent = `⏳ Memulai download ${photoUrls.length} foto...`;

    let successCount = 0;

    // Download photos sequentially with BLOB (auto-download, no new tab!)
    for (let i = 0; i < photoUrls.length; i++) {
      try {
        const fileName = `tiktok_photo_${i + 1}_${Date.now() + i}.jpg`;
        popup.textContent = `⏳ Download ${i + 1}/${photoUrls.length}...`;

        // Use downloadFile with proxy fallback
        const proxyUrl = `/api/utils/utility?action=tiktok-proxy&url=${encodeURIComponent(photoUrls[i])}&type=image`;
        const success = await downloadFile(photoUrls[i], fileName, proxyUrl);

        if (success) successCount++;

        // Delay between downloads
        if (i < photoUrls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (e) {
        console.error(`Failed to download photo ${i + 1}:`, e);
      }
    }

    popup.textContent = `✅ Download selesai! (${successCount}/${photoUrls.length} foto)`;
    popup.className = 'popup show popup-success';
    setTimeout(() => popup.classList.remove('show'), 4000);

  } catch (error) {
    console.error('TikTok photos download error:', error);
    popup.textContent = '❌ Download gagal: ' + error.message;
    popup.className = 'popup show popup-error';
    setTimeout(() => popup.classList.remove('show'), 4000);
  }
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

// Show install prompt
function showInstallPrompt() {
  const installPrompt = document.getElementById('installPrompt');
  if (installPrompt) {
    installPrompt.classList.remove('hidden');
    console.log('📱 Showing install prompt');
  }
}

// Hide install prompt
function hideInstallPrompt() {
  const installPrompt = document.getElementById('installPrompt');
  if (installPrompt) {
    installPrompt.classList.add('hidden');
  }
}

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

// Check if running as PWA on launch
if (window.matchMedia('(display-mode: standalone)').matches) {
  console.log('✅ Running as installed PWA');
}

console.log('🚀 PWA Install prompt initialized');

// ===== AUTH & HISTORY LOGIC =====
document.addEventListener('DOMContentLoaded', () => {
  checkLoginStatus();

  // Logout handler
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch('/api/auth?action=logout');
        window.location.reload();
      } catch (e) {
        console.error('Logout failed:', e);
      }
    });
  }

  // History button handler
  const historyBtn = document.getElementById('historyBtn');
  const historyModal = document.getElementById('historyModal');
  const closeModal = document.querySelector('.close-modal');

  if (historyBtn && historyModal) {
    historyBtn.addEventListener('click', async () => {
      historyModal.style.display = 'flex';
      await loadHistory();
    });

    closeModal.addEventListener('click', () => {
      historyModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
      if (e.target === historyModal) {
        historyModal.style.display = 'none';
      }
    });
  }
});

async function checkLoginStatus() {
  try {
    const res = await fetch('/api/user?action=me');
    const data = await res.json();

    const authSection = document.getElementById('authSection');
    const loginBtn = document.getElementById('loginBtn');
    const userSection = document.getElementById('userSection');
    const usernameDisplay = document.getElementById('usernameDisplay');

    if (data.success && data.user) {
      if (loginBtn) loginBtn.style.display = 'none';
      if (userSection) {
        userSection.style.display = 'inline-flex';
        userSection.classList.remove('hidden');
      }
      if (usernameDisplay) usernameDisplay.textContent = `Hi, ${data.user.username}`;
    } else {
      if (loginBtn) loginBtn.style.display = 'inline-flex';
      if (userSection) userSection.style.display = 'none';
    }
  } catch (e) {
    console.error('Check login status failed:', e);
  }
}

async function loadHistory() {
  const list = document.getElementById('historyList');
  list.innerHTML = '<p>Loading history...</p>';

  try {
    const res = await fetch('/api/user?action=history');
    const data = await res.json();

    if (data.success && data.history && data.history.length > 0) {
      let html = '';
      data.history.forEach(item => {
        const date = new Date(item.timestamp).toLocaleString();
        html += `
          <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
            <div style="font-weight: bold; color: #333;">${item.title || 'No Title'}</div>
            <div style="font-size: 12px; color: #666; margin: 4px 0;">
              <span style="background: #eee; padding: 2px 6px; border-radius: 4px;">${item.platform}</span>
              <span>${date}</span>
            </div>
            <a href="${item.url}" target="_blank" style="font-size: 12px; color: #667eea; text-decoration: none;">Link Asli</a>
          </div>
        `;
      });
      list.innerHTML = html;
    } else {
      list.innerHTML = '<p>Belum ada history download.</p>';
    }
  } catch (e) {
    list.innerHTML = '<p style="color: red;">Gagal memuat history.</p>';
    console.error('Load history failed:', e);
  }
}

