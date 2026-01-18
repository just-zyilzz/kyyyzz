const { getUserFromRequest } = require('../lib/session');

module.exports = async (req, res) => {
    const action = req.query.action || 'me';
    const user = getUserFromRequest(req);

    if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (action === 'me') {
        // Return user profile from JWT token
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
