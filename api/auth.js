const axios = require('axios');
const { getUserByGithubId, createGithubUser, updateUserProfile } = require('../lib/db');
const { generateToken, createCookieHeader } = require('../lib/session');

module.exports = async (req, res) => {
    const action = req.query.action;

    if (action === 'login') {
        const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;

        // Auto-detect redirect URI based on current host
        const host = req.headers.host;
        if (!host) {
            console.error('[GitHub OAuth] Host header not found in request');
            return res.status(500).json({ error: 'Unable to detect host' });
        }

        // For Vercel, x-forwarded-proto will be 'https', for localhost it's undefined (use 'http')
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const redirect_uri = `${protocol}://${host}/api/auth?action=callback`;

        if (!GITHUB_CLIENT_ID) {
            console.error('[GitHub OAuth] GITHUB_CLIENT_ID is not configured');
            return res.status(500).json({ error: 'GitHub Client ID not configured' });
        }

        console.log(`[GitHub OAuth] Host: ${host}`);
        console.log(`[GitHub OAuth] Protocol: ${protocol}`);
        console.log(`[GitHub OAuth] Redirect URI: ${redirect_uri}`);

        const params = new URLSearchParams({
            client_id: GITHUB_CLIENT_ID,
            redirect_uri: redirect_uri,
            scope: 'read:user user:email gist', // Request email access and gist permissions
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

            // Get user profile from GitHub
            const userResponse = await axios.get('https://api.github.com/user', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            const githubUser = userResponse.data;

            // Extract user data
            const username = githubUser.login;
            const githubId = githubUser.id.toString();
            const email = githubUser.email || null; // Some users hide their email
            const avatarUrl = githubUser.avatar_url || null;

            // Check if user exists
            let user = await getUserByGithubId(githubId);

            if (!user) {
                // Create new user with email and avatar
                user = await createGithubUser(username, githubId, email, avatarUrl);
            } else {
                // Update existing user's email and avatar if changed
                if (email || avatarUrl) {
                    await updateUserProfile(user.id, {
                        email: email,
                        avatar_url: avatarUrl
                    });
                    // Refresh user object with updated data
                    user = await getUserByGithubId(githubId);
                }
            }

            // Generate JWT token with full user data and GitHub access token
            const token = generateToken(user, accessToken);
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
