document.addEventListener('DOMContentLoaded', () => {
  checkLogin();
  initTheme();
  loadRecommendations();
});

async function checkLogin() {
  try {
    const res = await fetch('/api/user');
    const data = await res.json();
    const userInfo = document.getElementById('user-info');
    const authBtn = document.getElementById('auth-btn');
    const tabs = document.getElementById('tabs-container');

    if (data.user) {
      userInfo.textContent = `Halo, ${data.user}`;
      authBtn.style.display = 'none';
      tabs.style.display = 'flex';
    } else {
      userInfo.textContent = 'Tamu';
      authBtn.style.display = 'inline-block';
      tabs.style.display = 'none';
    }
  } catch (e) {
    console.error('Gagal cek login:', e);
  }
}

function toggleAuth() {
  window.location.href = '/auth';
}

// Theme handling
function initTheme() {
  const btn = document.getElementById('theme-toggle');
  const stored = localStorage.getItem('theme');

  if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }

  if (btn) {
    const updateIcon = () => {
      const isDark = document.body.classList.contains('dark');
      btn.textContent = isDark ? '☀️' : '🌙';
    };
    updateIcon();

    btn.addEventListener('click', () => {
      document.body.classList.toggle('dark');
      const isDark = document.body.classList.contains('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      updateIcon();
    });
  }
}

// Recommendations Feature - Integrated with Real YouTube Links
function loadRecommendations() {
  const grid = document.getElementById('rec-grid');
  if (!grid) return;

  // Real YouTube URLs for "Integration" feel
  const recs = [
    {
      title: "Lofi Girl - Study Beats",
      artist: "Lofi Girl",
      url: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
      img: "https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg"
    },
    {
      title: "Top Hits Indonesia 2024",
      artist: "Indo Pop",
      url: "https://www.youtube.com/watch?v=hLQl3WQQoQ0", // Adele - Easy On Me (Placeholder for top hits)
      img: "https://i.ytimg.com/vi/hLQl3WQQoQ0/hqdefault.jpg"
    },
    {
      title: "DJ TikTok Viral",
      artist: "Remix",
      url: "https://www.youtube.com/watch?v=bM7SZ5SBzyY", // Alan Walker (Placeholder)
      img: "https://i.ytimg.com/vi/bM7SZ5SBzyY/hqdefault.jpg"
    },
    {
      title: "Relaxing Rain Sounds",
      artist: "Nature",
      url: "https://www.youtube.com/watch?v=mPZkdNFkNps",
      img: "https://i.ytimg.com/vi/mPZkdNFkNps/hqdefault.jpg"
    }
  ];

  grid.innerHTML = recs.map(item => `
    <div class="rec-card" onclick="loadFromRec('${item.url}')">
      <img src="${item.img}" class="rec-img" alt="${item.title}" onerror="this.style.background='linear-gradient(135deg, #a29bfe, #6c5ce7)'">
      <div class="rec-title">${item.title}</div>
      <div class="rec-artist">${item.artist}</div>
    </div>
  `).join('');
}

function loadFromRec(url) {
  const input = document.getElementById('urlInput');
  input.value = url;
  showPopup('🚀 Memuat rekomendasi...');
  // Trigger fetch automatically
  document.getElementById('fetchBtn').click();
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('fetchBtn').addEventListener('click', async () => {
  const url = document.getElementById('urlInput').value.trim();
  if (!url) return showPopup('⚠️ Masukkan URL terlebih dahulu.');

  document.querySelector('.loading').style.display = 'block';
  document.querySelector('.result').style.display = 'none';

  try {
    const res = await fetch('/metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await res.json();

    if (data.success) {
      const resultDiv = document.querySelector('.result');
      resultDiv.innerHTML = `
        ${data.thumbnailUrl ? `<img src="${data.thumbnailUrl}" alt="Thumbnail">` : ''}
        <div class="meta">
          <p><strong>Judul</strong> <span>${data.title}</span></p>
          <p><strong>Channel</strong> <span>${data.channel}</span></p>
          <p><strong>Platform</strong> <span>${data.platform}</span></p>
        </div>
        <div class="download-btns">
          <button class="dl-video" data-url="${url}">🎥 Video MP4</button>
          <button class="dl-audio" data-url="${url}">🎵 Audio MP3</button>
          <button class="dl-thumb" data-url="${url}">🖼️ Thumbnail</button>
        </div>
      `;
      resultDiv.style.display = 'block';

      document.querySelectorAll('.dl-video, .dl-audio, .dl-thumb').forEach(btn => {
        btn.onclick = (e) => {
          const format = e.target.classList.contains('dl-video') ? 'video' :
            e.target.classList.contains('dl-audio') ? 'audio' : 'thumb';
          download(e.target.dataset.url, format);
        };
      });
    } else {
      throw new Error(data.error || 'Gagal mengambil metadata');
    }
  } catch (e) {
    showPopup('❌ Error: ' + e.message);
  } finally {
    document.querySelector('.loading').style.display = 'none';
  }
});

async function download(url, format) {
  showPopup('⏳ Sedang memproses download...');

  try {
    const res = await fetch('/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, format })
    });

    const data = await res.json();

    if (data.success) {
      const link = document.createElement('a');
      link.href = data.filePath;
      link.download = data.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showPopup('✅ Download berhasil!');
    } else {
      throw new Error(data.error || 'Gagal download');
    }
  } catch (e) {
    showPopup('❌ Gagal: ' + e.message);
  }
}

function showTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  if (tab === 'downloader') {
    document.querySelector('.result').style.display = 'none';
    document.getElementById('recommendations-section').style.display = 'block';
    document.getElementById('history').style.display = 'none';
    event.target.classList.add('active');
  } else if (tab === 'history') {
    document.querySelector('.result').style.display = 'none';
    document.getElementById('recommendations-section').style.display = 'none';
    document.getElementById('history').style.display = 'block';
    loadHistory();
    event.target.classList.add('active');
  }
}

async function loadHistory() {
  const res = await fetch('/api/history');
  const data = await res.json();
  const list = document.getElementById('history-list');

  if (data.length === 0) {
    list.innerHTML = '<p style="text-align:center; color:var(--text-muted);">Belum ada riwayat unduhan.</p>';
    return;
  }

  list.innerHTML = data.map(item => {
    const isAudio = item.filename.toLowerCase().endsWith('.mp3');
    const icon = isAudio
      ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>'
      : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>';

    return `
      <div>
        <div style="width:50px; height:50px; background:rgba(100,100,255,0.1); border-radius:10px; display:flex; align-items:center; justify-content:center; color:var(--primary);">
          ${icon}
        </div>
        <div style="flex:1; min-width:0;">
          <strong>${item.title || '—'}</strong><br>
          <small>${item.platform} • ${new Date(item.timestamp).toLocaleDateString()}</small>
        </div>
        <a href="/downloads/${item.filename}" download style="color:var(--primary); text-decoration:none; font-weight:600;">
          📥
        </a>
      </div>
    `;
  }).join('');
}

function showPopup(msg) {
  const popup = document.getElementById('popup');
  popup.textContent = msg;
  popup.className = 'popup show';
  setTimeout(() => popup.classList.remove('show'), 3000);
}