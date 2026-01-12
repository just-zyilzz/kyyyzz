const { getUserFromRequest } = require('../lib/session');
const { getDownloadHistory } = require('../lib/db');

module.exports = async (req, res) => {
    const action = req.query.action || 'me';
    const user = getUserFromRequest(req);
    
    if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (action === 'history') {
        try {
            const history = await getDownloadHistory(user.id);
            return res.json({ success: true, history });
        } catch (error) {
            console.error('History error:', error);
            return res.status(500).json({ success: false, error: 'Failed to fetch history' });
        }
    }

    if (action === 'me') {
        return res.json({ success: true, user: { id: user.id, username: user.username } });
    }

    res.status(400).json({ success: false, error: 'Invalid action' });
};
