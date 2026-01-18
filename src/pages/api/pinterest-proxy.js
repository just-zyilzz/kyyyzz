import axios from 'axios';

export const prerender = false;

export async function OPTIONS() {
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}

export async function GET({ request }) {
    const urlObj = new URL(request.url);
    const url = urlObj.searchParams.get('url');

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };

    if (!url) {
        return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }

    if (!url.includes('pinimg.com') && !url.includes('pinterest.com')) {
        return new Response(JSON.stringify({ error: 'Invalid Pinterest image URL' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }

    const fallbackUrls = [url];
    if (url.includes('/originals/')) {
        fallbackUrls.push(url.replace('/originals/', '/736x/'));
        fallbackUrls.push(url.replace('/originals/', '/564x/'));
        fallbackUrls.push(url.replace('/originals/', '/236x/'));
    } else if (url.match(/\/\d+x\//)) {
        const originalsUrl = url.replace(/\/\d+x\//, '/originals/');
        fallbackUrls.splice(1, 0, originalsUrl);
    }

    let lastError = null;

    for (const tryUrl of fallbackUrls) {
        try {
            const response = await axios.get(tryUrl, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://www.pinterest.com/',
                    'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
                },
                timeout: 8000,
                maxRedirects: 5,
                validateStatus: (status) => status === 200
            });

            if (response.data && response.data.length > 100) {
                const contentType = response.headers['content-type'] || 'image/jpeg';
                
                return new Response(response.data, {
                    status: 200,
                    headers: {
                        'Content-Type': contentType,
                        'Cache-Control': 'public, max-age=86400',
                        'Content-Length': response.data.length.toString(),
                        ...corsHeaders
                    }
                });
            }
        } catch (err) {
            lastError = err;
            console.log(`Failed to fetch ${tryUrl}: ${err.message}`);
        }
    }

    console.error('Pinterest proxy - all fallbacks failed:', lastError?.message || 'Unknown error');

    const pinterestPlaceholder = Buffer.from(`
<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="200" fill="#E60023"/>
  <text x="100" y="100" font-family="Arial" font-size="80" fill="white" text-anchor="middle" dominant-baseline="middle">📌</text>
  <text x="100" y="160" font-family="Arial" font-size="14" fill="white" text-anchor="middle">Image unavailable</text>
</svg>`.trim());

    return new Response(pinterestPlaceholder, {
        status: 200,
        headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'no-cache, no-store',
            ...corsHeaders
        }
    });
}
