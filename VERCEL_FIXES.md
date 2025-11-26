# Vercel Deployment Fixes

## Issue
Serverless functions were crashing  with "FUNCTION_INVOCATION_FAILED" error due to:
1. ❌ Database initialization running at module load time
2. ❌ Directory creation at module load time 
3. ❌ Using non-writable paths in Vercel (`/home/*`, project directory)
4. ❌ Linux binaries (yt-dlp, ffmpeg) not executable

## Fixes Applied

### 1. `lib/db.js` - Database Lazy Loading
**Problem:** `sqlite3.Database()` was called immediately when module loaded, trying to write to read-only filesystem.

**Solution:**
```javascript
// BEFORE: ❌ Module-level initialization
const db = new sqlite3.Database(DB_PATH);

// AFTER: ✅ Lazy initialization
let db = null;
function getDB() {
  if (!db) initDB();
  return db;
}
```

**Changes:**
- Added `/tmp` detection for Vercel environment
-  Database initialized only when first needed
- All DB functions use `getDB()` for lazy loading
- Graceful fallbacks if DB unavailable (serverless constraints)

### 2. `lib/ytdlp.js` - /tmp Support & Binary Permissions
**Problem:** 
- Directories created at module load → not writable in Vercel
- Downloaded files saved to project directory → ephemeral in serverless
- Linux binaries not executable

**Solution:**
```javascript
// /tmp for Vercel, project dir for local
const isVercel = process.env.VERCEL || process.env.NOW_REGION;
const DOWNLOAD_DIR = isVercel ? '/tmp/downloads' : path.join(__dirname, '..', 'downloads');

// Make binaries executable on Linux
if (process.platform !== 'win32') {
  fs.chmodSync(YTDLP_PATH, 0o755);
  fs.chmodSync(FFMPEG_PATH, 0o755);
}

// Lazy directory creation
function ensureDirs() {
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }
}
```

**Changes:**
- Auto-detect Vercel environment
- Use `/tmp` for downloads in serverless
- `chmod 755` for Linux binaries at module load
- Lazy directory creation via `ensureDirs()`

## Environment Detection

```javascript
const isVercel = process.env.VERCEL || process.env.NOW_REGION;
```

This detects if running in Vercel and switches paths accordingly:
- **Vercel:** `/tmp/downloads`, `/tmp/yt_cache`, `/tmp/database`
- **Local:** `./downloads`, `./yt_cache`, `./database`

## Testing

### Local Testing
```bash
vercel dev
```

### Production Deploy
```bash
vercel --prod
```

### Expected Behavior
- ✅ Database initializes on first request (lazy)
- Files saved to `/tmp` in Vercel
- ✅ Linux binaries are executable
- ✅ No module-level filesystem operations

## Important Notes

⚠️ **Ephemeral Storage**: Files in `/tmp` are lost after function execution. For persistent storage, consider:
- Vercel Blob Storage
- Stream files directly to client
- External storage (S3, Cloudflare R2)

⚠️ **Database Persistence**: SQLite in `/tmp` resets between deployments. For production:
- Migrate to Vercel Postgres
- Use Planetscale or Supabase
- Accept ephemeral data (current approach)

## Deployment Checklist

- [x] Fixed module-level initialization
- [x] Added /tmp support for Vercel
- [x] Made Linux binaries executable
- [x] Lazy directory creation
- [x] Environment detection
- [ ] Test in Vercel production
- [ ] Monitor function logs
- [ ] Check file downloads work
- [ ] Verify database persistence strategy

## Next Steps

1. Deploy to Vercel: `vercel --prod`
2. Test endpoints in production
3. Monitor function logs for errors
4. Consider migrating database to Vercel Postgres if needed
