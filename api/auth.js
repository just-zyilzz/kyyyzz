const axios = require('axios');
const { getUserByGithubId, createGithubUser } = require('../lib/db');
const { generateToken, createCookieHeader } = require('../lib/session');

module.exports = async (req, res) => {
    const action = req.query.action;

    if (action === 'login') {
        const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
        // Check if we are in dev or prod for redirect URI
        const host = req.headers.host;
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const redirect_uri = `${protocol}://${host}/api/auth?action=callback`;

        if (!GITHUB_CLIENT_ID) {
            return res.status(500).json({ error: 'GitHub Client ID not configured' });
        }

        const params = new URLSearchParams({
            client_id: GITHUB_CLIENT_ID,
            redirect_uri: redirect_uri,
            scope: 'read:user',
            allow_signup: 'true'
        });

        const url = `https://github.com/login/oauth/authorize?${params.toString()}`;
        return res.redirect(url);
    }

    if (action === 'callback') {
        const { code } = req.query;
        const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
        const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

        if (!code) {
            return res.status(400).json({ error: 'No code provided' });
        }

        try {
            const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
                client_id: GITHUB_CLIENT_ID,
                client_secret: GITHUB_CLIENT_SECRET,
                code: code
            }, {
                headers: { Accept: 'application/json' }
            });

            const accessToken = tokenResponse.data.access_token;
            if (!accessToken) {
                throw new Error('Failed to get access token');
            }

            const userResponse = await axios.get('https://api.github.com/user', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            const githubUser = userResponse.data;
            
            let user = await getUserByGithubId(githubUser.id.toString());
            if (!user) {
                user = await createGithubUser(githubUser.login, githubUser.id.toString());
            }

            const token = generateToken(user);
            const cookie = createCookieHeader('token', token);
            res.setHeader('Set-Cookie', cookie);
            return res.redirect('/');
        } catch (error) {
            console.error('GitHub auth error:', error.message);
            return res.status(500).json({ error: 'Authentication failed' });
        }
    }

    if (action === 'logout') {
        const cookie = createCookieHeader('token', '', { maxAge: 0 });
        res.setHeader('Set-Cookie', cookie);
        return res.json({ success: true });
    }

    res.status(400).json({ error: 'Invalid action' });
};
