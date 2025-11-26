/**
 * API Endpoint: /api/auth/logout
 * User logout
 */

const { deleteCookieHeader } = require('../../lib/session');

module.exports = async (req, res) => {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // Delete token cookie
    res.setHeader('Set-Cookie', deleteCookieHeader('token'));

    res.json({ success: true });
};
