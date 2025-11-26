/**
 * API Endpoint: /api/history
 * Get download history for current user
 */

const { getUserFromRequest } = require('../lib/session');
const { getDownloadHistory } = require('../lib/db');

module.exports = async (req, res) => {
    // Only allow GET
    if (req.method !== 'GET') {
        return res.status(405).json([]);
    }

    try {
        const user = getUserFromRequest(req);

        if (!user || !user.id) {
            return res.json([]);
        }

        const history = await getDownloadHistory(user.id);
        res.json(history);
    } catch (error) {
        console.error('History error:', error);
        res.json([]);
    }
};
