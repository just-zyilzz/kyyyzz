# 📁 API Folder Structure

**Clean, organized API structure** dengan penamaan yang jelas dan mudah dipahami.

---

## 📂 Structure Overview

```
api/
├── index.js                    # Main API router
│
├── downloaders/                # Platform-specific downloaders
│   ├── youtube.js              # YouTube video downloader (MP4)
│   ├── youtube-audio.js        # YouTube audio downloader (MP3)
│   ├── instagram.js            # Instagram downloader (photos/videos/carousel)
│   ├── tiktok.js               # TikTok downloader
│   ├── douyin.js               # Douyin downloader  
│   └── spotify.js              # Spotify to YouTube bridge
│
└── utils/                      # Helper/utility endpoints
    ├── search.js               # YouTube video search
    ├── thumbnail.js            # Get video thumbnails
    ├── instagram-proxy.js      # Instagram CORS proxy
    └── tiktok-proxy.js         # TikTok CORS proxy
```

---

## 🎯 Naming Conventions

### ✅ **Good Names** (Clear & Descriptive)
- `youtube.js` - Lebih jelas dari `ytmp4.js`
- `youtube-audio.js` - Lebih jelas dari `ytmp3.js`  
- `search.js` - Lebih jelas dari `yt-search.js`
- `thumbnail.js` - Lebih jelas dari `thumb.js`

### ❌ **Old Names** (Abbreviations)
- ~~`ytmp4.js`~~ → `youtube.js`
- ~~`ytmp3.js`~~ → `youtube-audio.js`
- ~~`yt-search.js`~~ → `search.js`
- ~~`thumb.js`~~ → `thumbnail.js`

---

## 🔗 API Endpoints

### **Downloaders** (`/api/downloaders/`)
| Endpoint | File | Description |
|----------|------|-------------|
| `/api/downloaders/youtube` | `youtube.js` | Download YouTube video (MP4) |
| `/api/downloaders/youtube-audio` | `youtube-audio.js` | Download YouTube audio (MP3) |
| `/api/downloaders/instagram` | `instagram.js` | Download Instagram media |
| `/api/downloaders/tiktok` | `tiktok.js` | Download TikTok video |
| `/api/downloaders/douyin` | `douyin.js` | Download Douyin video |
| `/api/downloaders/spotify` | `spotify.js` | Spotify to YouTube bridge |

### **Utils** (`/api/utils/`)
| Endpoint | File | Description |
|----------|------|-------------|
| `/api/utils/search` | `search.js` | Search YouTube videos |
| `/api/utils/thumbnail` | `thumbnail.js` | Get video thumbnail |
| `/api/utils/instagram-proxy` | `instagram-proxy.js` | Proxy for Instagram media (CORS) |
| `/api/utils/tiktok-proxy` | `tiktok-proxy.js` | Proxy for TikTok media (CORS) |

---

## 📦 Folder Organization

### **`/api/downloaders/`**
Platform-specific download handlers. Each file handles downloads for one platform.

**When to add here:** New platform downloader (e.g., Twitter, Facebook)

### **`/api/utils/`**
Helper utilities & support endpoints (search, proxy, thumbnails, etc)

**When to add here:** Utility functions that support downloaders

---

## ✨ Benefits

✅ **Clear separation**: Downloaders vs Utils
✅ **Descriptive names**: No abbreviations
✅ **Easy to navigate**: Logical grouping
✅ **Scalable**: Easy to add new platforms
✅ **Maintainable**: Clean structure

---

## 🚀 Quick Reference

**Add new downloader:**
- Create file in `/api/downloaders/[platform].js`
- Use endpoint `/api/downloaders/[platform]`

**Add new utility:**
- Create file in `/api/utils/[utility].js`
- Use endpoint `/api/utils/[utility]`
