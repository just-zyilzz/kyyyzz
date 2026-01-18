import axios from 'axios';
import { getUserByGithubId, createGithubUser, updateUserProfile } from '../../lib/db';
import { generateToken, createCookieHeader } from '../../lib/session';

export const prerender = false;

export async function GET({ request, redirect }) {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'login') {
        const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;

        // Auto-detect redirect URI based on current host
        const host = request.headers.get('host');
        if (!host) {
            console.error('[GitHub OAuth] Host header not found in request');
            return new Response(JSON.stringify({ error: 'Unable to detect host' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }

        // For Vercel, x-forwarded-proto will be 'https', for localhost it's undefined (use 'http')
        const protocol = request.headers.get('x-forwarded-proto') || 'http';
        const redirect_uri = `${protocol}://${host}/api/auth?action=callback`;

        if (!GITHUB_CLIENT_ID) {
            console.error('[GitHub OAuth] GITHUB_CLIENT_ID is not configured');
            return new Response(JSON.stringify({ error: 'GitHub Client ID not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }

        console.log(`[GitHub OAuth] Host: ${host}`);
        console.log(`[GitHub OAuth] Protocol: ${protocol}`);
        console.log(`[GitHub OAuth] Redirect URI: ${redirect_uri}`);

        const params = new URLSearchParams({
            client_id: GITHUB_CLIENT_ID,
            redirect_uri: redirect_uri,
            scope: 'read:user user:email', // Only request user profile and email
            allow_signup: 'true'
        });

        const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
        return redirect(authUrl);
    }

    if (action === 'callback') {
        const code = url.searchParams.get('code');
        const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
        const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

        if (!code) {
            return new Response(JSON.stringify({ error: 'No code provided' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
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

            // Generate JWT token with user data only
            const token = generateToken(user);
            // Astro handles Set-Cookie via Response headers or context.cookies.
            // But redirect returns a Response, so we can append headers.
            const response = redirect('/');
            
            // Re-implement createCookieHeader logic inline or use the helper
            // createCookieHeader returns string like "token=...; Path=/..."
            // Astro/Response expects Set-Cookie header.
            const cookieValue = `token=${token}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax`; // 30 days
            response.headers.append('Set-Cookie', cookieValue);
            
            return response;
        } catch (error) {
            console.error('GitHub auth error:', error.message);
            return new Response(JSON.stringify({ error: 'Authentication failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
    }

    if (action === 'logout') {
        const response = new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
        const cookieValue = `token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
        response.headers.append('Set-Cookie', cookieValue);
        return response;
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
}
