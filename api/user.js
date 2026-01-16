const { getUserFromRequest } = require('../lib/session');
const { getHistoryFromGist, clearGistHistory } = require('../lib/gist-storage');

module.exports = async (req, res) => {
    const action = req.query.action || 'me';
    const user = getUserFromRequest(req);

    if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (action === 'history') {
        try {
            // Check if user has access token (required for Gist storage)
            if (!user.accessToken || !user.username) {
                return res.json({ success: true, history: [] });
            }

            const history = await getHistoryFromGist(user.accessToken, user.username);
            return res.json({ success: true, history });
        } catch (error) {
            console.error('History error:', error);
            return res.status(500).json({ success: false, error: 'Failed to fetch history' });
        }
    }

    if (action === 'clear-history') {
        try {
            // Check if user has access token
            if (!user.accessToken || !user.username) {
                return res.json({ success: false, error: 'GitHub authentication required' });
            }

            await clearGistHistory(user.accessToken, user.username);
            return res.json({ success: true, message: 'History cleared' });
        } catch (error) {
            console.error('Clear history error:', error);
            return res.status(500).json({ success: false, error: 'Failed to clear history' });
        }
    }

    if (action === 'me') {
        // Return full user profile from JWT token
        return res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email || null,
                avatar: user.avatar || null
            }
        });
    }

    res.status(400).json({ success: false, error: 'Invalid action' });
};
