/**
 * API Endpoint: /api/user
 * Get current logged-in user
 */

const { getUserFromRequest } = require('../lib/session');

module.exports = async (req, res) => {
    // Only allow GET
    if (req.method !== 'GET') {
        return res.status(405).json({ user: null });
    }

    try {
        const user = getUserFromRequest(req);

        if (!user) {
            return res.json({ user: null });
        }

        res.json({ user: user.username });
    } catch (error) {
        console.error('Get user error:', error);
        res.json({ user: null });
    }
};
