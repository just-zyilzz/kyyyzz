// Utility functions

export function isUrl(text) {
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
      text.includes('pin.it');
  }
}

export function detectPlatform(url) {
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
  return 'Unknown';
}

export function normalizeUrl(url) {
  if (!url) return url;
  let u = String(url).trim();
  u = u.replace(/^['"`]+|['"`]+$/g, '');
  u = u.replace(/[),.;>\s]+$/g, '');
  return u;
}

// Fetch without automatic retry for faster feedback
export async function fetchWithRetry(url, options = {}, retries = 0, timeout = 25000) {
  // Simple fetch wrapper with timeout
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
    throw error;
  }
}
