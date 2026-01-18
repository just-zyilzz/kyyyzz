export default {
  async fetch(request) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    // Validasi parameter URL
    if (!targetUrl) {
      return new Response('Missing ?url= parameter', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // Validasi format URL
    let parsedUrl;
    try {
      parsedUrl = new URL(targetUrl);
    } catch (e) {
      return new Response('Invalid URL format', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // Whitelist protokol yang diizinkan
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return new Response('Only HTTP/HTTPS protocols are allowed', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    try {
      // Setup headers untuk request
      const headers = new Headers();
      
      // Salin header penting dari request asli
      for (const [key, value] of request.headers.entries()) {
        // Skip headers yang tidak boleh diteruskan
        if (!['host', 'cf-connecting-ip', 'x-forwarded-for', 'x-real-ip'].includes(key.toLowerCase())) {
          headers.set(key, value);
        }
      }

      // Set User-Agent jika tidak ada
      if (!headers.has('User-Agent')) {
        headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      }

      // Buat request baru
      const newRequest = new Request(targetUrl, {
        method: request.method,
        headers: headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
        redirect: 'follow'
      });

      // Fetch dengan timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(newRequest, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      // Setup response headers - salin semua header dari response asli
      const responseHeaders = new Headers(response.headers);
      
      // Tambahkan CORS headers
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Methods', '*');
      responseHeaders.set('Access-Control-Allow-Headers', '*');
      responseHeaders.set('Access-Control-Expose-Headers', '*');

      // Return response dengan body asli (web tetap tampil)
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });

    } catch (error) {
      if (error.name === 'AbortError') {
        return new Response('Request timeout', {
          status: 504,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
      
      return new Response(`Fetch error: ${error.message}`, {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }
};
