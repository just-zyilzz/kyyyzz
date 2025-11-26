/**
 * API Endpoint: /api/auth/login
 * User login
 */

const { authenticateUser } = require('../../lib/db');
const { generateToken, createCookieHeader } = require('../../lib/session');

module.exports = async (req, res) => {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { username, password } = req.body;

    if (!username || !password) {
        return res.json({ success: false, error: 'Username dan password wajib diisi' });
    }

    try {
        // Authenticate user
        const user = await authenticateUser(username, password);

        if (!user) {
            return res.json({ success: false, error: 'Username atau password salah' });
        }

        // Generate JWT token
        const token = generateToken(user);

        // Set cookie
        res.setHeader('Set-Cookie', createCookieHeader('token', token));

        res.json({ success: true, token });
    } catch (error) {
        console.error('Login error:', error);
        res.json({ success: false, error: 'Login gagal' });
    }
};
