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
      text.includes('v.douyin.com');
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
      // Handle as YouTube search
      await handleYouTubeSearch(input);
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
    // Spotify - resolve to YouTube URL via bridge
    try {
      const res = await fetchWithRetry('/api/downloaders/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'spotify', url })
      }, 1, 6000);
      const data = await res.json();

      if (data.success) {
        metadata = {
          success: true,
          title: data.title,
          author: data.artist,
          thumbnail: data.thumbnail,
          platform: 'Spotify',
          // IMPORTANT: We use the resolved YouTube URL for the actual download
          downloadUrl: data.youtubeUrl,
          fileName: `${data.artist} - ${data.title}.mp3`
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
    } else {
      // Standard display for other platforms
      resultDiv.innerHTML = `
          ${metadata.thumbnail || metadata.thumbnailUrl ? `<img src="${metadata.thumbnail || metadata.thumbnailUrl}" alt="Thumbnail" loading="lazy" style="max-height:500px; width:100%; border-radius:12px; margin-bottom:15px;">` : ''}
          <div class="meta">
            <p><strong>Platform:</strong> ${platform}</p>
            ${metadata.title ? `<p><strong>Judul:</strong> ${metadata.title}</p>` : ''}
            ${metadata.author ? `<p><strong>Author:</strong> ${metadata.author}</p>` : ''}
            ${metadata.duration ? `<p><strong>Durasi:</strong> ${metadata.duration}s</p>` : ''}
            ${metadata.stats ? `<p><strong>Views:</strong> ${metadata.stats.views} | <strong>Likes:</strong> ${metadata.stats.likes}</p>` : ''}
          </div>
          <div class="download-btns">
            <button class="dl-video" data-url="${url}" data-platform="${platform}">📥 Download Video</button>
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
      // Handler for Spotify button
      const btn = resultDiv.querySelector('.dl-audio-spotify');
      if (btn) {
        btn.onclick = (e) => {
          const youtubeUrl = e.target.dataset.url;
          // Use standard download function but treat it as YouTube audio
          download(youtubeUrl, 'audio', 'YouTube');
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
    } else {
      // Standard handlers
      document.querySelectorAll('.dl-video, .dl-audio').forEach(btn => {
        btn.onclick = (e) => {
          const format = e.target.classList.contains('dl-audio') ? 'audio' : 'video';
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

      // Determine file extension
      const ext = format === 'audio' ? '.mp3' : '.mp4';

      // Ensure fileName has proper extension
      if (!fileName) {
        fileName = `download_${Date.now()}${ext} `;
      } else if (!fileName.toLowerCase().endsWith(ext)) {
        fileName += ext;
      }

      if (downloadUrl) {
        popup.textContent = '⏳ Starting...';

        // Try to download file
        const downloaded = await downloadFile(downloadUrl, fileName);

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
    popup.textContent = '❌ Failed!';
    popup.className = 'popup show popup-error';
    setTimeout(() => {
      popup.classList.remove('show');
    }, 4000);
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
    const proxyUrl = `/ api / instagram - proxy ? url = ${encodeURIComponent(mediaUrl)} `;

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

        // Fetch as blob for auto-download
        const response = await fetch(photoUrls[i]);
        const blob = await response.blob();

        // Create blob URL and trigger download
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);

        successCount++;

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

