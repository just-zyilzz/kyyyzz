/**
 * Cloudflare Turnstile Configuration API
 * Provides site key for frontend verification
 */

module.exports = async (req, res) => {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const siteKey = process.env.CLOUDFLARE_SITE_KEY || '0x4AAAAAACUe892h4bD0c8xx';
        
        if (!siteKey || siteKey === '0x4AAAAAACUe892h4bD0c8xx') {
            return res.status(500).json({ 
                success: false, 
                error: 'Cloudflare site key not configured' 
            });
        }

        res.setHeader('Content-Type', 'application/json');
        res.status(200).json({
            success: true,
            siteKey: siteKey
        });
    } catch (error) {
        console.error('Turnstile config error:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
};