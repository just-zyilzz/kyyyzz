# PROMPT: Fix YouTube Downloader Fatal Bug (Server-Side Scraping)

**Role**: Senior Backend Engineer & Reverse Engineering Specialist
**Objective**: Fix the `yt-downloader` module which consistently returns 500 Errors.
**Constraints**: 
- ❌ DO NOT use `@distube/ytdl-core` or local binary dependencies (ffmpeg) due to Vercel timeout/size limits.
- ✅ MUST use external APIs (Service-Side Scraping/Proxying).

## Context
The current implementation relies on `vidssave.com` (yt2) and `ytmp3.gg` (yt1). 
- `yt2` is returning "Not Found" or 500 errors (likely blocking server IPs).
- `yt1` logic is outdated and fails.

## Task Checklist (Super Complete Logic)

### Phase 1: Reverse Engineering (Browser Simulation)
1. **Analyze `ytmp3.gg` Network Traffic**:
   - Open `https://ytmp3.gg` in a browser.
   - Input a valid YouTube URL (`https://www.youtube.com/watch?v=dQw4w9WgXcQ`).
   - Capture the **exact** XHR/Fetch request made on button click.
   - **Extract**:
     - `Request URL` (e.g., `https://api.y2mp3.co/api/v1/convert`)
     - `Method` (POST/GET)
     - `Headers`: `User-Agent`, `Origin`, `Referer`, and importantly `Cookie` (if any).
     - `Payload`: Look for dynamic tokens or hidden fields (e.g., `k_token`, `q`, `vt`).

### Phase 2: Implementation (Node.js)
2. **Update `lib/yt1.js` (Primary Handler)**:
   - Rewrite the `ytdl` function to use `axios`.
   - Mimic the **exact** headers found in Phase 1 (User-Agent is critical).
   - Implement the payload construction exactly as the browser does.
   - **Error Handling**: If `ytmp3.gg` returns a 520 or 403, throw a specific error to trigger fallback.

3. **Update `lib/yt2.js` (Fallback Handler)**:
   - Re-verify `vidssave.com` headers.
   - Ensure the `auth` token is up-to-date (it changes periodically).
   - If unstable, move this to **Fallback** priority.

4. **Refactor `api/downloaders/download.js`**:
   - **Logic Flow**:
     ```javascript
     try {
        return await yt1.ytdl(url); // Try Primary
     } catch (err) {
        console.log("Primary failed, trying fallback...");
        return await yt2.ytdl(url); // Try Fallback
     }
     ```
   - Ensure the JSON response format matches strictly what the frontend `script.js` expects:
     - `{ success: true, downloadUrl: "...", title: "...", thumbnail: "..." }`

### Phase 3: Verification
5. **Create `test-downloader.js`**:
   - A standalone script that attempts to download a video using the updated `yt1` and `yt2` libraries.
   - Logs the full JSON response for verification.

## Execution Command
"Execute this plan immediately. Prioritize fixing `yt1` (ytmp3.gg) as it is generally more stable for server-side requests than vidssave."
