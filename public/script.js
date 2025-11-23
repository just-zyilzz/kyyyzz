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

// Updated Recommendations (Frank Ocean, Daniel Caesar style)
function loadRecommendations() {
  const grid = document.getElementById('rec-grid');
  if (!grid) return;

  const recs = [
    {
      title: "Frank Ocean - Pink + White",
      artist: "Frank Ocean",
      url: "https://www.youtube.com/watch?v=uzS3WG6__G4",
      img: "https://i.ytimg.com/vi/uzS3WG6__G4/hqdefault.jpg"
    },
    {
      title: "Daniel Caesar - Best Part (feat. H.E.R.)",
      artist: "Daniel Caesar",
      url: "https://www.youtube.com/watch?v=h58hK28JDqg",
      img: "https://i.ytimg.com/vi/h58hK28JDqg/hqdefault.jpg"
    },
    {
      title: "SZA - Snooze",
      artist: "SZA",
      url: "https://www.youtube.com/watch?v=LDY_XMFLQM8",
      img: "https://i.ytimg.com/vi/LDY_XMFLQM8/hqdefault.jpg"
    },
    {
      title: "Joji - Glimpse of Us",
      artist: "Joji",
      url: "https://www.youtube.com/watch?v=N8Z9r_k7lTE",
      img: "https://i.ytimg.com/vi/N8Z9r_k7lTE/hqdefault.jpg"
    },
    {
      title: "Rex Orange County - Best Friend",
      artist: "Rex Orange County",
      url: "https://www.youtube.com/watch?v=_LBO18k-K0s",
      img: "https://i.ytimg.com/vi/_LBO18k-K0s/hqdefault.jpg"
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
  showPopup('🚀 Memuat...');
  document.getElementById('fetchBtn').click();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

let currentResults = [];

document.getElementById('fetchBtn').addEventListener('click', async () => {
  const inputVal = document.getElementById('urlInput').value.trim();
  if (!inputVal) return showPopup('⚠️ Masukkan judul lagu atau URL.');

  document.querySelector('.loading').style.display = 'block';
  document.querySelector('.result').style.display = 'none';

  try {
    const res = await fetch('/metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: inputVal })
    });
    const data = await res.json();

    if (data.success) {
      currentResults = data.results;
      renderResults(data.results);
    } else {
      throw new Error(data.error || 'Gagal mengambil metadata');
    }
  } catch (e) {
    showPopup('❌ Error: ' + e.message);
  } finally {
    document.querySelector('.loading').style.display = 'none';
  }
});

function renderResults(results) {
  const resultDiv = document.querySelector('.result');
  resultDiv.style.display = 'block';

  if (results.length === 1) {
    // Single result (Direct URL)
    renderSingleResult(results[0], resultDiv);
  } else {
    // Multiple results (Search) - Render Slider
    let html = `
      <h3 style="margin-bottom:15px; text-align:center;">🔍 Pilih Hasil Pencarian:</h3>
      <div class="result-slider">
    `;

    html += results.map((item, index) => `
      <div class="slider-card" onclick="selectResult(${index})">
        <img src="${item.thumbnailUrl}" alt="${item.title}">
        <div class="slider-info">
          <div class="slider-title">${item.title}</div>
          <div class="slider-artist">${item.artist} • ${item.year}</div>
        </div>
      </div>
    `).join('');

    html += `</div>`;
    resultDiv.innerHTML = html;
  }
}

function selectResult(index) {
  const item = currentResults[index];
  const resultDiv = document.querySelector('.result');
  renderSingleResult(item, resultDiv);
}

function renderSingleResult(data, container) {
  container.innerHTML = `
    <div class="single-result-view">
      ${data.thumbnailUrl ? `<img src="${data.thumbnailUrl}" alt="Thumbnail" class="main-thumb">` : ''}
      <div class="meta">
        <p><strong>Judul</strong> <span>${data.title}</span></p>
        <p><strong>Artis</strong> <span>${data.artist}</span></p>
        <p><strong>Tahun</strong> <span>${data.year}</span></p>
        <p><strong>Platform</strong> <span>${data.platform}</span></p>
      </div>
      <div class="download-btns">
        <button class="dl-video" data-url="${data.downloadUrl}">🎥 Video MP4</button>
        <button class="dl-audio" data-url="${data.downloadUrl}">🎵 Audio MP3</button>
        <button class="dl-thumb" data-url="${data.downloadUrl}">🖼️ Thumbnail</button>
      </div>
      <button onclick="renderResults(currentResults)" style="margin-top:15px; background:transparent; border:1px solid var(--glass-border); color:var(--text-muted); width:100%;">🔙 Kembali ke Hasil</button>
    </div>
  `;

  container.querySelectorAll('.dl-video, .dl-audio, .dl-thumb').forEach(btn => {
    btn.onclick = (e) => {
      const format = e.target.classList.contains('dl-video') ? 'video' :
        e.target.classList.contains('dl-audio') ? 'audio' : 'thumb';
      download(e.target.dataset.url, format);
    };
  });
}

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